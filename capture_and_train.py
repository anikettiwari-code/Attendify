"""
Attendify — Face Capture & Model Training  v2
===============================================
FIXED: Consistent 100x100 grayscale pipeline throughout
       capture → train → verify → CCTV.

Usage:
  python capture_and_train.py

Controls during capture:
  A         →  Toggle auto/manual
  SPACE     →  Capture (manual mode)
  Q / ESC   →  Done
"""

import cv2
import pickle
import numpy as np
import time
import sys
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT          = Path(__file__).resolve().parent
MODEL_CACHE   = ROOT / "model-training" / "model-cache" / "_model_cache"
TRAINING_DATA = ROOT / "model-training" / "training-data"
MODEL_CACHE.mkdir(parents=True, exist_ok=True)

MODEL_PATH    = MODEL_CACHE / "lbph_model.yml"
LABELS_PATH   = MODEL_CACHE / "labels.pkl"

TARGET_IMAGES = 50
AUTO_DELAY    = 0.3   # seconds between auto-captures

# Colours (BGR)
GREEN  = (0, 200, 80)
ORANGE = (0, 165, 255)
RED    = (0, 0, 220)
WHITE  = (255, 255, 255)
BLACK  = (20, 20, 20)
TEAL   = (200, 200, 0)

# ── LBPH config — MUST match everywhere ────────────────────────────────────────
LBPH_RADIUS    = 1
LBPH_NEIGHBORS = 8
LBPH_GRID_X    = 8
LBPH_GRID_Y    = 8
FACE_SIZE      = (100, 100)
MAX_DIST       = 120  # LBPH max acceptable distance


def make_recognizer():
    """Create a fresh LBPH recognizer with standard parameters."""
    return cv2.face.LBPHFaceRecognizer_create(
        radius=LBPH_RADIUS,
        neighbors=LBPH_NEIGHBORS,
        grid_x=LBPH_GRID_X,
        grid_y=LBPH_GRID_Y,
        threshold=200.0  # high threshold — we check distance ourselves
    )


def preprocess(gray_roi: np.ndarray) -> np.ndarray:
    """
    Standard face preprocessing pipeline.
    Input:  any-size grayscale ROI
    Output: 100x100 equalized face
    This MUST be used identically in capture, train, AND verify.
    """
    face = cv2.resize(gray_roi, FACE_SIZE)
    # CLAHE for contrast normalization (handles backlit rooms)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    face = clahe.apply(face)
    return face


def detect_faces(gray: np.ndarray, cascade, alt_cascade):
    """Detect faces with preprocessing for low-light."""
    # Enhance for detection
    enhanced = cv2.equalizeHist(gray)
    rects = cascade.detectMultiScale(enhanced, 1.1, 5, minSize=(60, 60))
    if len(rects) == 0:
        rects = alt_cascade.detectMultiScale(enhanced, 1.1, 4, minSize=(50, 50))
    return rects


# ══════════════════════════════════════════════════════════════════════════════
#  CAPTURE
# ══════════════════════════════════════════════════════════════════════════════

def folder_for(name: str) -> Path:
    safe = name.lower().strip().replace(" ", "_")
    safe = "".join(c for c in safe if c.isalnum() or c == "_")
    folder = TRAINING_DATA / safe
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def next_num(folder: Path) -> int:
    nums = []
    for f in folder.glob("*.jpg"):
        try:
            nums.append(int(f.stem))
        except ValueError:
            pass
    return max(nums, default=0) + 1


def capture_faces(name: str, cam=0):
    folder = folder_for(name)
    existing = len(list(folder.glob("*.jpg")))
    print(f"\n[INFO] Folder: {folder}")
    print(f"[INFO] Existing: {existing} images")
    print(f"[INFO] Will capture {TARGET_IMAGES} new images.")
    print(f"  AUTO mode — just look at camera. Press Q when done.\n")

    cascade     = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    alt_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml")

    cap = cv2.VideoCapture(cam)
    if not cap.isOpened():
        print("[ERROR] Cannot open camera")
        return False

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    img_num   = next_num(folder)
    captured  = 0
    auto_mode = True
    last_auto = time.time()
    flash_t   = 0.0

    while captured < TARGET_IMAGES:
        ret, frame = cap.read()
        if not ret:
            continue

        h, w   = frame.shape[:2]
        gray   = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        rects  = detect_faces(gray, cascade, alt_cascade)
        found  = len(rects) > 0

        key = cv2.waitKey(1) & 0xFF
        if key in (ord('q'), 27):
            break
        elif key == ord('a'):
            auto_mode = not auto_mode
        do_cap = (key == ord(' ')) or (auto_mode and found and time.time() - last_auto >= AUTO_DELAY)

        if do_cap and found:
            x, y, rw, rh = max(rects, key=lambda r: r[2]*r[3])
            pad = int(min(rw, rh) * 0.2)
            x1, y1 = max(0, x-pad), max(0, y-pad)
            x2, y2 = min(w, x+rw+pad), min(h, y+rh+pad)
            roi_color = frame[y1:y2, x1:x2]  # color crop for saving

            if roi_color.shape[0] >= 40 and roi_color.shape[1] >= 40:
                # Save as COLOR image (looks normal) — grayscale conversion at train time
                face_color = cv2.resize(roi_color, FACE_SIZE)
                cv2.imwrite(str(folder / f"{img_num}.jpg"), face_color)
                captured += 1
                img_num  += 1
                last_auto = time.time()
                flash_t   = time.time()

        # ── UI ────────────────────────────────────────────────────────────────
        if time.time() - flash_t < 0.1:
            cv2.rectangle(frame, (0,0), (w,h), WHITE, -1)

        for (x, y, rw, rh) in rects:
            cv2.rectangle(frame, (x,y), (x+rw,y+rh), GREEN, 2)

        # Top bar
        cv2.rectangle(frame, (0,0), (w, 40), BLACK, -1)
        cv2.putText(frame, f"Capture: {name.upper()}  [{captured}/{TARGET_IMAGES}]",
                    (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.7, TEAL, 2)

        # Progress
        bar_w = int(captured / TARGET_IMAGES * (w - 20))
        cv2.rectangle(frame, (10, 44), (w-10, 54), (50,50,50), -1)
        cv2.rectangle(frame, (10, 44), (10 + bar_w, 54), GREEN, -1)

        # Status
        if not found:
            cv2.putText(frame, "No face — move closer", (10, h-20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, RED, 2)
        else:
            mode_txt = "AUTO" if auto_mode else "MANUAL (SPACE)"
            cv2.putText(frame, mode_txt, (10, h-20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, GREEN, 2)

        cv2.imshow("Attendify Capture", frame)

    cap.release()
    cv2.destroyAllWindows()
    total = len(list(folder.glob("*.jpg")))
    print(f"\n✅ Captured {captured} images for '{name}' (total: {total})")
    return captured > 0


# ══════════════════════════════════════════════════════════════════════════════
#  TRAIN
# ══════════════════════════════════════════════════════════════════════════════

def train_model():
    print("\n" + "="*60)
    print("  TRAINING MODEL...")
    print("="*60)

    faces     = []
    labels    = []
    label_map = {}
    id_map    = {}
    counter   = 0

    for folder in sorted(TRAINING_DATA.iterdir()):
        if not folder.is_dir() or folder.name.startswith((".","unknown")):
            continue

        name = folder.name.replace("_", " ").title()
        if name not in label_map:
            label_map[name] = counter
            id_map[counter] = name
            counter += 1

        label = label_map[name]
        count = 0

        for img_path in sorted(folder.iterdir()):
            if img_path.suffix.lower() not in (".jpg", ".jpeg", ".png"):
                continue
            img = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
            if img is None:
                continue

            # Apply SAME preprocessing as capture and verify
            processed = preprocess(img)
            faces.append(processed)
            labels.append(label)
            count += 1

        print(f"   {'✅' if count > 0 else '⚠️'}  {name:20s}  {count} images")

    if not faces:
        print("[ERROR] No training images!")
        return False

    print(f"\n[INFO] Training on {len(faces)} images — {len(label_map)} persons...")
    t0 = time.time()

    recognizer = make_recognizer()
    recognizer.train(faces, np.array(labels))

    elapsed = time.time() - t0
    print(f"[INFO] Training done in {elapsed:.1f}s")

    recognizer.save(str(MODEL_PATH))
    with open(LABELS_PATH, "wb") as f:
        pickle.dump({"labels": id_map, "counter": counter}, f)

    model_mb = MODEL_PATH.stat().st_size / (1024*1024)
    print(f"\n✅ Model saved ({model_mb:.1f} MB)")
    print(f"   Persons: {', '.join(id_map.values())}")
    return True


# ══════════════════════════════════════════════════════════════════════════════
#  VERIFY
# ══════════════════════════════════════════════════════════════════════════════

def verify_model(cam=0):
    print("\n" + "="*60)
    print("  VERIFICATION  (Q to quit)")
    print("="*60)

    if not MODEL_PATH.exists():
        print("[ERROR] No model. Train first (option 2).")
        return

    model_mb = MODEL_PATH.stat().st_size / (1024*1024)
    print(f"[INFO] Model: {model_mb:.1f} MB")
    if model_mb > 500:
        print(f"[ERROR] Model too large ({model_mb:.0f} MB) — retrain!")
        return

    try:
        recognizer = make_recognizer()
        recognizer.read(str(MODEL_PATH))
    except Exception as e:
        print(f"[ERROR] Can't load model: {e}")
        return

    with open(LABELS_PATH, "rb") as f:
        data = pickle.load(f)
    id_map = data["labels"]
    print(f"[INFO] Persons: {', '.join(id_map.values())}")

    cascade     = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    alt_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml")

    cap = cv2.VideoCapture(cam)
    if not cap.isOpened():
        print("[ERROR] Cannot open camera")
        return
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    print("[INFO] Camera open. Look at the camera.\n")

    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        h, w  = frame.shape[:2]
        gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        rects = detect_faces(gray, cascade, alt_cascade)

        frame_count += 1

        for (x, y, rw, rh) in rects:
            pad = int(min(rw, rh) * 0.15)
            x1, y1 = max(0, x-pad), max(0, y-pad)
            x2, y2 = min(w, x+rw+pad), min(h, y+rh+pad)

            roi = preprocess(gray[y1:y2, x1:x2])

            try:
                label_id, dist = recognizer.predict(roi)
                # Confidence: 0-100 scale. Lower dist = higher confidence.
                conf = max(0.0, min(100.0, (MAX_DIST - dist) / MAX_DIST * 100.0))
                name = id_map.get(label_id, "Unknown") if dist <= MAX_DIST else "Unknown"
            except Exception:
                name, conf, dist = "Unknown", 0.0, 999.0

            # Print every 3 frames to avoid spam
            if frame_count % 3 == 0:
                symbol = "✅" if name != "Unknown" else "❌"
                print(f"  {symbol} {name:15s}  dist={dist:.1f}  conf={conf:.0f}%")

            # Colour
            if name == "Unknown":
                color = RED
            elif conf >= 20:
                color = GREEN
            else:
                color = ORANGE

            # Box
            cv2.rectangle(frame, (x, y), (x+rw, y+rh), color, 3)

            # Label
            label_txt = f"{name} {conf:.0f}% d={dist:.0f}"
            tw, th = cv2.getTextSize(label_txt, cv2.FONT_HERSHEY_SIMPLEX, 0.65, 2)[0]
            tag_y = y - 8 if y > 30 else y + rh + 22
            cv2.rectangle(frame, (x, tag_y - th - 4), (x + tw + 8, tag_y + 4), color, -1)
            cv2.putText(frame, label_txt, (x + 4, tag_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, WHITE, 2)

        # Top bar
        cv2.rectangle(frame, (0, 0), (w, 36), BLACK, -1)
        cv2.putText(frame, "VERIFY | Q: quit", (10, 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, TEAL, 2)

        cv2.imshow("Attendify Verify", frame)
        key = cv2.waitKey(1) & 0xFF
        if key in (ord('q'), 27):
            break

    cap.release()
    cv2.destroyAllWindows()


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    cam = 0
    if "--camera" in sys.argv:
        try:
            cam = int(sys.argv[sys.argv.index("--camera") + 1])
        except:
            pass

    print("\n🎓  ATTENDIFY — CAPTURE & TRAIN  v2")
    print(f"    Data: {TRAINING_DATA}")
    print(f"    Model: {MODEL_CACHE}")

    while True:
        print("\n" + "─"*50)
        print("  1 → Capture new face")
        print("  2 → Train model")
        print("  3 → Capture + Train")
        print("  4 → Verify (live test)")
        print("  5 → Clear ALL data & start fresh")
        print("  Q → Quit")
        print("─"*50)
        ch = input("  Select: ").strip().lower()

        if ch == "1":
            name = input("\n👤 Student name: ").strip()
            if len(name) >= 2:
                capture_faces(name, cam)

        elif ch == "2":
            train_model()

        elif ch == "3":
            while True:
                name = input("\n👤 Student name: ").strip()
                if len(name) >= 2:
                    capture_faces(name, cam)
                more = input("  Add another? [Y/N]: ").strip().lower()
                if more != "y":
                    break
            train_model()
            if input("  Verify now? [Y/N]: ").strip().lower() == "y":
                verify_model(cam)

        elif ch == "4":
            verify_model(cam)

        elif ch == "5":
            confirm = input("  ⚠️  Delete ALL training data? Type YES: ").strip()
            if confirm == "YES":
                import shutil
                for folder in TRAINING_DATA.iterdir():
                    if folder.is_dir():
                        shutil.rmtree(folder)
                        print(f"    Deleted {folder.name}")
                for f in [MODEL_PATH, LABELS_PATH]:
                    if f.exists():
                        f.unlink()
                print("  ✅ All data cleared. Ready for fresh capture.")
            else:
                print("  Cancelled.")

        elif ch in ("q", "quit"):
            print("\n👋 Bye!\n")
            break


if __name__ == "__main__":
    main()

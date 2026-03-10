"""
Attendify — CCTV Live Face Recognition
=======================================
Uses the existing trained LBPH model from model-training/model-cache/
to do real-time face recognition from webcam / CCTV feed.

Controls:
  Q / ESC  →  Quit
  R        →  Force retrain model
  S        →  Save screenshot with detections
  SPACE    →  Pause/Resume feed

Persons loaded from training-data/:
  - abhishek
  - ash
  - aniket
  - narendra
  - Neetu
"""

import cv2
import pickle
import numpy as np
import time
import os
import sys
from pathlib import Path
from datetime import datetime

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT          = Path(__file__).resolve().parent
MODEL_CACHE   = ROOT / "model-training" / "model-cache" / "_model_cache"  # 44 MB — correct cache
TRAINING_DATA = ROOT / "model-training" / "training-data"
SCREENSHOTS   = ROOT / "cctv_screenshots"
SCREENSHOTS.mkdir(exist_ok=True)

MODEL_PATH    = MODEL_CACHE / "lbph_model.yml"
LABELS_PATH   = MODEL_CACHE / "labels.pkl"

# ── Colour palette (BGR) ───────────────────────────────────────────────────────
COLORS = {
    "known":   (0, 220, 80),    # green
    "low":     (0, 165, 255),   # orange
    "unknown": (0, 0, 220),     # red
    "ui_bg":   (20, 20, 20),
    "ui_text": (255, 255, 255),
    "teal":    (200, 200, 0),
}

# ── Confidence thresholds ─────────────────────────────────────────────────────
HIGH_CONF = 60.0    # above this → green  (confident match)
LOW_CONF  = 35.0    # above this → orange (possible match)
MAX_DIST  = 85.0    # LBPH distance ceiling


def load_model():
    """Load the cached LBPH model + labels. Returns (recognizer, labels_dict) or (None, None)."""
    if not MODEL_PATH.exists() or not LABELS_PATH.exists():
        print("[ERROR] No trained model found!")
        print(f"        Expected: {MODEL_PATH}")
        print("        Run  python model-training/scripts/train_faces.py  first.")
        return None, None

    recognizer = cv2.face.LBPHFaceRecognizer_create(
        radius=2, neighbors=16, grid_x=10, grid_y=10, threshold=120.0
    )
    recognizer.read(str(MODEL_PATH))

    with open(LABELS_PATH, "rb") as f:
        data = pickle.load(f)

    labels: dict = data.get("labels", data)   # handle both formats
    print(f"\n✅ Model loaded  —  {len(labels)} person(s) known:")
    for lbl, name in labels.items():
        # Count training images
        folder_name = name.lower().strip().replace(" ", "_")
        folder = TRAINING_DATA / folder_name
        count = len(list(folder.glob("*.jpg"))) if folder.exists() else 0
        print(f"   [{lbl}]  {name:20s}  ({count} training images)")
    print()
    return recognizer, labels


def preprocess_face(face_roi: np.ndarray) -> np.ndarray:
    """Same 5-step pipeline as the backend detector for consistent recognition."""
    face = cv2.resize(face_roi, (150, 150))
    face = cv2.fastNlMeansDenoising(face, None, h=10, templateWindowSize=7, searchWindowSize=21)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    face = clahe.apply(face)
    gamma = 1.2
    table = np.array([((i / 255.0) ** (1.0 / gamma)) * 255 for i in range(256)]).astype("uint8")
    face = cv2.LUT(face, table)
    kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
    face = cv2.filter2D(face, -1, kernel)
    face = cv2.equalizeHist(face)
    return face


def draw_overlay(frame: np.ndarray, faces_results: list, fps: float, paused: bool):
    """Draw all UI elements on the frame in-place."""
    h, w = frame.shape[:2]

    # ── Top bar ───────────────────────────────────────────────────────────────
    cv2.rectangle(frame, (0, 0), (w, 48), COLORS["ui_bg"], -1)
    title = "ATTENDIFY  —  CCTV FACE RECOGNITION"
    cv2.putText(frame, title, (12, 32), cv2.FONT_HERSHEY_DUPLEX, 0.75, (0, 200, 180), 2)

    ts = datetime.now().strftime("%d-%m-%Y  %H:%M:%S")
    cv2.putText(frame, ts, (w - 260, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.55, COLORS["ui_text"], 1)

    if paused:
        cv2.putText(frame, "⏸  PAUSED", (w // 2 - 60, 32),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 140, 255), 2)

    # ── Bottom bar ────────────────────────────────────────────────────────────
    cv2.rectangle(frame, (0, h - 36), (w, h), COLORS["ui_bg"], -1)
    fps_text = f"FPS: {fps:.1f}"
    face_count = f"Faces: {len(faces_results)}"
    help_text = "Q/ESC: Quit  |  SPACE: Pause  |  S: Screenshot  |  R: Retrain"
    cv2.putText(frame, fps_text,   (10,     h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.55, COLORS["teal"],    1)
    cv2.putText(frame, face_count, (120,    h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.55, COLORS["ui_text"], 1)
    cv2.putText(frame, help_text,  (220,    h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 160, 160),   1)

    # ── Face boxes ────────────────────────────────────────────────────────────
    for result in faces_results:
        x, y, rw, rh = result["rect"]
        name    = result["name"]
        conf    = result["confidence"]
        dist    = result["distance"]

        if name == "Unknown":
            color = COLORS["unknown"]
            label = "Unknown"
        elif conf >= HIGH_CONF:
            color = COLORS["known"]
            label = f"{name}  {conf:.0f}%"
        else:
            color = COLORS["low"]
            label = f"{name}?  {conf:.0f}%"

        # Rounded-corner effect (draw thicker outer rect + thinner inner)
        cv2.rectangle(frame, (x - 2, y - 2), (x + rw + 2, y + rh + 2), color, 3)
        cv2.rectangle(frame, (x, y), (x + rw, y + rh), (255, 255, 255), 1)

        # Name tag background
        text_sz, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.65, 2)
        tag_x2 = x + text_sz[0] + 10
        tag_y1 = y - 30 if y > 35 else y + rh + 2
        tag_y2 = tag_y1 + 28
        cv2.rectangle(frame, (x, tag_y1), (tag_x2, tag_y2), color, -1)
        cv2.putText(frame, label, (x + 5, tag_y2 - 7),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

        # Sub-label: distance
        cv2.putText(frame, f"dist:{dist:.1f}", (x + 4, y + rh - 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)


def run_cctv(camera_index: int = 0):
    """Main CCTV recognition loop."""
    print("=" * 60)
    print("  ATTENDIFY  —  CCTV LIVE FACE RECOGNITION")
    print("=" * 60)

    # Load model
    recognizer, labels = load_model()
    if recognizer is None:
        sys.exit(1)

    # Haar cascades
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    alt_cascade  = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml")

    # Open camera
    print(f"[INFO] Opening camera index {camera_index} ...")
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        print(f"[ERROR] Could not open camera {camera_index}. Try --camera 1 or 2.")
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, 30)

    print("[INFO] Camera opened. Press Q or ESC to quit.\n")

    # ── State ─────────────────────────────────────────────────────────────────
    paused         = False
    last_faces     = []
    fps_counter    = 0
    fps_start      = time.time()
    fps            = 0.0
    detection_skip = 2   # run detection every N frames (performance)
    frame_count    = 0
    screenshot_idx = 0

    # Detection scale (downsample for speed)
    SCALE = 0.6

    while True:
        if not paused:
            ret, frame = cap.read()
            if not ret:
                print("[WARN] Frame grab failed, retrying...")
                time.sleep(0.1)
                continue

        key = cv2.waitKey(1) & 0xFF

        # ── Key handling ──────────────────────────────────────────────────────
        if key in (ord('q'), 27):         # Q or ESC
            break
        elif key == ord(' '):             # SPACE — pause
            paused = not paused
            print(f"[INFO] {'Paused' if paused else 'Resumed'}")
        elif key == ord('s'):             # S — screenshot
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            path = SCREENSHOTS / f"cctv_{ts}.jpg"
            cv2.imwrite(str(path), frame)
            print(f"[INFO] Screenshot saved: {path}")
        elif key == ord('r'):             # R — retrain
            print("[INFO] Force-retraining model ...")
            recognizer, labels = load_model()
            print("[INFO] Model reloaded.")

        if paused:
            draw_overlay(frame, last_faces, fps, paused)
            cv2.imshow("Attendify CCTV", frame)
            continue

        frame_count  += 1
        fps_counter  += 1

        # ── FPS calculation ───────────────────────────────────────────────────
        elapsed = time.time() - fps_start
        if elapsed >= 1.0:
            fps       = fps_counter / elapsed
            fps_counter = 0
            fps_start   = time.time()

        # ── Face detection (every Nth frame) ─────────────────────────────────
        if frame_count % detection_skip == 0:
            small = cv2.resize(frame, None, fx=SCALE, fy=SCALE)
            gray  = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

            # Enhance for low-light
            gray = cv2.fastNlMeansDenoising(gray, None, h=10)
            clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8))
            gray  = clahe.apply(gray)
            gray  = cv2.equalizeHist(gray)

            rects = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
            if len(rects) == 0:
                rects = alt_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))

            # Scale back to full size
            scaled_rects = [
                (int(x / SCALE), int(y / SCALE), int(w / SCALE), int(h / SCALE))
                for (x, y, w, h) in rects
            ]

            # ── Recognition ───────────────────────────────────────────────────
            gray_full = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            new_faces = []

            for (x, y, w, h) in scaled_rects:
                pad = int(min(w, h) * 0.1)
                x1 = max(0, x - pad)
                y1 = max(0, y - pad)
                x2 = min(gray_full.shape[1], x + w + 2 * pad)
                y2 = min(gray_full.shape[0], y + h + 2 * pad)

                roi = gray_full[y1:y2, x1:x2]
                if roi.size == 0:
                    continue

                proc = preprocess_face(roi)
                try:
                    label_id, dist = recognizer.predict(proc)
                    conf = max(0.0, min(100.0, 100.0 - dist * 0.85))
                    name = labels.get(label_id, "Unknown") if dist <= MAX_DIST else "Unknown"
                except Exception:
                    name, conf, dist = "Unknown", 0.0, 999.0

                new_faces.append({
                    "name":       name,
                    "confidence": round(conf, 2),
                    "distance":   round(dist, 2),
                    "rect":       (x, y, w, h),
                })

                # Console output (only when something changes)
            if new_faces != last_faces:
                for f in new_faces:
                    status = "✅" if f["name"] != "Unknown" and f["confidence"] >= HIGH_CONF else \
                             "⚠️ " if f["name"] != "Unknown" else "❓"
                    print(f"  {status}  {f['name']:20s}  conf={f['confidence']:5.1f}%  dist={f['distance']:5.1f}")

            last_faces = new_faces

        # ── Draw & show ───────────────────────────────────────────────────────
        draw_overlay(frame, last_faces, fps, paused)
        cv2.imshow("Attendify CCTV", frame)

    cap.release()
    cv2.destroyAllWindows()
    print("\n[INFO] CCTV session ended.")


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    cam = 0
    if "--camera" in sys.argv:
        idx = sys.argv.index("--camera")
        try:
            cam = int(sys.argv[idx + 1])
        except (IndexError, ValueError):
            pass

    run_cctv(camera_index=cam)

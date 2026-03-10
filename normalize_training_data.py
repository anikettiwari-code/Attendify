"""
Normalize ALL training images to consistent 100x100 grayscale.
Run ONCE before retraining to fix the mixed-format problem.
"""
import cv2
import numpy as np
from pathlib import Path

TRAINING_DATA = Path(__file__).resolve().parent / "model-training" / "training-data"
face_cascade  = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
alt_cascade   = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml")

total_ok   = 0
total_skip = 0

for folder in sorted(TRAINING_DATA.iterdir()):
    if not folder.is_dir() or folder.name.startswith("."):
        continue
    imgs = list(folder.glob("*.jpg")) + list(folder.glob("*.jpeg")) + list(folder.glob("*.png"))
    ok = skip = 0
    for img_path in imgs:
        img = cv2.imread(str(img_path))
        if img is None:
            skip += 1
            continue
        h, w = img.shape[:2]

        # Already 100x100 grayscale (new format) — skip
        if h == 100 and w == 100 and len(img.shape) == 2:
            ok += 1
            continue

        # Convert to grayscale if color
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img

        # Try to detect face and crop it
        rects = face_cascade.detectMultiScale(gray, 1.1, 3, minSize=(20, 20))
        if len(rects) == 0:
            rects = alt_cascade.detectMultiScale(gray, 1.1, 3, minSize=(20, 20))

        if len(rects) > 0:
            x, y, rw, rh = max(rects, key=lambda r: r[2] * r[3])
            pad  = int(min(rw, rh) * 0.15)
            x1   = max(0, x - pad);   y1 = max(0, y - pad)
            x2   = min(w, x + rw + pad); y2 = min(h, y + rh + pad)
            roi  = gray[y1:y2, x1:x2]
        else:
            roi = gray   # no face detected — use whole image

        if roi.shape[0] < 30 or roi.shape[1] < 30:
            skip += 1
            continue

        # Resize to 100x100
        face_small = cv2.resize(roi, (100, 100))
        cv2.imwrite(str(img_path), face_small, [cv2.IMWRITE_JPEG_QUALITY, 92])
        ok += 1

    print(f"  ✅  {folder.name:20s}  {ok} normalized  {skip} skipped")
    total_ok   += ok
    total_skip += skip

print(f"\n✅ Done — {total_ok} images normalized, {total_skip} skipped.")

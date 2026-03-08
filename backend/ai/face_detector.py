"""
Attendify AI Face Detector — Adapted for Backend Integration
============================================================
Uses YOLO + Haar Cascades for detection and LBPH for recognition.
Paths point to the model-training/ directory for training data, cache, and weights.

This module is imported by backend/main.py to provide real AI-powered face recognition.
"""

import os
import cv2
import hashlib
import numpy as np
import time
import base64
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import pickle

logger = logging.getLogger("attendify.ai")

# Try to import YOLO
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    logger.warning("ultralytics not installed — using Haar Cascade only")

# ── Paths — point to the model-training/ directory ────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent          # d:\attendify
MODEL_TRAINING_DIR = PROJECT_ROOT / "model-training"

DATA_FACE_DIR = MODEL_TRAINING_DIR / "training-data"
MODEL_CACHE_DIR = MODEL_TRAINING_DIR / "model-cache"
PRETRAINED_DIR = MODEL_TRAINING_DIR / "pretrained"
YOLO_WEIGHTS = PRETRAINED_DIR / "yolov8n.pt"

MODEL_VERSION = 2


def get_folder_hash(folder: Path) -> str:
    """Get hash of a folder's contents for incremental training."""
    files = sorted(folder.glob("*.jpg"))
    content = ",".join(f"{f.name}:{f.stat().st_mtime}" for f in files)
    return hashlib.md5(content.encode()).hexdigest()


class FaceDetector:
    """
    Face detection + LBPH recognition engine.

    Adapted for server use (no OpenCV GUI windows).
    All paths point to model-training/ so training data is shared.
    """

    def __init__(
        self,
        max_distance: float = 80.0,
        detection_scale: float = 0.6,
        min_confidence: float = 40.0,
    ):
        self.max_distance = max_distance
        self.detection_scale = detection_scale
        self.min_confidence = min_confidence
        self.known_face_labels: Dict[int, str] = {}
        self.label_counter = 0
        self.folder_hashes: Dict[str, str] = {}

        # ── Haar Cascades ─────────────────────────────────────────────────────
        logger.info("Loading Haar cascades...")
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        self.alt_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml"
        )

        # ── YOLO ──────────────────────────────────────────────────────────────
        self.yolo_model = None
        if YOLO_AVAILABLE:
            logger.info("Loading YOLO from %s", YOLO_WEIGHTS)
            try:
                weight = str(YOLO_WEIGHTS) if YOLO_WEIGHTS.exists() else "yolov8n.pt"
                self.yolo_model = YOLO(weight)
                logger.info("YOLO loaded")
            except Exception as e:
                logger.warning("YOLO load failed: %s", e)

        # ── LBPH Recognizer ───────────────────────────────────────────────────
        self.recognizer = cv2.face.LBPHFaceRecognizer_create(
            radius=2, neighbors=16, grid_x=10, grid_y=10, threshold=120.0
        )
        self.is_trained = False

        # Ensure directories exist
        DATA_FACE_DIR.mkdir(parents=True, exist_ok=True)
        MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

        # Load cached model or retrain
        self.load_model()

    # ── Preprocessing ─────────────────────────────────────────────────────────

    def preprocess_face(self, face_roi: np.ndarray) -> np.ndarray:
        """5-step preprocessing for robust recognition in all lighting conditions."""
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

    # ── Model Loading / Caching ───────────────────────────────────────────────

    def load_model(self) -> bool:
        model_path = MODEL_CACHE_DIR / "lbph_model.yml"
        labels_path = MODEL_CACHE_DIR / "labels.pkl"
        hashes_path = MODEL_CACHE_DIR / "folder_hashes.pkl"

        if hashes_path.exists():
            with open(hashes_path, "rb") as f:
                cached = pickle.load(f)
                if isinstance(cached, dict) and "hashes" in cached:
                    if cached.get("version") == MODEL_VERSION:
                        self.folder_hashes = cached.get("hashes", {})
                    else:
                        self.folder_hashes = {}
                elif isinstance(cached, dict):
                    self.folder_hashes = cached

        current_folders: Dict[str, str] = {}
        changed: List[str] = []

        for folder in DATA_FACE_DIR.iterdir():
            if not folder.is_dir() or folder.name.startswith("unknown"):
                continue
            h = get_folder_hash(folder)
            current_folders[folder.name] = h
            if folder.name not in self.folder_hashes or self.folder_hashes[folder.name] != h:
                changed.append(folder.name)

        deleted = set(self.folder_hashes.keys()) - set(current_folders.keys())
        if deleted:
            changed.extend(deleted)

        if not changed and model_path.exists() and labels_path.exists():
            logger.info("No changes detected — loading cached model...")
            try:
                self.recognizer.read(str(model_path))
                with open(labels_path, "rb") as f:
                    d = pickle.load(f)
                self.known_face_labels = d["labels"]
                self.label_counter = d["counter"]
                self.is_trained = True
                logger.info("Loaded model with %d persons", len(self.known_face_labels))
                return True
            except Exception:
                pass

        if changed:
            logger.info("%d folder(s) changed — retraining...", len(changed))
        return self._train_all(current_folders)

    def _train_all(self, hashes: Dict[str, str]) -> bool:
        self.known_face_labels = {}
        self.label_counter = 0
        faces: List[np.ndarray] = []
        labels: List[int] = []
        name_to_label: Dict[str, int] = {}

        for folder in DATA_FACE_DIR.iterdir():
            if not folder.is_dir() or folder.name.startswith("unknown"):
                continue

            name = folder.name.replace("_", " ").title()
            if name not in name_to_label:
                name_to_label[name] = self.label_counter
                self.known_face_labels[self.label_counter] = name
                self.label_counter += 1

            label = name_to_label[name]
            count = 0

            for img_path in folder.iterdir():
                if img_path.suffix.lower() not in [".jpg", ".jpeg", ".png"]:
                    continue
                try:
                    img = cv2.imread(str(img_path), cv2.IMREAD_GRAYSCALE)
                    if img is None:
                        continue
                    rects = self.face_cascade.detectMultiScale(img, 1.1, 3, minSize=(20, 20))
                    if len(rects) > 0:
                        x, y, w, h = max(rects, key=lambda r: r[2] * r[3])
                        roi = img[y : y + h, x : x + w]
                    else:
                        roi = img
                    faces.append(self.preprocess_face(roi))
                    labels.append(label)
                    count += 1
                except Exception:
                    pass

            if count > 0:
                logger.info("  %s: %d images", folder.name, count)

        if faces:
            self.recognizer.train(faces, np.array(labels))
            self.is_trained = True
            logger.info("Trained on %d faces across %d persons", len(faces), len(name_to_label))
            self._save_cache(hashes)
            return True
        return False

    def _save_cache(self, hashes: Dict[str, str]):
        try:
            self.recognizer.save(str(MODEL_CACHE_DIR / "lbph_model.yml"))
            with open(MODEL_CACHE_DIR / "labels.pkl", "wb") as f:
                pickle.dump({"labels": self.known_face_labels, "counter": self.label_counter}, f)
            with open(MODEL_CACHE_DIR / "folder_hashes.pkl", "wb") as f:
                pickle.dump({"version": MODEL_VERSION, "hashes": hashes}, f)
            self.folder_hashes = hashes
            logger.info("Model cache saved")
        except Exception as e:
            logger.error("Failed to save cache: %s", e)

    def force_retrain(self) -> bool:
        """Force a full retrain of the model."""
        hashes: Dict[str, str] = {}
        for folder in DATA_FACE_DIR.iterdir():
            if folder.is_dir() and not folder.name.startswith("unknown"):
                hashes[folder.name] = get_folder_hash(folder)
        return self._train_all(hashes)

    # ── Detection ─────────────────────────────────────────────────────────────

    def detect_faces(self, frame: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect faces using YOLO + Haar Cascades with low-light preprocessing."""
        scale = self.detection_scale
        small = cv2.resize(frame, None, fx=scale, fy=scale)
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

        # Low-light preprocessing
        gray = cv2.fastNlMeansDenoising(gray, None, h=10)
        clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        gray = cv2.equalizeHist(gray)

        all_faces: List[Tuple[int, int, int, int]] = []

        # YOLO person detection → Haar face crop
        if self.yolo_model:
            results = self.yolo_model(small, verbose=False, classes=[0], conf=0.5)
            for r in results:
                for box in r.boxes:
                    px1, py1, px2, py2 = map(int, box.xyxy[0])
                    px1, py1 = max(0, px1), max(0, py1)
                    px2 = min(small.shape[1], px2)
                    py2 = min(small.shape[0], py2)
                    if px2 <= px1 or py2 <= py1:
                        continue
                    person = gray[py1:py2, px1:px2]
                    faces = self.face_cascade.detectMultiScale(person, 1.1, 4, minSize=(20, 20))
                    if len(faces) == 0:
                        faces = self.alt_cascade.detectMultiScale(person, 1.1, 4, minSize=(20, 20))
                    for fx, fy, fw, fh in faces:
                        all_faces.append((
                            int((px1 + fx) / scale),
                            int((py1 + fy) / scale),
                            int(fw / scale),
                            int(fh / scale),
                        ))

        # Fallback: pure Haar cascade
        if not all_faces:
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
            alt = self.alt_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
            for x, y, w, h in list(faces) + list(alt):
                all_faces.append((int(x / scale), int(y / scale), int(w / scale), int(h / scale)))

        return all_faces

    # ── Recognition ───────────────────────────────────────────────────────────

    def recognize_face(self, frame: np.ndarray, rect: Tuple[int, int, int, int]) -> Tuple[str, float, float]:
        """Recognize a detected face. Returns (name, confidence%, distance)."""
        if not self.is_trained:
            return "Unknown", 0.0, 999.0

        x, y, w, h = rect
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        pad = int(min(w, h) * 0.1)
        x1, y1 = max(0, x - pad), max(0, y - pad)
        x2 = min(gray.shape[1], x + w + 2 * pad)
        y2 = min(gray.shape[0], y + h + 2 * pad)

        if x2 <= x1 or y2 <= y1:
            return "Unknown", 0.0, 999.0

        roi = self.preprocess_face(gray[y1:y2, x1:x2])

        try:
            label, dist = self.recognizer.predict(roi)
            # Confidence: Improved formula for better calibration (ported from mobile logic)
            # dist < 40 -> high confidence, dist > 85 -> low confidence
            conf = max(0, min(100, 100 - dist * 0.85))
            name = self.known_face_labels.get(label, "Unknown")

            logger.debug("LBPH predict: label=%d name=%s dist=%.1f conf=%.1f%%", label, name, dist, conf)

            if dist <= self.max_distance and conf >= self.min_confidence:
                return name, conf, dist
            elif dist <= self.max_distance:
                # Lower confidence but still within distance range
                return name, conf, dist
            else:
                # Distance too high — not a reliable match
                logger.debug("Distance %.1f exceeds max %.1f", dist, self.max_distance)
                return "Unknown", conf, dist
        except Exception as e:
            logger.warning("Recognition failed: %s", e)

        return "Unknown", 0.0, 999.0

    # ── Training Data Management ──────────────────────────────────────────────

    def get_person_folder(self, name: str) -> Path:
        """Get or create a folder for a person's training images."""
        folder_name = name.lower().strip().replace(" ", "_")
        folder_name = "".join(c for c in folder_name if c.isalnum() or c == "_")
        folder = DATA_FACE_DIR / folder_name
        folder.mkdir(parents=True, exist_ok=True)
        return folder

    def get_next_image_num(self, folder: Path) -> int:
        nums = []
        for f in folder.glob("*.jpg"):
            try:
                nums.append(int(f.stem))
            except ValueError:
                pass
        return max(nums, default=0) + 1

    def save_training_images(self, person_name: str, images_base64: List[str]) -> int:
        """
        Save base64-encoded images as training data for a person.
        Extracts faces from the images before saving.

        Returns the number of images successfully saved.
        """
        folder = self.get_person_folder(person_name)
        img_num = self.get_next_image_num(folder)
        saved = 0

        for b64 in images_base64:
            try:
                # Strip data URI prefix if present
                if "," in b64:
                    b64 = b64.split(",", 1)[1]

                img_bytes = base64.b64decode(b64)
                nparr = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                if img is None:
                    continue

                # Try to detect and crop face
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(30, 30))

                if len(faces) > 0:
                    # Save the largest face with padding
                    x, y, w, h = max(faces, key=lambda r: r[2] * r[3])
                    pad = 30
                    H, W = img.shape[:2]
                    x1, y1 = max(0, x - pad), max(0, y - pad)
                    x2, y2 = min(W, x + w + pad), min(H, y + h + pad)
                    face_img = img[y1:y2, x1:x2]
                else:
                    # Save full image (let training handle face detection)
                    face_img = img

                if face_img.shape[0] >= 50 and face_img.shape[1] >= 50:
                    cv2.imwrite(str(folder / f"{img_num}.jpg"), face_img)
                    saved += 1
                    img_num += 1

            except Exception as e:
                logger.warning("Failed to save training image: %s", e)

        logger.info("Saved %d training images for '%s'", saved, person_name)
        return saved

    def recognize_from_bytes(self, image_bytes: bytes) -> List[dict]:
        """
        Run face detection + recognition on raw image bytes.
        Returns a list of {name, confidence, distance, rect} for each detected face.
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return []

        faces = self.detect_faces(frame)
        results = []

        for rect in faces:
            name, conf, dist = self.recognize_face(frame, rect)
            results.append({
                "name": name,
                "confidence": round(conf, 2),
                "distance": round(dist, 2),
                "rect": list(rect),
            })

        return results

    def recognize_from_base64(self, b64: str) -> List[dict]:
        """Run recognition on a base64-encoded image."""
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        img_bytes = base64.b64decode(b64)
        return self.recognize_from_bytes(img_bytes)

    def get_model_stats(self) -> dict:
        """Return current model statistics."""
        persons = list(self.known_face_labels.values())
        training_folders = []
        total_images = 0
        for folder in DATA_FACE_DIR.iterdir():
            if folder.is_dir() and not folder.name.startswith("unknown"):
                count = len(list(folder.glob("*.jpg")))
                training_folders.append({"name": folder.name, "images": count})
                total_images += count

        return {
            "is_trained": self.is_trained,
            "persons": persons,
            "person_count": len(persons),
            "total_training_images": total_images,
            "training_folders": training_folders,
            "max_distance": self.max_distance,
            "min_confidence": self.min_confidence,
        }

# Model Training & AI Core

This directory contains the complete AI/ML model for the Attendify system, extracted from the `Attendify-master` codebase.

## 📂 Directory Structure

- **`models/`**: Core FaceDetector class (YOLO+LBPH) and trained weights.
- **`services/`**: Service layer bridging the model to the application (FaceService, LivenessService, Verification, Anomaly).
- **`scripts/`**: Utilities for capturing faces, training the model, and organizing data.
- **`pretrained/`**: Base YOLOv8n weights.
- **`training-data/`**: Face images organized by person.
- **`model-cache/`**: Cached trained models for fast loading.
- **`tests/`**: Validation scripts for system readiness and anomaly detection.
- **`docs/`**: Guides on how to use, train, and deploy the recognition system.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Capture Faces (New Person)
```bash
python scripts/capture_faces.py
```

### 3. Train Model
```bash
python scripts/train_faces.py
```

### 4. Run Demo Kiosk
```bash
python scripts/demo_webcam.py
```

## 🧠 Model Architecture

- **Detection**: YOLOv8 Nano + Haar Cascades
- **Recognition**: LBPH (Local Binary Patterns Histogram)
- **Liveness**: MediaPipe FaceMesh (Blink Detection)
- **Security**: Multi-frame temporal verification + Anomaly Detection

## 📝 Notes
- Keep `training-data` organized by person name.
- Training automatically updates `model-cache`.
- Use `scripts/sync_faces_to_db.py` to populate the database with students from training data.

"""
FaceService Module
------------------

This file defines the `FaceService` class, which acts as a singleton service layer
between the FastAPI backend and the face recognition model (`FaceDetector`).

Key Responsibilities:
- Initialize a single global instance of `FaceDetector` (singleton pattern).
- Provide the `verify_student(frame_bytes)` method to process raw camera frame bytes:
    * Convert image bytes into an OpenCV-compatible format.
    * Detect faces in the frame using the detector.
    * Handle cases where:
        - No face is detected → returns status "no_face".
        - Multiple faces are detected → returns status "multiple_faces" (proxy risk).
        - A single face is detected → runs recognition and returns student name,
          confidence score, and distance metric.
    * If recognition fails, returns "Unknown".
- Handle errors gracefully (e.g., corrupted image bytes, detection failures).
- Expose a global `face_service` instance for use across the backend.

This service is the core bridge that connects raw image input from the API
to the recognition logic, enabling intelligent student attendance verification.
"""





import sys
import os
from pathlib import Path
import cv2
import numpy as np
from app.models.face_model import FaceDetector

class FaceService:
    _instance = None
    _detector = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceService, cls).__new__(cls)
            print("[INFO] Initializing FaceService Singleton...")
            # Enterprise parameters: tighter thresholds, better accuracy
            cls._detector = FaceDetector(
                max_distance=50.0,      # Stricter matching
                detection_scale=0.6,
                skip_frames=1,
                min_confidence=50.0     # Lowered to handle low-light scenarios
            )
        return cls._instance

    def verify_student(self, frame_bytes: bytes) -> dict:
        """
        Verify student from camera frame bytes.
        Returns dictionary with verification results.
        """
        print(f"[DEBUG] FaceService.verify_student called with {len(frame_bytes)} bytes")
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return {"error": "Could not decode image", "status": "error"}

            # Run detection
            # Note: recognize_face returns (name, confidence, distance)
            # We need to find the face first
            face_rects = self._detector.detect_faces_fast(frame)
            
            if not face_rects:
                return {
                    "status": "no_face",
                    "files": [],
                    "message": "No face detected in frame"
                }
            
            if len(face_rects) > 1:
                return {
                    "status": "multiple_faces",
                    "face_count": len(face_rects),
                    "message": "Multiple faces detected - Proxy Risk"
                }
            
            # Single face case
            face_rect = face_rects[0]
            name, confidence, distance = self._detector.recognize_face(frame, face_rect)
            
            is_match = name != "Unknown"
            
            return {
                "status": "success",
                "match": is_match,
                "student_name": name if is_match else None,
                "confidence": confidence,
                "distance": distance,
                "face_rect": face_rect
            }

        except Exception as e:
            print(f"[ERROR] Face verification failed: {e}")
            return {"status": "error", "message": str(e)}

    def retrain_model(self) -> None:
        """Force retraining from the face data folders."""
        try:
            if self._detector:
                self._detector.force_retrain()
        except Exception as exc:
            print(f"[WARNING] Failed to retrain model: {exc}")

# Global instance
face_service = FaceService()

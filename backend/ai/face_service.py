"""
Attendify Face Service — Singleton Bridge
==========================================
Provides a global FaceService instance that wraps the FaceDetector.
Used by backend/main.py endpoints for recognition and training.
"""

import logging
from typing import List, Optional
from .face_detector import FaceDetector

logger = logging.getLogger("attendify.ai")


class FaceService:
    """
    Singleton service that initialises the FaceDetector once
    and exposes high-level methods for the API layer.
    """

    _instance: Optional["FaceService"] = None

    def __init__(self):
        logger.info("Initialising FaceService...")
        self.detector = FaceDetector()
        logger.info("FaceService ready — model trained: %s", self.detector.is_trained)

    @classmethod
    def get_instance(cls) -> "FaceService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ── Recognition ───────────────────────────────────────────────────────────

    def recognize_frame(self, image_bytes: bytes) -> List[dict]:
        """
        Run face detection + recognition on raw image bytes.

        Returns:
            List of dicts: [{name, confidence, distance, rect}, ...]
        """
        return self.detector.recognize_from_bytes(image_bytes)

    def recognize_base64(self, b64_image: str) -> List[dict]:
        """
        Run face detection + recognition on a base64 image string.

        Returns:
            List of dicts: [{name, confidence, distance, rect}, ...]
        """
        return self.detector.recognize_from_base64(b64_image)

    # ── Training ──────────────────────────────────────────────────────────────

    def train_student(self, student_name: str, images_base64: List[str]) -> dict:
        """
        Save training images for a student and retrain the model.

        Args:
            student_name: Display name of the student
            images_base64: List of base64-encoded face images

        Returns:
            Dict with training result details
        """
        saved_count = self.detector.save_training_images(student_name, images_base64)

        if saved_count == 0:
            return {
                "success": False,
                "message": "No valid face images could be extracted",
                "saved_count": 0,
            }

        # Retrain
        logger.info("Retraining model after adding %d images for '%s'...", saved_count, student_name)
        retrained = self.detector.force_retrain()

        return {
            "success": retrained,
            "message": (
                f"Saved {saved_count} images and retrained model for {student_name}"
                if retrained
                else f"Saved {saved_count} images but training failed"
            ),
            "saved_count": saved_count,
            "model_trained": self.detector.is_trained,
        }

    def retrain(self) -> dict:
        """Force a full model retrain."""
        success = self.detector.force_retrain()
        stats = self.detector.get_model_stats()
        return {
            "success": success,
            "message": "Model retrained successfully" if success else "Training failed — no valid data",
            **stats,
        }

    # ── Stats ─────────────────────────────────────────────────────────────────

    def get_stats(self) -> dict:
        return self.detector.get_model_stats()


# Global instance (lazy — initialised on first access)
_face_service: Optional[FaceService] = None


def get_face_service() -> FaceService:
    """Get the global FaceService singleton."""
    global _face_service
    if _face_service is None:
        _face_service = FaceService()
    return _face_service

"""
Attendify Liveness Detection — Blink-based Anti-Spoofing
=========================================================
Uses MediaPipe FaceMesh to compute Eye Aspect Ratio (EAR).
If MediaPipe is unavailable, falls back to simulation mode.
"""

import logging
import numpy as np
from typing import List, Optional
from dataclasses import dataclass, asdict

logger = logging.getLogger("attendify.ai")

# Try to import MediaPipe
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    logger.warning("mediapipe not installed — liveness detection in simulation mode")


# Eye landmark indices for MediaPipe FaceMesh
LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]

# EAR Thresholds
EAR_THRESHOLD = 0.21
CONSEC_FRAMES_FOR_BLINK = 2


@dataclass
class LivenessResult:
    passed: bool
    blink_count: int
    confidence: float
    method: str  # "mediapipe" or "simulation"
    message: str

    def to_dict(self):
        return asdict(self)


def _compute_ear(landmarks, eye_indices) -> float:
    """Compute Eye Aspect Ratio for a set of eye landmarks."""
    pts = [landmarks[i] for i in eye_indices]

    # Vertical distances
    v1 = np.linalg.norm(np.array(pts[1]) - np.array(pts[5]))
    v2 = np.linalg.norm(np.array(pts[2]) - np.array(pts[4]))

    # Horizontal distance
    h = np.linalg.norm(np.array(pts[0]) - np.array(pts[3]))

    if h == 0:
        return 0.0

    return (v1 + v2) / (2.0 * h)


class LivenessService:
    """Blink detection for anti-spoofing."""

    _instance: Optional["LivenessService"] = None

    def __init__(self):
        self.face_mesh = None
        if MEDIAPIPE_AVAILABLE:
            try:
                self.face_mesh = mp.solutions.face_mesh.FaceMesh(
                    static_image_mode=True,
                    max_num_faces=1,
                    refine_landmarks=True,
                    min_detection_confidence=0.5,
                )
                logger.info("MediaPipe FaceMesh loaded for liveness detection")
            except Exception as e:
                logger.warning("MediaPipe init failed: %s", e)

    @classmethod
    def get_instance(cls) -> "LivenessService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def check_blink_in_frames(self, frames_bytes: List[bytes]) -> LivenessResult:
        """
        Analyze multiple frames for blink detection.

        Args:
            frames_bytes: List of raw image bytes (at least 3 recommended)

        Returns:
            LivenessResult with blink count and pass/fail
        """
        import cv2

        if not self.face_mesh:
            # Simulation mode
            return LivenessResult(
                passed=True,
                blink_count=1,
                confidence=0.6,
                method="simulation",
                message="MediaPipe unavailable — simulated liveness pass",
            )

        if len(frames_bytes) < 3:
            return LivenessResult(
                passed=False,
                blink_count=0,
                confidence=0.0,
                method="mediapipe",
                message=f"Insufficient frames ({len(frames_bytes)}/3 minimum)",
            )

        ear_values = []
        for fb in frames_bytes:
            nparr = np.frombuffer(fb, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_mesh.process(rgb)

            if results.multi_face_landmarks:
                lm = results.multi_face_landmarks[0].landmark
                h, w = frame.shape[:2]
                landmarks = [(l.x * w, l.y * h) for l in lm]

                left_ear = _compute_ear(landmarks, LEFT_EYE)
                right_ear = _compute_ear(landmarks, RIGHT_EYE)
                avg_ear = (left_ear + right_ear) / 2.0
                ear_values.append(avg_ear)

        if not ear_values:
            return LivenessResult(
                passed=False,
                blink_count=0,
                confidence=0.0,
                method="mediapipe",
                message="No face landmarks detected in any frame",
            )

        # Count blinks (EAR dips below threshold)
        blink_count = 0
        below_count = 0
        for ear in ear_values:
            if ear < EAR_THRESHOLD:
                below_count += 1
            else:
                if below_count >= CONSEC_FRAMES_FOR_BLINK:
                    blink_count += 1
                below_count = 0

        passed = blink_count >= 1
        confidence = min(1.0, blink_count * 0.5 + 0.3) if passed else 0.2

        return LivenessResult(
            passed=passed,
            blink_count=blink_count,
            confidence=round(confidence, 2),
            method="mediapipe",
            message=(
                f"Liveness verified — {blink_count} blink(s) detected"
                if passed
                else "No blinks detected — possible spoofing"
            ),
        )


# Global instance
_liveness: Optional[LivenessService] = None


def get_liveness_service() -> LivenessService:
    global _liveness
    if _liveness is None:
        _liveness = LivenessService()
    return _liveness

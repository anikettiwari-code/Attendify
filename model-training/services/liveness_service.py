"""
Liveness Detection Service (Anti-Spoofing)
Uses Eye Aspect Ratio (EAR) for blink detection.

This is a BASIC liveness check suitable for hackathon demos.
It CANNOT defeat:
- Video playback attacks
- 3D mask attacks
- High-quality printed photos with cutout eyes

For production, consider:
- Texture analysis (moiré pattern detection)
- Depth sensing (if hardware available)
- Challenge-response (random head movements)
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional
from dataclasses import dataclass
import time

from app.core.config_thresholds import thresholds
from app.core.logging import logger

# Try to import mediapipe for landmarks (fallback to simulation if unavailable)
LANDMARKS_AVAILABLE = False
FACE_MESH = None

try:
    import mediapipe as mp

    FACE_MESH = mp.solutions.face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    LANDMARKS_AVAILABLE = True
    logger.info("MediaPipe FaceMesh loaded for liveness detection")
except Exception as e:
    logger.info(f"MediaPipe not available: {e}. Liveness detection will be simulated.")


# MediaPipe landmark indices for eyes
# Left eye: 33, 160, 158, 133, 153, 144
# Right eye: 362, 385, 387, 263, 373, 380
LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]


@dataclass
class LivenessResult:
    """Result of liveness detection"""
    passed: bool
    blink_detected: bool
    blink_count: int
    ear_values: List[float]
    frames_analyzed: int
    message: str
    
    def to_dict(self):
        return {
            "passed": self.passed,
            "blink_detected": self.blink_detected,
            "blink_count": self.blink_count,
            "frames_analyzed": self.frames_analyzed,
            "message": self.message
        }


def calculate_ear(eye_landmarks: List[Tuple[float, float]]) -> float:
    """
    Calculate Eye Aspect Ratio (EAR).
    
    EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
    
    Where p1-p6 are the 6 eye landmarks in order:
    p1: outer corner, p2: upper outer, p3: upper inner
    p4: inner corner, p5: lower inner, p6: lower outer
    
    When eye is open: EAR ~ 0.25-0.3
    When eye is closed: EAR < 0.2
    """
    if len(eye_landmarks) < 6:
        return 0.3  # Default open eye value
    
    # Vertical distances
    v1 = np.linalg.norm(np.array(eye_landmarks[1]) - np.array(eye_landmarks[5]))
    v2 = np.linalg.norm(np.array(eye_landmarks[2]) - np.array(eye_landmarks[4]))
    
    # Horizontal distance
    h = np.linalg.norm(np.array(eye_landmarks[0]) - np.array(eye_landmarks[3]))
    
    if h == 0:
        return 0.3
    
    ear = (v1 + v2) / (2.0 * h)
    return ear


def get_eye_landmarks(
    frame: np.ndarray
) -> Tuple[Optional[List[Tuple]], Optional[List[Tuple]]]:
    """
    Extract eye landmarks from frame using MediaPipe.
    Returns (left_eye, right_eye) landmark lists or (None, None) if not available.
    """
    if not LANDMARKS_AVAILABLE or FACE_MESH is None:
        return None, None
    
    # Convert BGR to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = FACE_MESH.process(rgb_frame)
    
    if not results.multi_face_landmarks:
        return None, None
    
    face_landmarks = results.multi_face_landmarks[0]
    h, w = frame.shape[:2]
    
    # Extract left eye landmarks
    left_eye = []
    for idx in LEFT_EYE_INDICES:
        lm = face_landmarks.landmark[idx]
        left_eye.append((lm.x * w, lm.y * h))
    
    # Extract right eye landmarks
    right_eye = []
    for idx in RIGHT_EYE_INDICES:
        lm = face_landmarks.landmark[idx]
        right_eye.append((lm.x * w, lm.y * h))
    
    return left_eye, right_eye


class LivenessService:
    """
    Blink-based liveness detection.
    
    How it works:
    1. Track EAR (Eye Aspect Ratio) across frames
    2. Detect when EAR drops below threshold (blink start)
    3. Detect when EAR rises above threshold (blink end)
    4. If a complete blink cycle detected, user is "live"
    
    Limitations:
    - User must naturally blink or intentionally blink
    - Videos with natural blinks will pass
    - Dark glasses/sunglasses will fail
    """
    
    def __init__(self):
        self.ear_threshold = thresholds.EAR_BLINK_THRESHOLD
        self.min_blink_frames = thresholds.MIN_BLINK_FRAMES
    
    def _analyze_frame(self, frame_bytes: bytes) -> Optional[float]:
        """Return average EAR for a frame or None if unavailable."""
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return None

        left_eye, right_eye = get_eye_landmarks(frame)

        if left_eye is None or right_eye is None:
            return None

        left_ear = calculate_ear(left_eye)
        right_ear = calculate_ear(right_eye)
        return (left_ear + right_ear) / 2.0

    def _update_blink_state(self, avg_ear: float, in_blink: bool, consecutive_closed: int) -> tuple[bool, int, int]:
        """Update blink state based on EAR value."""
        blink_count = 0
        if avg_ear < self.ear_threshold:
            consecutive_closed += 1
            if consecutive_closed >= self.min_blink_frames and not in_blink:
                in_blink = True
        else:
            if in_blink:
                blink_count = 1
                in_blink = False
            consecutive_closed = 0

        return in_blink, consecutive_closed, blink_count

    def check_liveness(self, frames: List[bytes]) -> LivenessResult:
        """
        Analyze multiple frames for blink detection.
        
        Args:
            frames: List of JPEG image bytes
            
        Returns:
            LivenessResult with pass/fail status
        """
        if not LANDMARKS_AVAILABLE:
            # Simulate liveness - always pass for demo purposes
            return LivenessResult(
                passed=True,
                blink_detected=True,
                blink_count=1,
                ear_values=[],
                frames_analyzed=len(frames),
                message="Liveness simulated (MediaPipe not available)"
            )
        
        if len(frames) < 3:
            return LivenessResult(
                passed=False,
                blink_detected=False,
                blink_count=0,
                ear_values=[],
                frames_analyzed=len(frames),
                message="Insufficient frames for liveness check (need 3+)"
            )
        
        ear_values: List[float] = []
        blink_count = 0
        in_blink = False
        consecutive_closed = 0

        for frame_bytes in frames:
            avg_ear = self._analyze_frame(frame_bytes)

            if avg_ear is None:
                ear_values.append(-1)
                continue

            ear_values.append(avg_ear)
            in_blink, consecutive_closed, just_blinked = self._update_blink_state(
                avg_ear,
                in_blink,
                consecutive_closed,
            )
            blink_count += just_blinked
        
        # Determine result
        passed = blink_count >= 1
        
        if passed:
            message = f"Liveness verified: {blink_count} blink(s) detected"
        elif len([e for e in ear_values if e > 0]) == 0:
            message = "Liveness failed: No face detected in frames"
        else:
            message = "Liveness failed: No blink detected - please blink naturally"
        
        return LivenessResult(
            passed=passed,
            blink_detected=blink_count > 0,
            blink_count=blink_count,
            ear_values=ear_values,
            frames_analyzed=len(frames),
            message=message
        )
    
    def quick_check(self, frame_bytes: bytes) -> bool:
        """
        Quick single-frame liveness heuristic.
        Less reliable than multi-frame but faster.
        
        Checks:
        - Face is detected
        - Eyes are visible (EAR in normal range)
        """
        if not LANDMARKS_AVAILABLE:
            return True  # Assume live if can't check
        
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return False
        
        left_eye, right_eye = get_eye_landmarks(frame)
        
        if left_eye is None or right_eye is None:
            return False
        
        left_ear = calculate_ear(left_eye)
        right_ear = calculate_ear(right_eye)
        avg_ear = (left_ear + right_ear) / 2.0
        
        # Normal EAR range for open eyes: 0.2 - 0.4
        # Too low = closed eyes or photo
        # Too high = unusual (might be fake)
        return 0.15 < avg_ear < 0.45


# Global singleton
liveness_service = LivenessService()

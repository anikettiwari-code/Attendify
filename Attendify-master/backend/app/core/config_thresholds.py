"""
Centralized Threshold Configuration for Attendance Verification
All thresholds are explainable and tunable for hackathon demos.

Design Philosophy:
- Probabilistic, not deterministic
- Fail-safe defaults (slightly loose to avoid false negatives)
- All values documented with rationale
"""

from dataclasses import dataclass
from typing import Dict, Any


@dataclass
class VerificationThresholds:
    """
    Tunable thresholds for face verification system.
    
    These values are calibrated for:
    - Cheap webcams (720p)
    - Variable classroom lighting
    - LBPH recognizer characteristics
    """
    
    # ========== CONFIDENCE THRESHOLDS ==========
    # LBPH distance is inversely related to confidence
    # Lower distance = better match
    
    FACE_CONFIDENCE_HIGH: float = 80.0      # % - Very confident match
    FACE_CONFIDENCE_MEDIUM: float = 65.0    # % - Acceptable match
    FACE_CONFIDENCE_LOW: float = 50.0       # % - Warn but allow
    FACE_CONFIDENCE_REJECT: float = 40.0    # % - Below this = reject
    FACE_CONFIDENCE_BIOMETRIC_REQUIRED: float = 60.0  # % - Below this = require fingerprint
    
    # LBPH distance thresholds (raw values)
    MAX_LBPH_DISTANCE: float = 80.0         # Above = Unknown (no match)
    WARN_LBPH_DISTANCE: float = 60.0        # Above = low confidence warning
    
    # ========== ANTI-PROXY THRESHOLDS ==========
    
    MULTI_FACE_IS_PROXY_RISK: bool = True   # Flag if >1 face detected
    IDENTITY_MISMATCH_STRICT: bool = True   # Claimed ID != Face ID = proxy
    
    # ========== TEMPORAL VERIFICATION ==========
    
    REQUIRED_CONSISTENT_FRAMES: int = 3     # Frames that must match
    FRAME_CAPTURE_INTERVAL_MS: int = 500    # Time between frame captures
    MAX_IDENTITY_SWITCHES: int = 1          # Allow 1 frame mismatch in sequence
    
    # ========== DUPLICATE PREVENTION ==========
    
    DUPLICATE_WINDOW_SECONDS: int = 300     # 5 minutes - same session dedup
    ALLOW_RE_VERIFICATION: bool = True      # Can re-verify but not re-mark
    
    # ========== LIVENESS DETECTION ==========
    
    LIVENESS_ENABLED: bool = True           # Master toggle
    BLINK_DETECTION_TIMEOUT_SEC: float = 5.0  # Max time to detect blink
    EAR_BLINK_THRESHOLD: float = 0.21       # Eye Aspect Ratio for blink
    MIN_BLINK_FRAMES: int = 2               # Consecutive frames below threshold
    
    def to_dict(self) -> Dict[str, Any]:
        """Export all thresholds for API response"""
        return {
            "confidence": {
                "high": self.FACE_CONFIDENCE_HIGH,
                "medium": self.FACE_CONFIDENCE_MEDIUM,
                "low": self.FACE_CONFIDENCE_LOW,
                "reject": self.FACE_CONFIDENCE_REJECT,
            },
            "lbph": {
                "max_distance": self.MAX_LBPH_DISTANCE,
                "warn_distance": self.WARN_LBPH_DISTANCE,
            },
            "temporal": {
                "required_frames": self.REQUIRED_CONSISTENT_FRAMES,
                "frame_interval_ms": self.FRAME_CAPTURE_INTERVAL_MS,
            },
            "liveness": {
                "enabled": self.LIVENESS_ENABLED,
                "timeout_sec": self.BLINK_DETECTION_TIMEOUT_SEC,
            },
            "deduplication": {
                "window_seconds": self.DUPLICATE_WINDOW_SECONDS,
            }
        }
    
    def get_confidence_label(self, confidence: float) -> str:
        """Human-readable confidence label"""
        if confidence >= self.FACE_CONFIDENCE_HIGH:
            return "HIGH"
        elif confidence >= self.FACE_CONFIDENCE_MEDIUM:
            return "MEDIUM"
        elif confidence >= self.FACE_CONFIDENCE_LOW:
            return "LOW"
        else:
            return "REJECTED"


# Global singleton instance
thresholds = VerificationThresholds()

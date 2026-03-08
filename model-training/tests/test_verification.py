"""
Unit Tests for Attendance Verification System
Tests session management, verification service, and API endpoints.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.config_thresholds import VerificationThresholds, thresholds


class TestThresholdConfiguration:
    """Test threshold configuration and utility methods"""
    
    def test_default_thresholds_are_reasonable(self):
        """Verify default thresholds are set to reasonable values"""
        t = VerificationThresholds()
        
        # Confidence thresholds should be in 0-100 range
        assert 0 < t.FACE_CONFIDENCE_REJECT < t.FACE_CONFIDENCE_LOW < t.FACE_CONFIDENCE_MEDIUM < t.FACE_CONFIDENCE_HIGH <= 100
        
        # LBPH distance should be positive
        assert t.MAX_LBPH_DISTANCE > 0
        assert t.WARN_LBPH_DISTANCE > 0
        assert t.WARN_LBPH_DISTANCE < t.MAX_LBPH_DISTANCE
        
        # Temporal verification should require at least 1 frame
        assert t.REQUIRED_CONSISTENT_FRAMES >= 1
    
    def test_confidence_labels(self):
        """Test confidence to label mapping"""
        t = VerificationThresholds()
        
        assert t.get_confidence_label(95) == "HIGH"
        assert t.get_confidence_label(70) == "MEDIUM"
        assert t.get_confidence_label(55) == "LOW"
        assert t.get_confidence_label(30) == "REJECTED"
    
    def test_to_dict_returns_complete_config(self):
        """Verify to_dict returns all expected keys"""
        config = thresholds.to_dict()
        
        assert "confidence" in config
        assert "lbph" in config
        assert "temporal" in config
        assert "liveness" in config
        assert "deduplication" in config
        
        assert "high" in config["confidence"]
        assert "required_frames" in config["temporal"]


class TestSessionModel:
    """Test session lifecycle and properties"""
    
    def test_session_status_transitions(self):
        """Test session status can transition correctly"""
        from app.models.session import AttendanceSession, SessionStatus
        
        session = AttendanceSession(name="Test Session")
        session.status = SessionStatus.PENDING.value
        
        assert session.status == "pending"
        assert not session.is_active
        
        session.start()
        assert session.status == "active"
        assert session.is_active
        assert session.started_at is not None
        
        session.end()
        assert session.status == "ended"
        assert not session.is_active
        assert session.ended_at is not None
    
    def test_duration_calculation(self):
        """Test session duration is calculated correctly"""
        from app.models.session import AttendanceSession
        from datetime import datetime, timedelta
        
        session = AttendanceSession(name="Test Session")
        session.started_at = datetime(2026, 1, 16, 9, 0, 0)
        session.ended_at = datetime(2026, 1, 16, 10, 30, 0)
        
        assert session.duration_minutes == 90


class TestVerificationResult:
    """Test verification result dataclass"""
    
    def test_result_to_dict(self):
        """Test result serialization"""
        from app.services.verification_service import VerificationResult
        
        result = VerificationResult(
            success=True,
            status="Verified",
            student_name="John Doe",
            avg_confidence=85.5,
            confidence_label="HIGH",
            frame_count=5,
            frames_matched=5
        )
        
        d = result.to_dict()
        
        assert d["success"] == True
        assert d["status"] == "Verified"
        assert d["student_name"] == "John Doe"
        assert d["avg_confidence"] == 85.5
        assert d["confidence_label"] == "HIGH"
    
    def test_proxy_result(self):
        """Test proxy detection result"""
        from app.services.verification_service import VerificationResult
        
        result = VerificationResult(
            success=False,
            status="Proxy Suspected: Multiple Faces",
            is_proxy_suspected=True,
            proxy_reason="2 faces detected",
            frame_count=3
        )
        
        assert result.is_proxy_suspected
        assert "Multiple Faces" in result.status
        assert result.proxy_reason is not None


class TestLivenessDetection:
    """Test liveness detection functionality"""
    
    def test_ear_calculation_basic(self):
        """Test Eye Aspect Ratio calculation with mock landmarks"""
        from app.services.liveness_service import calculate_ear
        
        # Simulate open eye landmarks (EAR should be around 0.25-0.3)
        # These are approximate positions for a visible open eye
        open_eye_landmarks = [
            (10, 50),   # p1: outer corner
            (20, 40),   # p2: upper outer
            (30, 40),   # p3: upper inner
            (40, 50),   # p4: inner corner
            (30, 60),   # p5: lower inner
            (20, 60),   # p6: lower outer
        ]
        
        ear = calculate_ear(open_eye_landmarks)
        # For open eyes, EAR should be above blink threshold
        assert ear > 0.15
        
        # Simulate closed eye (flatten vertical distances)
        closed_eye_landmarks = [
            (10, 50),   # p1
            (20, 49),   # p2 - very close to center
            (30, 49),   # p3
            (40, 50),   # p4
            (30, 51),   # p5 - very close to center
            (20, 51),   # p6
        ]
        
        ear_closed = calculate_ear(closed_eye_landmarks)
        # Closed eyes should have lower EAR
        assert ear_closed < ear  # Should be less than open eye
    
    def test_liveness_service_insufficient_frames(self):
        """Test liveness check with too few frames"""
        from app.services.liveness_service import liveness_service
        
        result = liveness_service.check_liveness([b'frame1', b'frame2'])
        
        # Should fail or warn about insufficient frames
        # (actual behavior depends on MediaPipe availability)
        assert result.frames_analyzed <= 2


class TestVerificationService:
    """Test the multi-frame verification service"""
    
    def test_empty_frames_returns_error(self):
        """Test verification with no frames"""
        from app.services.verification_service import verification_service
        
        result = verification_service.verify_multi_frame(frames=[])
        
        assert result.success == False
        assert "No frames" in result.status


# Run with: pytest tests/test_verification.py -v
if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
Temporal Multi-Frame Verification Service
Implements session-aware attendance verification with anti-spoofing.

Key Features:
- Multi-frame identity consistency check
- Configurable confidence thresholds  
- Duplicate attendance prevention per session
- Liveness detection integration
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from sqlalchemy.orm import Session as DBSession

from app.core.config_thresholds import thresholds
from app.services.face_service import face_service
from app.models.attendance import AttendanceLog, Student
from app.models.session import AttendanceSession, SessionStatus


@dataclass
class VerificationResult:
    """Result of multi-frame verification"""
    success: bool
    status: str
    student_name: Optional[str] = None
    student_id: Optional[int] = None
    avg_confidence: float = 0.0
    confidence_label: str = "UNKNOWN"
    frame_count: int = 0
    frames_matched: int = 0
    liveness_passed: bool = False
    is_proxy_suspected: bool = False
    proxy_reason: Optional[str] = None
    notes: List[str] = None
    
    def __post_init__(self):
        if self.notes is None:
            self.notes = []
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "status": self.status,
            "student_name": self.student_name,
            "student_id": self.student_id,
            "avg_confidence": round(self.avg_confidence, 2),
            "confidence_label": self.confidence_label,
            "frame_count": self.frame_count,
            "frames_matched": self.frames_matched,
            "liveness_passed": self.liveness_passed,
            "is_proxy_suspected": self.is_proxy_suspected,
            "proxy_reason": self.proxy_reason,
            "notes": self.notes
        }


class VerificationService:
    """
    Handles temporal multi-frame verification for robust attendance.
    
    Design Philosophy:
    - Attendance confirmed over time, not single frame
    - Probabilistic matching with explainable thresholds
    - Fail-safe with manual override path
    """
    
    def __init__(self):
        self.thresholds = thresholds
    
    def verify_single_frame(self, frame_bytes: bytes) -> Dict[str, Any]:
        """
        Verify a single frame. Returns raw verification data.
        Used internally by multi-frame verification.
        """
        return face_service.verify_student(frame_bytes)
    
    def verify_multi_frame(
        self, 
        frames: List[bytes],
        session_id: Optional[int] = None,
        claimed_student_id: Optional[str] = None,
        db: Optional[DBSession] = None
    ) -> VerificationResult:
        """
        Verify identity across multiple frames for robust attendance.
        
        Args:
            frames: List of JPEG image bytes (minimum 3 recommended)
            session_id: Optional session to check for duplicates
            claimed_student_id: Optional claimed identity (for proxy check)
            db: Database session for duplicate checks
            
        Returns:
            VerificationResult with aggregated verification data
        """
        if len(frames) < 1:
            return VerificationResult(
                success=False,
                status="No frames provided",
                frame_count=0
            )
        
        # Process each frame
        frame_results = []
        identities = []
        confidences = []
        multi_face_count = 0
        no_face_count = 0
        
        for i, frame_bytes in enumerate(frames):
            result = self.verify_single_frame(frame_bytes)
            frame_results.append(result)
            
            if result.get("status") == "multiple_faces":
                multi_face_count += 1
            elif result.get("status") == "no_face":
                no_face_count += 1
            elif result.get("status") == "success" and result.get("match"):
                identities.append(result.get("student_name"))
                confidences.append(result.get("confidence", 0))
        
        # Analyze results
        frame_count = len(frames)
        frames_matched = len(identities)
        
        # Check for proxy: multiple faces detected
        if multi_face_count > 0 and self.thresholds.MULTI_FACE_IS_PROXY_RISK:
            return VerificationResult(
                success=False,
                status="Proxy Suspected: Multiple Faces",
                is_proxy_suspected=True,
                proxy_reason=f"Multiple faces detected in {multi_face_count}/{frame_count} frames",
                frame_count=frame_count,
                frames_matched=frames_matched
            )
        
        # Check for no faces
        if no_face_count == frame_count:
            return VerificationResult(
                success=False,
                status="No Face Detected",
                frame_count=frame_count,
                frames_matched=0
            )
        
        # Check identity consistency
        if frames_matched < self.thresholds.REQUIRED_CONSISTENT_FRAMES:
            # Not enough consistent matches
            if frames_matched == 0:
                return VerificationResult(
                    success=False,
                    status="Face Not Recognized",
                    frame_count=frame_count,
                    frames_matched=0
                )
            else:
                return VerificationResult(
                    success=False,
                    status=f"Inconsistent Recognition ({frames_matched}/{frame_count} frames)",
                    frame_count=frame_count,
                    frames_matched=frames_matched,
                    notes=[f"Only {frames_matched} frames matched, need {self.thresholds.REQUIRED_CONSISTENT_FRAMES}"]
                )
        
        # Check if all matched frames have same identity
        unique_identities = set(identities)
        if len(unique_identities) > 1:
            # Identity switched mid-verification
            return VerificationResult(
                success=False,
                status="Proxy Suspected: Identity Switch",
                is_proxy_suspected=True,
                proxy_reason=f"Multiple identities detected: {unique_identities}",
                frame_count=frame_count,
                frames_matched=frames_matched
            )
        
        # We have consistent identity
        recognized_name = identities[0]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        confidence_label = self.thresholds.get_confidence_label(avg_confidence)
        
        # Check confidence threshold
        if avg_confidence < self.thresholds.FACE_CONFIDENCE_REJECT:
            return VerificationResult(
                success=False,
                status="Low Confidence - Rejected",
                student_name=recognized_name,
                avg_confidence=avg_confidence,
                confidence_label=confidence_label,
                frame_count=frame_count,
                frames_matched=frames_matched,
                notes=[f"Confidence {avg_confidence:.1f}% below threshold {self.thresholds.FACE_CONFIDENCE_REJECT}%"]
            )
        
        # Check claimed identity vs recognized (proxy detection)
        is_proxy = False
        proxy_reason = None
        
        if claimed_student_id and db:
            # Look up the claimed student
            claimed_student = db.query(Student).filter(
                (Student.id == claimed_student_id) | 
                (Student.roll_number == claimed_student_id)
            ).first()
            
            if claimed_student and claimed_student.name.lower() != recognized_name.lower():
                is_proxy = True
                proxy_reason = f"Claimed {claimed_student.name} but recognized as {recognized_name}"
        
        # Check for duplicate attendance in session
        if session_id and db:
            dup_check = self._check_duplicate(db, recognized_name, session_id)
            if dup_check:
                return VerificationResult(
                    success=False,
                    status="Already Marked",
                    student_name=recognized_name,
                    avg_confidence=avg_confidence,
                    confidence_label=confidence_label,
                    frame_count=frame_count,
                    frames_matched=frames_matched,
                    notes=[f"Attendance already marked at {dup_check.timestamp}"]
                )
        
        # Success!
        notes = []
        if confidence_label == "LOW":
            notes.append("Low confidence - consider re-verification")
        if is_proxy:
            notes.append(proxy_reason)
        
        return VerificationResult(
            success=True,
            status="Verified" if not is_proxy else "Proxy Suspected: ID Mismatch",
            student_name=recognized_name,
            avg_confidence=avg_confidence,
            confidence_label=confidence_label,
            frame_count=frame_count,
            frames_matched=frames_matched,
            liveness_passed=False,  # Will be set by liveness service
            is_proxy_suspected=is_proxy,
            proxy_reason=proxy_reason,
            notes=notes
        )
    
    def _check_duplicate(
        self, 
        db: DBSession, 
        student_name: str, 
        session_id: int
    ) -> Optional[AttendanceLog]:
        """
        Check if student already has attendance in this session.
        Returns the existing log if found, None otherwise.
        """
        # Find student
        student = db.query(Student).filter(Student.name == student_name).first()
        if not student:
            return None
        
        # Check for existing attendance in session
        existing = db.query(AttendanceLog).filter(
            AttendanceLog.student_id == student.id,
            AttendanceLog.session_id == session_id,
            AttendanceLog.status.in_(["Verified", "Verified (Biometric)", "Face Verified"])
        ).first()
        
        return existing
    
    def get_student_by_name(self, db: DBSession, name: str) -> Optional[Student]:
        """Find student by name (case-insensitive)"""
        return db.query(Student).filter(Student.name.ilike(name)).first()


# Global singleton
verification_service = VerificationService()

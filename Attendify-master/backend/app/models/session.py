"""
Session Model for Class-Based Attendance Management
Enables tracking attendance per class session with lifecycle management
"""

from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional
import enum

from app.core.database import Base


class SessionStatus(str, enum.Enum):
    """Session lifecycle states"""
    PENDING = "pending"      # Created but not started
    ACTIVE = "active"        # Currently accepting attendance
    ENDED = "ended"          # Closed, no more attendance


class AttendanceSession(Base):
    """
    Represents a class session for attendance tracking.
    
    Example: "CS201 Morning - 2026-01-16"
    Students can only mark attendance during ACTIVE sessions.
    """
    __tablename__ = 'attendance_sessions'
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Session identity
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Class reference (optional - links to ClassGroup if exists)
    class_group_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey('class_groups.id'), nullable=True
    )
    
    # Lifecycle
    status: Mapped[str] = mapped_column(
        String(20), 
        default=SessionStatus.PENDING.value,
        nullable=False
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Settings for this session
    require_liveness: Mapped[bool] = mapped_column(default=False)
    min_confidence: Mapped[float] = mapped_column(default=60.0)  # Minimum confidence %
    
    # Creator (faculty/admin)
    created_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Relationships
    attendance_logs = relationship("AttendanceLog", back_populates="session")
    
    def start(self):
        """Transition session to active state"""
        if self.status == SessionStatus.PENDING.value:
            self.status = SessionStatus.ACTIVE.value
            self.started_at = datetime.utcnow()
    
    def end(self):
        """Close the session"""
        if self.status == SessionStatus.ACTIVE.value:
            self.status = SessionStatus.ENDED.value
            self.ended_at = datetime.utcnow()
    
    @property
    def is_active(self) -> bool:
        return self.status == SessionStatus.ACTIVE.value
    
    @property
    def duration_minutes(self) -> Optional[int]:
        """Calculate session duration in minutes"""
        if self.started_at and self.ended_at:
            delta = self.ended_at - self.started_at
            return int(delta.total_seconds() / 60)
        return None

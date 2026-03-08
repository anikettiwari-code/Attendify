from sqlalchemy import Column, Integer, String, DateTime, LargeBinary, ForeignKey, Float, Boolean, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.core.database import Base


class Student(Base):
    """
    Student entity with multi-factor biometric registration.
    
    Supports:
    - Facial recognition (photo folder)
    - Fingerprint authentication (simulated/real)
    - ID card validation
    """
    __tablename__ = 'students'
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    roll_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=True)
    
    # Biometric Data (Simulated & Actual)
    photo_folder_path: Mapped[str] = mapped_column(String(255), nullable=False)
    fingerprint_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=True)
    id_card_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=True)
    
    # Privacy & Compliance
    biometric_consent: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Risk Profile (NEW)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Relationship
    attendance_logs: Mapped[list["AttendanceLog"]] = relationship(
        "AttendanceLog", 
        back_populates="student",
        cascade="all, delete-orphan"
    )


class AttendanceLog(Base):
    """
    Attendance log entry with enterprise-grade verification tracking.
    
    Features:
    - Session-based attendance management
    - Multi-frame temporal verification
    - Anomaly detection integration
    - Full audit trail
    """
    __tablename__ = 'attendance_logs'
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_attendance_timestamp', 'timestamp'),
        Index('idx_attendance_student_session', 'student_id', 'session_id'),
        Index('idx_attendance_anomaly', 'is_anomaly', 'timestamp'),
    )
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey('students.id', ondelete='SET NULL'), nullable=True)
    
    # Session reference
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey('attendance_sessions.id', ondelete='SET NULL'), nullable=True
    )
    
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    status: Mapped[str] = mapped_column(String(100), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Verification Details
    verification_method: Mapped[str] = mapped_column(String(50), nullable=True)
    is_proxy_suspected: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Multi-frame Verification
    frame_count: Mapped[int] = mapped_column(Integer, default=1)
    avg_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    liveness_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    confidence_label: Mapped[str] = mapped_column(String(20), nullable=True)

    # Anomaly Detection
    latitude: Mapped[float] = mapped_column(Float, nullable=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)  # IPv6 compatible
    user_agent: Mapped[str] = mapped_column(String(255), nullable=True)
    is_anomaly: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    anomaly_reason: Mapped[str] = mapped_column(Text, nullable=True)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Relationships
    student: Mapped["Student"] = relationship("Student", back_populates="attendance_logs")
    session = relationship("AttendanceSession", back_populates="attendance_logs")
    
    def __repr__(self):
        return f"<AttendanceLog {self.id}: {self.status} @ {self.timestamp}>"


class Notice(Base):
    """System notices and announcements."""
    __tablename__ = 'notices'
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str] = mapped_column(String(100), default="Admin")
    date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    priority: Mapped[str] = mapped_column(String(20), default="normal")  # low, normal, high, urgent

"""
Session Management API Routes
Endpoints for creating, managing, and querying attendance sessions.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.models.session import AttendanceSession, SessionStatus
from app.models.attendance import AttendanceLog, Student


router = APIRouter()


# ========== Pydantic Schemas ==========

class SessionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    class_group_id: Optional[int] = None
    require_liveness: bool = False
    min_confidence: float = 60.0
    created_by: Optional[str] = None


class SessionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    created_at: datetime
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    require_liveness: bool
    min_confidence: float
    attendance_count: int = 0
    
    class Config:
        from_attributes = True


class SessionSummary(BaseModel):
    session_id: int
    session_name: str
    status: str
    total_attendance: int
    verified_count: int
    proxy_suspected_count: int
    failed_count: int
    avg_confidence: float
    duration_minutes: Optional[int]


# ========== Endpoints ==========

@router.post("/start", response_model=SessionResponse)
def create_and_start_session(
    data: SessionCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new attendance session and optionally start it immediately.
    
    Faculty/admin creates a session for a class. Students can then
    mark attendance only when the session is ACTIVE.
    """
    # Create session
    session = AttendanceSession(
        name=data.name,
        description=data.description,
        class_group_id=data.class_group_id,
        require_liveness=data.require_liveness,
        min_confidence=data.min_confidence,
        created_by=data.created_by,
        status=SessionStatus.ACTIVE.value,
        started_at=datetime.utcnow()
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return SessionResponse(
        id=session.id,
        name=session.name,
        description=session.description,
        status=session.status,
        created_at=session.created_at,
        started_at=session.started_at,
        ended_at=session.ended_at,
        require_liveness=session.require_liveness,
        min_confidence=session.min_confidence,
        attendance_count=0
    )


@router.patch("/{session_id}/end")
def end_session(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    End an active session. No more attendance can be marked after this.
    """
    session = db.query(AttendanceSession).filter(
        AttendanceSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(404, "Session not found")
    
    if session.status != SessionStatus.ACTIVE.value:
        raise HTTPException(400, f"Session is not active (current: {session.status})")
    
    session.end()
    db.commit()
    
    # Get attendance count
    count = db.query(AttendanceLog).filter(
        AttendanceLog.session_id == session_id
    ).count()
    
    return {
        "message": "Session ended",
        "session_id": session_id,
        "ended_at": session.ended_at,
        "total_attendance": count
    }


@router.get("/", response_model=List[SessionResponse])
def list_sessions(
    status: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    List all sessions, optionally filtered by status.
    """
    query = db.query(AttendanceSession)
    
    if status:
        query = query.filter(AttendanceSession.status == status)
    
    sessions = query.order_by(AttendanceSession.created_at.desc()).limit(limit).all()
    
    results = []
    for s in sessions:
        count = db.query(AttendanceLog).filter(
            AttendanceLog.session_id == s.id
        ).count()
        
        results.append(SessionResponse(
            id=s.id,
            name=s.name,
            description=s.description,
            status=s.status,
            created_at=s.created_at,
            started_at=s.started_at,
            ended_at=s.ended_at,
            require_liveness=s.require_liveness,
            min_confidence=s.min_confidence,
            attendance_count=count
        ))
    
    return results


@router.get("/active", response_model=List[SessionResponse])
def get_active_sessions(db: Session = Depends(get_db)):
    """
    Get all currently active sessions.
    Used by kiosk to show available sessions for attendance.
    """
    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.status == SessionStatus.ACTIVE.value
    ).all()
    
    results = []
    for s in sessions:
        count = db.query(AttendanceLog).filter(
            AttendanceLog.session_id == s.id
        ).count()
        
        results.append(SessionResponse(
            id=s.id,
            name=s.name,
            description=s.description,
            status=s.status,
            created_at=s.created_at,
            started_at=s.started_at,
            ended_at=s.ended_at,
            require_liveness=s.require_liveness,
            min_confidence=s.min_confidence,
            attendance_count=count
        ))
    
    return results


@router.get("/{session_id}/summary", response_model=SessionSummary)
def get_session_summary(
    session_id: int,
    db: Session = Depends(get_db)
):
    """
    Get detailed summary of a session's attendance.
    Includes verification statistics and proxy detection counts.
    """
    session = db.query(AttendanceSession).filter(
        AttendanceSession.id == session_id
    ).first()
    
    if not session:
        raise HTTPException(404, "Session not found")
    
    # Get all logs for this session
    logs = db.query(AttendanceLog).filter(
        AttendanceLog.session_id == session_id
    ).all()
    
    total = len(logs)
    verified = len([l for l in logs if "Verified" in l.status and not l.is_proxy_suspected])
    proxy_suspected = len([l for l in logs if l.is_proxy_suspected])
    failed = len([l for l in logs if "Failed" in l.status or "Rejected" in l.status])
    
    confidences = [l.confidence for l in logs if l.confidence > 0]
    avg_conf = sum(confidences) / len(confidences) if confidences else 0
    
    return SessionSummary(
        session_id=session_id,
        session_name=session.name,
        status=session.status,
        total_attendance=total,
        verified_count=verified,
        proxy_suspected_count=proxy_suspected,
        failed_count=failed,
        avg_confidence=round(avg_conf, 2),
        duration_minutes=session.duration_minutes
    )

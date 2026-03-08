from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date, desc, or_
from datetime import timedelta, timezone
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.config_thresholds import thresholds
from app.models.attendance import Student, AttendanceLog
from app.models.session import AttendanceSession, SessionStatus
from app.services.face_service import face_service
from app.services.verification_service import verification_service
from app.services.liveness_service import liveness_service
from app.services.anomaly_service import detect_anomalies
from datetime import datetime
import os
import shutil
import aiofiles
from pathlib import Path

router = APIRouter()

SESSION_NOT_FOUND = "Session not found"
BIOMETRIC_REQUIRED = "Biometric Required"

# Base path for face images
# backend/app/api/routes -> backend/app -> backend/app/models
DATA_FACE_DIR = Path(__file__).resolve().parent.parent.parent / "models" / "_data-face"


# ========== Pydantic Schemas ==========

class OverrideRequest(BaseModel):
    """Manual attendance override by faculty"""
    student_id: int
    session_id: int | None = None
    reason: str
    override_by: str  # Faculty name/ID


class ManualSubmitItem(BaseModel):
    student_id: int
    status: str  # present | absent
    note: str | None = None


class ManualSubmitRequest(BaseModel):
    entries: list[ManualSubmitItem]
    session_id: int | None = None
    submitted_by: str | None = None


class AttendanceMarkResponse(BaseModel):
    """Response for attendance marking"""
    success: bool
    status: str
    student_name: Optional[str] = None
    confidence: float = 0.0
    confidence_label: str = "UNKNOWN"
    proxy_suspected: bool = False
    proxy_reason: Optional[str] = None
    liveness_passed: bool = False
    log_id: Optional[int] = None
    session_id: Optional[int] = None
    notes: List[str] = []
    face_rect: Optional[List[int]] = None  # [x, y, width, height] for bounding box


def _get_session_or_raise(db: Session, session_id: Optional[int]) -> Optional[AttendanceSession]:
    if not session_id:
        return None
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(404, SESSION_NOT_FOUND)
    if not session.is_active:
        raise HTTPException(400, f"Session is not active (status: {session.status})")
    return session


def _apply_confidence_policy(confidence: float, notes: list[str]) -> tuple[bool, str]:
    if confidence < thresholds.FACE_CONFIDENCE_REJECT:
        notes.append(f"Face confidence {confidence:.1f}% too low - please verify with fingerprint")
        return True, BIOMETRIC_REQUIRED
    if confidence < thresholds.FACE_CONFIDENCE_BIOMETRIC_REQUIRED:
        notes.append(f"Face confidence {confidence:.1f}% < 60% - please verify with fingerprint")
        return True, BIOMETRIC_REQUIRED
    return False, "Face Verified"


def _apply_claim_checks(
    db_student: Student,
    student_id: Optional[str],
    fingerprint_data: Optional[str],
    id_card_scan: Optional[str],
    recognized_name: str,
    verification_method: str,
    status: str,
    proxy_suspected: bool,
    proxy_reason: Optional[str],
) -> tuple[str, bool, Optional[str], str]:
    if student_id:
        if str(db_student.roll_number) != str(student_id) and str(db_student.id) != str(student_id):
            status = "Proxy Suspected: ID Mismatch"
            proxy_suspected = True
            proxy_reason = f"Claimed {student_id}, recognized as {recognized_name}"

    if fingerprint_data:
        verification_method += "+Fingerprint"
        if db_student.fingerprint_id != fingerprint_data:
            status = "Proxy Suspected: Fingerprint Mismatch"
            proxy_suspected = True
            proxy_reason = f"Fingerprint mismatch for {recognized_name}"

    if id_card_scan:
        verification_method += "+IDCard"
        if db_student.id_card_code != id_card_scan:
            status = "Proxy Suspected: ID Card Mismatch"
            proxy_suspected = True
            proxy_reason = f"ID card mismatch for {recognized_name}"

    return status, proxy_suspected, proxy_reason, verification_method


def _check_duplicate_attendance(
    db: Session,
    session_id: Optional[int],
    db_student: Optional[Student],
    status: str,
    confidence: float,
    recognized_name: Optional[str],
) -> Optional[AttendanceMarkResponse]:
    if not session_id or not db_student or "Verified" not in status:
        return None
    existing = db.query(AttendanceLog).filter(
        AttendanceLog.student_id == db_student.id,
        AttendanceLog.session_id == session_id,
        AttendanceLog.status.contains("Verified"),
    ).first()
    if not existing:
        return None
    return AttendanceMarkResponse(
        success=False,
        status="Already Marked",
        student_name=recognized_name,
        confidence=confidence,
        confidence_label=thresholds.get_confidence_label(confidence),
        notes=[f"Already marked at {existing.timestamp}"],
        session_id=session_id,
    )


async def _read_frames(files: list[UploadFile]) -> list[bytes]:
    frames: list[bytes] = []
    for f in files:
        frames.append(await f.read())
    return frames


def _init_face_state(verify_result: dict) -> dict:
    return {
        "status": "Unknown",
        "confidence": verify_result.get("confidence", 0.0),
        "recognized_name": verify_result.get("student_name"),
        "face_rect": verify_result.get("face_rect"),
        "proxy_suspected": False,
        "proxy_reason": None,
        "verification_method": "Face",
        "notes": [],
        "db_student": None,
        "biometric_fallback": False,
    }


def _process_face_result(
    db: Session,
    verify_result: dict,
    state: dict,
    session_id: Optional[int],
    student_id: Optional[str],
    fingerprint_data: Optional[str],
    id_card_scan: Optional[str],
) -> tuple[dict, Optional[AttendanceMarkResponse]]:
    status = verify_result.get("status")
    notes: list[str] = state["notes"]

    if status == "no_face":
        state["biometric_fallback"] = True
        state["status"] = BIOMETRIC_REQUIRED
        notes.append("No face detected - please use fingerprint for verification")
        return state, None

    if status == "multiple_faces":
        state["biometric_fallback"] = True
        state["status"] = BIOMETRIC_REQUIRED
        state["proxy_suspected"] = True
        state["proxy_reason"] = f"Detected {verify_result.get('face_count', 2)} faces - please verify with fingerprint"
        notes.append("Multiple faces detected - fingerprint verification required")
        return state, None

    if status == "error":
        state["biometric_fallback"] = True
        state["status"] = BIOMETRIC_REQUIRED
        notes.append(
            f"Face detection error: {verify_result.get('message', verify_result.get('error', 'Unknown error'))} - please use fingerprint for verification"
        )
        return state, None

    if not state["recognized_name"]:
        return state, None

    db_student = db.query(Student).filter(Student.name == state["recognized_name"]).first()
    state["db_student"] = db_student
    if not db_student:
        state["biometric_fallback"] = True
        state["status"] = BIOMETRIC_REQUIRED
        notes.append(
            f"Face recognized ({state['recognized_name']}) but not in database - please verify with fingerprint"
        )
        return state, None

    state["biometric_fallback"], state["status"] = _apply_confidence_policy(state["confidence"], notes)
    if not state["biometric_fallback"]:
        status, proxy_suspected, proxy_reason, verification_method = _apply_claim_checks(
            db_student,
            student_id,
            fingerprint_data,
            id_card_scan,
            state["recognized_name"],
            state["verification_method"],
            state["status"],
            state["proxy_suspected"],
            state["proxy_reason"],
        )
        state["status"] = status
        state["proxy_suspected"] = proxy_suspected
        state["proxy_reason"] = proxy_reason
        state["verification_method"] = verification_method

    duplicate = _check_duplicate_attendance(
        db,
        session_id,
        db_student,
        state["status"],
        state["confidence"],
        state["recognized_name"],
    )
    return state, duplicate


def _apply_biometric_fallback(
    db: Session,
    state: dict,
    fingerprint_data: Optional[str],
    id_card_scan: Optional[str],
) -> dict:
    if not state["biometric_fallback"]:
        return state

    if fingerprint_data:
        fingerprint_student = db.query(Student).filter(Student.fingerprint_id == fingerprint_data).first()
        if fingerprint_student:
            state["verification_method"] = "Fingerprint"
            state["status"] = "Biometrically Verified"
            state["db_student"] = fingerprint_student
            state["recognized_name"] = fingerprint_student.name
            state["confidence"] = 100.0
            state["notes"].append("Verified by fingerprint only")
        else:
            state["status"] = "Rejected: Fingerprint Not Found"
            state["notes"].append("Fingerprint not registered in database")
    elif id_card_scan:
        card_student = db.query(Student).filter(Student.id_card_code == id_card_scan).first()
        if card_student:
            state["verification_method"] = "ID Card"
            state["status"] = "ID Card Verified"
            state["db_student"] = card_student
            state["recognized_name"] = card_student.name
            state["confidence"] = 100.0
            state["notes"].append("Verified by ID Card only")
        else:
            state["status"] = "Rejected: ID Card Not Found"
            state["notes"].append("ID Card not registered in database")
    
    return state


def _build_attendance_response(
    db: Session,
    state: dict,
    session_id: Optional[int],
    fingerprint_data: Optional[str],
    id_card_scan: Optional[str],
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    ip_address: Optional[str] = None,
) -> AttendanceMarkResponse:
    if state["biometric_fallback"] and not fingerprint_data and not id_card_scan:
        return AttendanceMarkResponse(
            success=False,
            status=BIOMETRIC_REQUIRED,
            student_name=state["recognized_name"],
            confidence=state["confidence"],
            confidence_label=thresholds.get_confidence_label(state["confidence"]) if state["confidence"] > 0 else "UNKNOWN",
            notes=state["notes"],
            session_id=session_id
        )

    log = AttendanceLog(
        student_id=state["db_student"].id if state["db_student"] else None,
        session_id=session_id,
        status=state["status"],
        confidence=state["confidence"],
        avg_confidence=state["confidence"],
        confidence_label=thresholds.get_confidence_label(state["confidence"]),
        is_proxy_suspected=state["proxy_suspected"],
        verification_method=state["verification_method"],
        notes=", ".join(state["notes"]) if state["notes"] else None,
        frame_count=1,
        latitude=latitude,
        longitude=longitude,
        ip_address=ip_address
    )
    
    # Anomaly Detection
    anomalies = detect_anomalies(db, log, latitude, longitude)
    if anomalies:
        log.is_anomaly = True
        log.anomaly_reason = ", ".join(anomalies)
        state["notes"].append(f"⚠️ Anomaly: {log.anomaly_reason}")
        
    db.add(log)
    db.commit()
    db.refresh(log)
    
    return AttendanceMarkResponse(
        success="Verified" in state["status"] and not state["proxy_suspected"],
        status=state["status"],
        student_name=state["recognized_name"],
        confidence=state["confidence"],
        confidence_label=thresholds.get_confidence_label(state["confidence"]),
        proxy_suspected=state["proxy_suspected"],
        proxy_reason=state["proxy_reason"],
        log_id=log.id,
        session_id=session_id,
        notes=state["notes"],
        face_rect=list(state["face_rect"]) if state["face_rect"] else None
    )


# ========== Registration Endpoint ==========

@router.post("/register")
async def register(
    name: str = Form(...), 
    roll_number: str = Form(...), 
    fingerprint_id: str = Form(None),
    id_card_code: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Register a new student with face, fingerprint, and ID card.
    Creates a folder in _data-face/{name} and saves the initial image.
    """
    try:
        # Check if student exists
        existing = db.query(Student).filter(Student.roll_number == roll_number).first()
        if existing:
            raise HTTPException(400, "Student already registered (Roll No exists)")
        
        # Create folder
        clean_name = name.lower().replace(" ", "_")
        folder_path = DATA_FACE_DIR / clean_name
        folder_path.mkdir(parents=True, exist_ok=True)
        
        # Save image
        existing_files = sorted(folder_path.glob("*.jpg"))
        next_index = 1
        if existing_files:
            try:
                next_index = max(int(f.stem) for f in existing_files if f.stem.isdigit()) + 1
            except Exception:
                next_index = len(existing_files) + 1

        file_path = folder_path / f"{next_index}.jpg"
        contents = await file.read()
        async with aiofiles.open(file_path, "wb") as buffer:
            await buffer.write(contents)
            
        # Create DB entry
        new_student = Student(
            name=name,
            roll_number=roll_number,
            photo_folder_path=str(folder_path),
            fingerprint_id=fingerprint_id,
            id_card_code=id_card_code
        )
        db.add(new_student)
        db.commit()
        db.refresh(new_student)
        
        face_service.retrain_model()

        return {
            "message": "Student registered successfully", 
            "student_id": new_student.id,
            "folder": str(folder_path)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Registration failed: {str(e)}")


# ========== Single-Frame Attendance (Legacy) ==========

@router.post("/mark", response_model=AttendanceMarkResponse)
async def mark_attendance(
    request: Request,
    file: UploadFile = File(...),
    session_id: Optional[int] = Form(None),
    student_id: str = Form(None),       # Claimed Identity
    fingerprint_data: str = Form(None), # Simulated Fingerprint
    id_card_scan: str = Form(None),     # Simulated Card Code
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Mark attendance with single-frame face verification.
    
    Enhanced with:
    - Session validation
    - Duplicate prevention
    - Proxy detection
    - Configurable thresholds
    - Anomaly detection (Location/Time/Behavior)
    """
    try:
        _get_session_or_raise(db, session_id)
        
        # Read image bytes
        frame_bytes = await file.read()
        
        # Face Verification
        verify_result = face_service.verify_student(frame_bytes)
        
        state = _init_face_state(verify_result)
        state, duplicate_response = _process_face_result(
            db,
            verify_result,
            state,
            session_id,
            student_id,
            fingerprint_data,
            id_card_scan,
        )
        if duplicate_response:
            return duplicate_response
        
        state = _apply_biometric_fallback(db, state, fingerprint_data, id_card_scan)
        
        ip_address = request.client.host if request.client else None

        return _build_attendance_response(
            db, 
            state, 
            session_id, 
            fingerprint_data, 
            id_card_scan,
            latitude,
            longitude,
            ip_address
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Mark API: {e}")
        raise HTTPException(500, f"Internal Error: {str(e)}")


# ========== Multi-Frame Attendance (Enhanced) ==========

@router.post("/mark-multi", response_model=AttendanceMarkResponse)
async def mark_attendance_multi(
    request: Request,
    files: List[UploadFile] = File(...),
    session_id: Optional[int] = Form(None),
    student_id: str = Form(None),
    check_liveness: bool = Form(False),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Mark attendance with multi-frame temporal verification.
    
    Accepts 3+ frames captured over ~1.5 seconds for:
    - Identity consistency check
    - Higher confidence through averaging
    - Optional liveness (blink) detection
    - Anomaly detection
    """
    try:
        session = _get_session_or_raise(db, session_id)
        if session and session.require_liveness:
            check_liveness = True
        
        # Read all frames
        frames = await _read_frames(files)
        
        if len(frames) < thresholds.REQUIRED_CONSISTENT_FRAMES:
            return AttendanceMarkResponse(
                success=False,
                status=f"Need {thresholds.REQUIRED_CONSISTENT_FRAMES}+ frames",
                notes=[f"Received {len(frames)} frames"]
            )
        
        # Run multi-frame verification
        result = verification_service.verify_multi_frame(
            frames=frames,
            session_id=session_id,
            claimed_student_id=student_id,
            db=db
        )
        
        # Liveness check if enabled
        liveness_passed = False
        if check_liveness and result.success:
            liveness_result = liveness_service.check_liveness(frames)
            liveness_passed = liveness_result.passed
            
            if not liveness_passed:
                result.success = False
                result.status = "Liveness Failed"
                result.notes.append(liveness_result.message)
        
        # Find student for DB record
        db_student = None
        if result.student_name:
            db_student = db.query(Student).filter(
                Student.name == result.student_name
            ).first()
        
        # Create attendance log
        log = AttendanceLog(
            student_id=db_student.id if db_student else None,
            session_id=session_id,
            status=result.status,
            confidence=result.avg_confidence,
            avg_confidence=result.avg_confidence,
            confidence_label=result.confidence_label,
            is_proxy_suspected=result.is_proxy_suspected,
            verification_method="Face+MultiFrame",
            notes=", ".join(result.notes) if result.notes else None,
            frame_count=result.frame_count,
            liveness_passed=liveness_passed,
            latitude=latitude,
            longitude=longitude,
            ip_address=request.client.host if request.client else None
        )
        
        # Anomaly Detection
        anomalies = detect_anomalies(db, log, latitude, longitude)
        if anomalies:
            log.is_anomaly = True
            log.anomaly_reason = ", ".join(anomalies)
            result.notes.append(f"⚠️ Anomaly: {log.anomaly_reason}")
            
        db.add(log)
        db.commit()
        db.refresh(log)
        
        return AttendanceMarkResponse(
            success=result.success,
            status=result.status,
            student_name=result.student_name,
            confidence=result.avg_confidence,
            confidence_label=result.confidence_label,
            proxy_suspected=result.is_proxy_suspected,
            proxy_reason=", ".join(result.notes),
            log_id=log.id,
            session_id=session_id,
            notes=result.notes,
            face_rect=None 
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Mark Multi API: {e}")
        raise HTTPException(500, f"Internal Error: {str(e)}")



# ========== Manual Override (Faculty) ==========

@router.post("/override")
async def manual_override(
    data: OverrideRequest,
    db: Session = Depends(get_db)
):
    """
    Manual attendance override by faculty.
    
    Used when:
    - Face recognition fails repeatedly
    - Student has changed appearance
    - Technical issues prevent normal marking
    
    Creates an audit trail with override reason and faculty ID.
    """
    # Validate student
    student = db.query(Student).filter(Student.id == data.student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    
    session = None
    if data.session_id:
        session = db.query(AttendanceSession).filter(
            AttendanceSession.id == data.session_id
        ).first()
        if not session:
            raise HTTPException(404, SESSION_NOT_FOUND)
    
    # Check for existing attendance
    existing = db.query(AttendanceLog).filter(
        AttendanceLog.student_id == data.student_id,
        AttendanceLog.session_id == data.session_id,
        AttendanceLog.status.contains("Verified")
    ).first()
    
    if existing:
        return {
            "message": "Attendance already marked",
            "existing_log_id": existing.id,
            "timestamp": existing.timestamp
        }
    
    # Create manual override log
    log = AttendanceLog(
        student_id=data.student_id,
        session_id=data.session_id,
        status="Verified (Manual Override)",
        confidence=100.0,  # Manual = 100% by definition
        avg_confidence=100.0,
        confidence_label="MANUAL",
        is_proxy_suspected=False,
        verification_method="Manual Override",
        notes=f"Override by {data.override_by}: {data.reason}",
        frame_count=0,
        liveness_passed=False
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    
    return {
        "message": "Manual override successful",
        "log_id": log.id,
        "student_name": student.name,
        "override_by": data.override_by
    }


@router.post("/manual/submit")
async def manual_bulk_submit(
    payload: ManualSubmitRequest,
    db: Session = Depends(get_db)
):
    """Bulk manual attendance submission (present/absent) with audit."""

    if not payload.entries:
        raise HTTPException(400, "No entries provided")

    session = None
    if payload.session_id:
        session = db.query(AttendanceSession).filter(AttendanceSession.id == payload.session_id).first()
        if not session:
            raise HTTPException(404, SESSION_NOT_FOUND)

    created = 0
    updated = 0

    for entry in payload.entries:
        student = db.query(Student).filter(Student.id == entry.student_id).first()
        if not student:
            continue  # skip invalid

        status_label = "Present (Manual)" if entry.status.lower() == "present" else "Absent (Manual)"

        existing = db.query(AttendanceLog).filter(
            AttendanceLog.student_id == entry.student_id,
            AttendanceLog.session_id == payload.session_id,
        ).first()

        if existing:
            existing.status = status_label
            existing.timestamp = datetime.now(timezone.utc)
            existing.notes = entry.note or existing.notes
            existing.verification_method = "Manual Entry"
            updated += 1
        else:
            log = AttendanceLog(
                student_id=entry.student_id,
                session_id=payload.session_id,
                status=status_label,
                confidence=100.0,
                avg_confidence=100.0,
                confidence_label="MANUAL",
                is_proxy_suspected=False,
                verification_method="Manual Entry",
                notes=entry.note or f"Manual submit by {payload.submitted_by or 'manual UI'}",
                frame_count=0,
                liveness_passed=False,
            )
            db.add(log)
            created += 1

    db.commit()

    return {
        "message": "Manual attendance submitted",
        "created": created,
        "updated": updated,
        "session_id": payload.session_id,
    }


# ========== Utility Endpoints ==========

@router.get("/logs")
def get_logs(
    session_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get attendance logs, optionally filtered by session."""
    query = db.query(AttendanceLog)
    
    if session_id:
        query = query.filter(AttendanceLog.session_id == session_id)
    
    logs = query.order_by(AttendanceLog.timestamp.desc()).limit(limit).all()
    
    # Enrich with student names
    results = []
    for log in logs:
        student_name = None
        if log.student_id:
            student = db.query(Student).filter(Student.id == log.student_id).first()
            student_name = student.name if student else None
        
        results.append({
            "id": log.id,
            "student_id": log.student_id,
            "student_name": student_name,
            "session_id": log.session_id,
            "timestamp": log.timestamp.isoformat(),
            "status": log.status,
            "confidence": log.confidence,
            "confidence_label": log.confidence_label,
            "is_proxy_suspected": log.is_proxy_suspected,
            "verification_method": log.verification_method,
            "frame_count": log.frame_count,
            "liveness_passed": log.liveness_passed
        })
    
    return results


@router.get("/students")
def get_students(db: Session = Depends(get_db)):
    """Get all registered students."""
    return db.query(Student).all()


@router.get("/stats")
def get_attendance_stats(db: Session = Depends(get_db)):
    """
    Get attendance statistics for dashboard.
    Returns total students, present today, absent today, and attendance rate.
    """
    from datetime import date, timedelta
    from sqlalchemy import func
    
    total_students = db.query(func.count(Student.id)).scalar()
    
    # Get today's logs (verified students)
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    
    present_today = db.query(func.count(AttendanceLog.id.distinct())).filter(
        AttendanceLog.timestamp >= today_start,
        AttendanceLog.timestamp <= today_end,
        AttendanceLog.status.contains("Verified")
    ).scalar()
    
    absent_today = total_students - present_today if total_students > 0 else 0
    attendance_rate = (present_today / total_students * 100) if total_students > 0 else 0
    
    # Weekly trend (last 7 days)
    weekly_data = []
    for i in range(7):
        day = date.today() - timedelta(days=6 - i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        day_present = db.query(func.count(AttendanceLog.id.distinct())).filter(
            AttendanceLog.timestamp >= day_start,
            AttendanceLog.timestamp <= day_end,
            AttendanceLog.status.contains("Verified")
        ).scalar()
        
        day_absent = total_students - day_present if total_students > 0 else 0
        
        weekly_data.append({
            "day": day.strftime("%a"),  # Mon, Tue, etc.
            "present": day_present,
            "absent": day_absent
        })
    
    return {
        "total_students": total_students,
        "present_today": present_today,
        "absent_today": absent_today,
        "attendance_rate": round(attendance_rate, 1),
        "weekly_data": weekly_data
    }


@router.get("/thresholds")
def get_thresholds():
    """
    Get current verification thresholds.
    Useful for transparency and debugging.
    """
    return thresholds.to_dict()

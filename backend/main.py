"""
Attendify AI Backend — FastAPI Server
======================================
Provides AI-powered face recognition, training, and attendance endpoints.

Endpoints:
  POST /api/v1/attendance/recognise       — Log a recognised student
  POST /api/v1/attendance/recognise-frame — AI: detect & recognise faces in a frame
  POST /api/v1/attendance/manual          — Manual attendance (teacher)
  POST /api/v1/students/upload-multiple-biometrics — Train model with student photos
  POST /api/v1/model/retrain              — Force model retraining
  GET  /api/v1/model/status               — Model statistics
  GET  /health                            — Health check
"""

import os
import logging
import base64
from datetime import datetime
from typing import Optional, List

import uvicorn
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from supabase import create_client, Client

# ── Load environment variables ────────────────────────────────────────────────
load_dotenv()
load_dotenv(dotenv_path="../.env")

SUPABASE_URL = os.getenv("EXPO_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Missing Supabase credentials. "
        "Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger("attendify")

# ── Constants ─────────────────────────────────────────────────────────────────
CONFIDENCE_THRESHOLD = 0.50

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Attendify AI Backend",
    version="2.0.0",
    description="AI-powered attendance recognition service with real YOLO+LBPH face recognition.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Lazy AI Service Init ─────────────────────────────────────────────────────
# Import here so the AI module loads only when first needed (keeps startup fast
# if you just want to test non-AI endpoints).

_face_service = None

def get_face_service():
    global _face_service
    if _face_service is None:
        from ai.face_service import get_face_service as _get
        _face_service = _get()
    return _face_service


# ══════════════════════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ══════════════════════════════════════════════════════════════════════════════

class RecogniseRequest(BaseModel):
    """Body sent by the AI Recognition Engine when a student is detected."""
    student_id: str = Field(..., description="UUID of the recognised student")
    lecture_id: str = Field(..., description="UUID of the lecture being monitored")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Face-match confidence (0–1)")
    frame_timestamp: str = Field(..., description="ISO-8601 timestamp of the video frame")
    camera_id: str = Field(..., description="Identifier of the camera")


class RecogniseFrameRequest(BaseModel):
    """Send a base64 frame for AI recognition."""
    image: str = Field(..., description="Base64-encoded image (with or without data URI prefix)")
    lecture_id: str = Field(..., description="UUID of the lecture being monitored")
    camera_id: str = Field(default="mobile-app", description="Camera identifier")


class RecogniseSuccessResponse(BaseModel):
    success: bool = True
    attendance_id: str
    message: str


class RecogniseErrorResponse(BaseModel):
    success: bool = False
    message: str


class ManualAttendanceItem(BaseModel):
    student_id: str
    status: str

class ManualAttendanceRequest(BaseModel):
    lecture_id: str
    records: List[ManualAttendanceItem]


class BiometricUploadRequest(BaseModel):
    student_id: str
    profile_id: str
    full_name: str
    images: List[str]  # base64 strings


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _get_student_display(student_id: str) -> str:
    try:
        res = (
            supabase
            .table("profiles")
            .select("full_name, roll_no")
            .eq("id", student_id)
            .single()
            .execute()
        )
        if res.data:
            name = res.data.get("full_name", "Unknown")
            roll = res.data.get("roll_no")
            return f"{name} (Roll {roll})" if roll else name
    except Exception as exc:
        logger.warning("Could not fetch profile for %s: %s", student_id, exc)
    return student_id


def _get_student_profile(student_id: str) -> Optional[dict]:
    try:
        res = (
            supabase
            .table("profiles")
            .select("id, full_name, roll_no, class_id")
            .eq("id", student_id)
            .single()
            .execute()
        )
        return res.data
    except Exception as exc:
        logger.warning("Profile fetch failed for %s: %s", student_id, exc)
    return None


def _find_student_by_name(recognized_name: str) -> Optional[dict]:
    """Look up a student in Supabase profiles by name (case-insensitive)."""
    try:
        res = (
            supabase
            .table("profiles")
            .select("id, full_name, roll_no")
            .ilike("full_name", f"%{recognized_name}%")
            .eq("role", "student")
            .limit(1)
            .execute()
        )
        if res.data:
            return res.data[0]
    except Exception as exc:
        logger.warning("Student lookup failed for '%s': %s", recognized_name, exc)
    return None


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: AI RECOGNITION — LOG DETECTED STUDENT (existing)
# ══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/api/v1/attendance/recognise",
    status_code=status.HTTP_201_CREATED,
    response_model=RecogniseSuccessResponse,
    responses={
        409: {"model": RecogniseErrorResponse},
        422: {"model": RecogniseErrorResponse},
    },
    summary="AI Recognition — Log detected student",
)
async def recognise_student(body: RecogniseRequest):
    # Confidence gate
    if body.confidence_score < CONFIDENCE_THRESHOLD:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "message": f"Confidence below threshold ({CONFIDENCE_THRESHOLD} required, got {body.confidence_score:.2f})"
            }
        )

    # Duplicate check
    try:
        existing = (
            supabase.table("attendance")
            .select("id")
            .eq("student_id", body.student_id)
            .eq("lecture_id", body.lecture_id)
            .execute()
        )
        if existing.data:
            return JSONResponse(
                status_code=status.HTTP_409_CONFLICT,
                content={"success": False, "message": "Attendance already recorded"}
            )
    except Exception as exc:
        logger.error("Duplicate-check failed: %s", exc)
        raise HTTPException(status_code=500, detail="Duplicate check error")

    # Insert
    try:
        result = (
            supabase.table("attendance")
            .insert({
                "student_id": body.student_id,
                "lecture_id": body.lecture_id,
                "status": "Present",
                "method": "AI",
                "confidence_score": body.confidence_score,
                "camera_id": body.camera_id,
                "marked_at": body.frame_timestamp,
            })
            .execute()
        )

        if not result.data:
            raise RuntimeError("Insert returned no data")

        attendance_id = result.data[0]["id"]
        student_display = _get_student_display(body.student_id)

        logger.info("✅ Attendance marked: %s → lecture %s (%.2f)", student_display, body.lecture_id, body.confidence_score)

        return RecogniseSuccessResponse(
            success=True,
            attendance_id=attendance_id,
            message=f"Attendance marked for {student_display}",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Insert failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to insert attendance: {exc}")


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: AI FRAME RECOGNITION — DETECT & IDENTIFY FROM IMAGE (NEW)
# ══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/api/v1/attendance/recognise-frame",
    summary="AI Recognition — Detect & identify faces in an image frame",
    description=(
        "Send a base64-encoded image. The backend runs YOLO+LBPH face detection and recognition. "
        "If a known student is identified with sufficient confidence, attendance is automatically logged."
    ),
)
async def recognise_frame(body: RecogniseFrameRequest):
    """
    1. Decode the base64 image
    2. Run YOLO + LBPH face detection/recognition
    3. For each recognized face above threshold → log attendance
    4. Return all detected faces with names and confidence
    """
    svc = get_face_service()

    # Run recognition
    detections = svc.recognize_base64(body.image)

    if not detections:
        return {
            "success": True,
            "message": "No faces detected in the frame",
            "detections": [],
            "attendance_marked": [],
        }

    attendance_marked = []

    for det in detections:
        name = det["name"]
        confidence = det["confidence"]

        if name == "Unknown" or confidence < (CONFIDENCE_THRESHOLD * 100):
            continue

        # Find student in Supabase by recognized name
        student = _find_student_by_name(name)
        if not student:
            logger.info("Recognized '%s' (%.1f%%) but no matching student in DB", name, confidence)
            continue

        student_id = student["id"]

        # Duplicate check
        try:
            existing = (
                supabase.table("attendance")
                .select("id")
                .eq("student_id", student_id)
                .eq("lecture_id", body.lecture_id)
                .execute()
            )
            if existing.data:
                attendance_marked.append({
                    "student_id": student_id,
                    "student_name": student.get("full_name", name),
                    "confidence": confidence,
                    "status": "already_marked",
                })
                continue
        except Exception:
            pass

        # Log attendance
        try:
            result = (
                supabase.table("attendance")
                .insert({
                    "student_id": student_id,
                    "lecture_id": body.lecture_id,
                    "status": "Present",
                    "method": "AI",
                    "confidence_score": confidence / 100.0,
                    "camera_id": body.camera_id,
                    "marked_at": datetime.utcnow().isoformat() + "Z",
                })
                .execute()
            )

            if result.data:
                attendance_marked.append({
                    "student_id": student_id,
                    "student_name": student.get("full_name", name),
                    "confidence": confidence,
                    "attendance_id": result.data[0]["id"],
                    "status": "marked",
                })
                logger.info("✅ AI attendance: %s → lecture %s (%.1f%%)", name, body.lecture_id, confidence)
        except Exception as exc:
            logger.error("Failed to log attendance for %s: %s", name, exc)

    return {
        "success": True,
        "message": f"Detected {len(detections)} face(s), marked {len([a for a in attendance_marked if a['status'] == 'marked'])} attendance(s)",
        "detections": detections,
        "attendance_marked": attendance_marked,
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: MANUAL ATTENDANCE (existing)
# ══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/api/v1/attendance/manual",
    status_code=status.HTTP_201_CREATED,
    summary="Manual Attendance — Teacher submits roll call",
)
async def mark_manual_attendance(body: ManualAttendanceRequest):
    if not body.records:
        return {"success": True, "message": "No records to update"}

    timestamp = datetime.utcnow().isoformat()
    upsert_data = [
        {
            "lecture_id": body.lecture_id,
            "student_id": item.student_id,
            "status": item.status,
            "method": "Manual",
            "marked_at": timestamp,
        }
        for item in body.records
    ]

    try:
        supabase.table("attendance").upsert(upsert_data, on_conflict="student_id, lecture_id").execute()
        return {"success": True, "message": f"Updated {len(upsert_data)} attendance records"}
    except Exception as exc:
        logger.error("Manual attendance failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to save attendance: {exc}")


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: BIOMETRIC UPLOAD — REAL AI TRAINING (upgraded from simulated)
# ══════════════════════════════════════════════════════════════════════════════

@app.post(
    "/api/v1/students/upload-multiple-biometrics",
    summary="Biometric Enrollment — Train AI model with student photos",
    description=(
        "Receives base64 images from the frontend. "
        "Extracts faces, saves them as training data, and retrains the LBPH model."
    ),
)
async def upload_biometrics(body: BiometricUploadRequest):
    if not body.images:
        raise HTTPException(status_code=400, detail="No images provided")

    logger.info(
        "📸 Received %d images for student %s (%s). Starting real AI training...",
        len(body.images), body.full_name, body.student_id,
    )

    svc = get_face_service()
    result = svc.train_student(body.full_name, body.images)

    if not result["success"]:
        raise HTTPException(status_code=422, detail=result["message"])

    return {
        "success": True,
        "message": result["message"],
        "saved_count": result["saved_count"],
        "model_trained": result["model_trained"],
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: MODEL STATUS & RETRAIN
# ══════════════════════════════════════════════════════════════════════════════

@app.get(
    "/api/v1/model/status",
    summary="Get AI model status and statistics",
)
async def model_status():
    svc = get_face_service()
    return svc.get_stats()


@app.post(
    "/api/v1/students/{student_id}/approve",
    summary="Approve Student Enrollment — Train AI model",
)
async def approve_enrollment(student_id: str):
    """
    Called by the teacher/admin to approve a student's enrollment.
    Triggers AI training on the 5 submitted photos.
    """
    logger.info("👍 Approving enrollment for student: %s", student_id)
    
    # 1. Get student profile
    profile = _get_student_profile(student_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    name = profile.get("full_name", "Student")
    
    # 2. Fetch photos from student_photos table
    try:
        res = (
            supabase.table("student_photos")
            .select("photo_url")
            .eq("student_id", student_id)
            .order("photo_index")
            .execute()
        )
        
        if not res.data:
            raise HTTPException(status_code=400, detail="No enrollment photos found for this student")
            
        if len(res.data) < 5:
            logger.warning("Student %s only has %d photos, but we proceed anyway.", student_id, len(res.data))

        # 3. Download photos from Storage and convert to base64
        images_base64 = []
        for item in res.data:
            url = item["photo_url"]
            # Extract the path after 'student-faces/'
            parts = url.split("student-faces/")
            if len(parts) < 2:
                logger.error("Invalid photo URL: %s", url)
                continue
                
            storage_path = parts[1].split("?")[0] # Remove any query params
            
            try:
                photo_bytes = supabase.storage.from_("student-faces").download(storage_path)
                images_base64.append(base64.b64encode(photo_bytes).decode('utf-8'))
            except Exception as e:
                logger.error("Failed to download %s: %s", storage_path, e)

        if not images_base64:
            raise HTTPException(status_code=500, detail="Failed to retrieve any photos for training")

        # 4. Train AI
        svc = get_face_service()
        train_res = svc.train_student(name, images_base64)
        
        if not train_res["success"]:
            raise HTTPException(status_code=500, detail=f"AI Training failed: {train_res['message']}")

        logger.info("✅ AI Training complete for %s. Savd %d images.", name, train_res.get("saved_count", 0))
        
        return {
            "success": True, 
            "message": f"Approved and trained {name}",
            "trained_count": train_res.get("saved_count", 0)
        }
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Approval failed for %s: %s", student_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post(
    "/api/v1/students/{student_id}/reject",
    summary="Reject Student Enrollment — Delete photos",
)
async def reject_enrollment(student_id: str):
    """
    Called by the teacher/admin to reject a student's enrollment.
    Deletes the submitted photos from storage and database.
    """
    logger.info("👎 Rejecting enrollment for student: %s", student_id)
    
    try:
        # 1. Get photos to find storage paths
        res = (
            supabase.table("student_photos")
            .select("photo_url")
            .eq("student_id", student_id)
            .execute()
        )
        
        # 2. Delete from storage if exist
        if res.data:
            paths = []
            for item in res.data:
                parts = item["photo_url"].split("student-faces/")
                if len(parts) >= 2:
                    paths.append(parts[1].split("?")[0])
            
            if paths:
                try:
                    supabase.storage.from_("student-faces").remove(paths)
                    logger.info("Deleted %d photos from storage for %s", len(paths), student_id)
                except Exception as e:
                    logger.warning("Storage deletion partial failure for %s: %s", student_id, e)

        # 3. Delete from DB table
        supabase.table("student_photos").delete().eq("student_id", student_id).execute()
        
        # Note: We don't delete from profiles here, frontend will update enrollment_status to 'rejected'
        # based on its own logic (or we could do it here too, but frontend handles the profile update).
        
        return {"success": True, "message": "Enrollment rejected and photos deleted"}
        
    except Exception as exc:
        logger.error("Rejection failed for %s: %s", student_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post(
    "/api/v1/model/retrain",
    summary="Force retrain the AI model",
)
async def model_retrain():
    svc = get_face_service()
    result = svc.retrain()
    return result


# ══════════════════════════════════════════════════════════════════════════════
# HEALTH & ROOT
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/health", tags=["Utility"])
async def health_check():
    return {"status": "ok", "service": "attendify-ai-backend", "version": "2.0.0"}


@app.get("/", tags=["Utility"])
async def root():
    return {
        "service": "Attendify AI Backend",
        "version": "2.0.0",
        "docs": "/docs",
        "endpoints": {
            "recognise": "POST /api/v1/attendance/recognise",
            "recognise_frame": "POST /api/v1/attendance/recognise-frame",
            "manual": "POST /api/v1/attendance/manual",
            "biometrics": "POST /api/v1/students/upload-multiple-biometrics",
            "model_status": "GET /api/v1/model/status",
            "model_retrain": "POST /api/v1/model/retrain",
        },
    }


# ── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")

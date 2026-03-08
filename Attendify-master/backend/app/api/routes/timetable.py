"""
Timetable API Routes
Enterprise-grade REST API endpoints for timetable management
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
import warnings
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    import google.generativeai as genai
import json
import io
from sqlalchemy.orm import Session
from typing import List
from app.models.timetable import Teacher, Room, Subject, ClassGroup, TimetableEntry, teacher_subject
from app.schemas.timetable import (
    TeacherCreate, TeacherResponse, RoomCreate, RoomResponse,
    SubjectCreate, SubjectResponse, ClassGroupCreate, ClassGroupResponse,
    TimetableEntryResponse, GenerateRequest, GenerateResponse
)
from app.services.timetable_solver import TimetableSolver
from app.core.database import get_db
from app.api.routes.auth import require_admin
from app.core.logging import logger
from app.core.config import config

router = APIRouter(prefix="/api/timetable", tags=["Timetable"])

# ==================== TEACHER ENDPOINTS ====================

@router.post("/teachers", response_model=TeacherResponse)
def create_teacher(teacher: TeacherCreate, db: Session = Depends(get_db)):
    """Create a new teacher"""
    db_teacher = Teacher(
        name=teacher.name,
        email=teacher.email,
        max_hours_per_day=teacher.max_hours_per_day
    )
    db.add(db_teacher)
    db.commit()
    db.refresh(db_teacher)
    
    # Add subject associations
    if teacher.subject_ids:
        for subj_id in teacher.subject_ids:
            subject = db.query(Subject).filter(Subject.id == subj_id).first()
            if subject:
                db_teacher.subjects.append(subject)
        db.commit()
    
    return db_teacher

@router.get("/teachers", response_model=List[TeacherResponse])
def get_teachers(db: Session = Depends(get_db)):
    """Get all teachers"""
    teachers = db.query(Teacher).all()
    result = []
    for teacher in teachers:
        result.append({
            "id": teacher.id,
            "name": teacher.name,
            "email": teacher.email,
            "max_hours_per_day": teacher.max_hours_per_day,
            "subjects": [{"id": s.id, "name": s.name, "code": s.code} for s in teacher.subjects]
        })
    return result

@router.delete("/teachers/{teacher_id}")
def delete_teacher(teacher_id: int, db: Session = Depends(get_db)):
    """Delete a teacher"""
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(404, "Teacher not found")
    db.delete(teacher)
    db.commit()
    return {"message": "Teacher deleted"}

# ==================== ROOM ENDPOINTS ====================

@router.post("/rooms", response_model=RoomResponse)
def create_room(room: RoomCreate, db: Session = Depends(get_db)):
    """Create a new room"""
    db_room = Room(
        room_number=room.room_number,
        capacity=room.capacity,
        is_lab=room.is_lab,
        room_type=room.room_type
    )
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

@router.get("/rooms", response_model=List[RoomResponse])
def get_rooms(db: Session = Depends(get_db)):
    """Get all rooms"""
    return db.query(Room).all()

@router.delete("/rooms/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db)):
    """Delete a room"""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(404, "Room not found")
    db.delete(room)
    db.commit()
    return {"message": "Room deleted"}

# ==================== SUBJECT ENDPOINTS ====================

@router.post("/subjects", response_model=SubjectResponse)
def create_subject(subject: SubjectCreate, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    """Create a new subject"""
    db_subject = Subject(
        name=subject.name,
        code=subject.code,
        weekly_sessions=subject.weekly_sessions,
        requires_lab=subject.requires_lab
    )
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    
    # Add teacher associations
    if subject.teacher_ids:
        for teacher_id in subject.teacher_ids:
            teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
            if teacher:
                db_subject.teachers.append(teacher)
        db.commit()
    
    return db_subject

@router.get("/subjects", response_model=List[SubjectResponse])
def get_subjects(db: Session = Depends(get_db)):
    """Get all subjects"""
    subjects = db.query(Subject).all()
    result = []
    for subject in subjects:
        result.append({
            "id": subject.id,
            "name": subject.name,
            "code": subject.code,
            "weekly_sessions": subject.weekly_sessions,
            "requires_lab": subject.requires_lab,
            "teachers": [{"id": t.id, "name": t.name} for t in subject.teachers]
        })
    return result

@router.delete("/subjects/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    """Delete a subject"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(404, "Subject not found")
    db.delete(subject)
    db.commit()
    return {"message": "Subject deleted"}

# ==================== CLASS GROUP ENDPOINTS ====================

@router.post("/class-groups", response_model=ClassGroupResponse)
def create_class_group(class_group: ClassGroupCreate, db: Session = Depends(get_db)):
    """Create a new class group"""
    db_class_group = ClassGroup(
        name=class_group.name,
        semester=class_group.semester,
        strength=class_group.strength
    )
    db.add(db_class_group)
    db.commit()
    db.refresh(db_class_group)
    return db_class_group

@router.get("/class-groups", response_model=List[ClassGroupResponse])
def get_class_groups(db: Session = Depends(get_db)):
    """Get all class groups"""
    return db.query(ClassGroup).all()

@router.delete("/class-groups/{class_group_id}")
def delete_class_group(class_group_id: int, db: Session = Depends(get_db)):
    """Delete a class group"""
    class_group = db.query(ClassGroup).filter(ClassGroup.id == class_group_id).first()
    if not class_group:
        raise HTTPException(404, "Class group not found")
    db.delete(class_group)
    db.commit()
    return {"message": "Class group deleted"}

# ==================== TIMETABLE GENERATION ====================

@router.post("/generate", response_model=GenerateResponse)
def generate_timetable(request: GenerateRequest, db: Session = Depends(get_db)):
    """Generate timetable using OR-Tools solver"""
    try:
        solver = TimetableSolver(db)
        success, result = solver.solve()
        
        if success:
            # Save to database
            solver.save_to_database(result["schedule"])
            
            return GenerateResponse(
                status="success",
                message="Timetable generated successfully",
                schedule=result["schedule"],
                stats=result.get("stats")
            )
        else:
            raise HTTPException(400, result.get("error", "Failed to generate timetable"))
    
    except Exception as e:
        raise HTTPException(500, f"Solver error: {str(e)}")

@router.get("/schedule")
def get_schedule(class_group_id: int = None, db: Session = Depends(get_db)):
    """Get the current timetable schedule"""
    query = db.query(TimetableEntry).join(Teacher).join(Room).join(Subject).join(ClassGroup)
    
    if class_group_id:
        query = query.filter(TimetableEntry.class_group_id == class_group_id)
    
    entries = query.all()
    
    result = []
    for entry in entries:
        result.append({
            "id": entry.id,
            "day": entry.day,
            "period": entry.period,
            "teacher_id": entry.teacher_id,
            "teacher_name": entry.teacher.name,
            "room_id": entry.room_id,
            "room_number": entry.room.room_number,
            "subject_id": entry.subject_id,
            "subject_name": entry.subject.name,
            "subject_code": entry.subject.code,
            "class_group_id": entry.class_group_id,
            "class_group_name": entry.class_group.name
        })
    
    return result

@router.delete("/schedule")
def clear_schedule(db: Session = Depends(get_db)):
    """Clear the entire timetable"""
    db.query(TimetableEntry).delete()
    db.commit()
    return {"message": "Schedule cleared"}

@router.get("/resources")
def get_all_resources(db: Session = Depends(get_db)):
    """Get summary of all resources"""
    return {
        "teachers": db.query(Teacher).count(),
        "rooms": db.query(Room).count(),
        "subjects": db.query(Subject).count(),
        "class_groups": db.query(ClassGroup).count(),
        "timetable_entries": db.query(TimetableEntry).count()
    }

# ==================== AI-POWERED TIMETABLE PARSING ====================

@router.post("/upload-raw")
async def upload_raw_timetable(file: UploadFile = File(...)):
    """
    Enterprise AI: Upload a raw college timetable (Image/PDF)
    and parse it into structured JSON using Gemini.
    """
    if not config.GEMINI_API_KEY:
        raise HTTPException(500, "Gemini API Key not configured. Please add it to your .env file.")

    contents = await file.read()
    filename = file.filename
    mime_type = file.content_type

    logger.info(f"STARTING AI ANALYSIS: {filename}")

    try:
        # Initialize Gemini
        genai.configure(api_key=config.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Detailed prompt for structured extraction
        prompt = """
        Analyze this timetable image/document and extract the schedule into a structured JSON format.
        
        Rules:
        1. Identify 'Class/Batch', 'Subject', 'Teacher/Professor', 'Day', 'Time/Period', and 'Room'.
        2. Organize the output as a list of entries.
        3. If it's a grid, map the days and times correctly to each cell.
        4. Return ONLY valid JSON.
        
        Example structure:
        {
          "college_name": "...",
          "schedule": [
            {
              "day": "Monday",
              "time": "09:00 - 10:00",
              "subject": "Mathematics",
              "teacher": "Dr. Smith",
              "room": "101",
              "class_group": "CSE-A"
            }
          ]
        }
        """

        # Prepare for Gemini (Images/PDFs)
        response = model.generate_content([
            prompt,
            {"mime_type": mime_type, "data": contents}
        ])

        # Clean JSON response
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:-3].strip()
        elif raw_text.startswith("```"):
             raw_text = raw_text[3:-3].strip()

        parsed_data = json.loads(raw_text)

        # Log systematic order
        logger.info("SUCCESSFULLY PARSED DATA (SYSTEMATIC JSON):")
        logger.debug(json.dumps(parsed_data, indent=2))
        logger.info(f"Summary: Extracted {len(parsed_data.get('schedule', []))} class slots.")
        
    except Exception as e:
        logger.error(f"CRITICAL AI ERROR: {str(e)}")
        raise HTTPException(500, f"AI Parsing failed: {str(e)}")
    
    finally:
        logger.info("AI Analysis Finished")

    return {
        "status": "success",
        "message": "AI parsing completed and written to terminal",
        "data": parsed_data
    }

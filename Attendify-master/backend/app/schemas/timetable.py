"""
Pydantic Schemas for Timetable API Request/Response Validation
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Teacher Schemas
class TeacherCreate(BaseModel):
    name: str
    email: Optional[str] = None
    max_hours_per_day: int = 6
    subject_ids: List[int] = []

class TeacherResponse(BaseModel):
    id: int
    name: str
    email: Optional[str]
    max_hours_per_day: int
    subjects: List[dict] = []
    
    class Config:
        from_attributes = True

# Room Schemas
class RoomCreate(BaseModel):
    room_number: str
    capacity: int
    is_lab: bool = False
    room_type: str = "Standard"

class RoomResponse(BaseModel):
    id: int
    room_number: str
    capacity: int
    is_lab: bool
    room_type: str
    
    class Config:
        from_attributes = True

# Subject Schemas
class SubjectCreate(BaseModel):
    name: str
    code: str
    weekly_sessions: int
    requires_lab: bool = False
    teacher_ids: List[int] = []

class SubjectResponse(BaseModel):
    id: int
    name: str
    code: str
    weekly_sessions: int
    requires_lab: bool
    teachers: List[dict] = []
    
    class Config:
        from_attributes = True

# ClassGroup Schemas
class ClassGroupCreate(BaseModel):
    name: str
    semester: int
    strength: int

class ClassGroupResponse(BaseModel):
    id: int
    name: str
    semester: int
    strength: int
    
    class Config:
        from_attributes = True

# Timetable Schemas
class TimetableEntryResponse(BaseModel):
    id: int
    day: int
    period: int
    teacher_name: str
    room_number: str
    subject_name: str
    subject_code: str
    class_group_name: str
    
    class Config:
        from_attributes = True

class GenerateRequest(BaseModel):
    class_group_ids: Optional[List[int]] = None  # If None, generate for all

class GenerateResponse(BaseModel):
    status: str
    message: str
    schedule: List[dict] = []
    stats: Optional[dict] = None
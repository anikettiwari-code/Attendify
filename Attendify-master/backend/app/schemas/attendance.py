"""
Pydantic Schemas for Attendance API Request/Response Validation
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Student/Attendance Schemas (existing system)
class StudentRegister(BaseModel):
    name: str
    roll_number: str

class AttendanceResponse(BaseModel):
    name: str
    status: str
    timestamp: datetime

class AttendanceLogResponse(BaseModel):
    id: int
    student_name: Optional[str]
    timestamp: str
    status: str
"""
Timetable Database Models
SQLAlchemy models for timetable generation system
"""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.core.database import Base

# Association table for Teacher-Subject many-to-many relationship
teacher_subject = Table(
    'teacher_subject',
    Base.metadata,
    Column('teacher_id', Integer, ForeignKey('teachers.id')),
    Column('subject_id', Integer, ForeignKey('subjects.id'))
)

class Teacher(Base):
    __tablename__ = 'teachers'
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=True)
    max_hours_per_day: Mapped[int] = mapped_column(Integer, default=6)
    
    # Relationships
    subjects: Mapped[list["Subject"]] = relationship("Subject", secondary=teacher_subject, back_populates="teachers")
    classes: Mapped[list["TimetableEntry"]] = relationship("TimetableEntry", back_populates="teacher")

class Room(Base):
    __tablename__ = 'rooms'
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    room_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    is_lab: Mapped[bool] = mapped_column(Boolean, default=False)
    room_type: Mapped[str] = mapped_column(String, default="Standard")  # Standard, Lab, Auditorium
    
    # Relationships
    classes: Mapped[list["TimetableEntry"]] = relationship("TimetableEntry", back_populates="room")

class Subject(Base):
    __tablename__ = 'subjects'
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    code: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    weekly_sessions: Mapped[int] = mapped_column(Integer, nullable=False)
    requires_lab: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Relationships
    teachers: Mapped[list["Teacher"]] = relationship("Teacher", secondary=teacher_subject, back_populates="subjects")
    classes: Mapped[list["TimetableEntry"]] = relationship("TimetableEntry", back_populates="subject")

class ClassGroup(Base):
    __tablename__ = 'class_groups'
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, nullable=False)  # e.g., "CSE-A", "ECE-B"
    semester: Mapped[int] = mapped_column(Integer, nullable=False)
    strength: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Relationships
    classes: Mapped[list["TimetableEntry"]] = relationship("TimetableEntry", back_populates="class_group")

class TimetableEntry(Base):
    __tablename__ = 'timetable_entries'
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    day: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Monday, 4=Friday
    period: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-7
    
    teacher_id: Mapped[int] = mapped_column(Integer, ForeignKey('teachers.id'), nullable=False)
    room_id: Mapped[int] = mapped_column(Integer, ForeignKey('rooms.id'), nullable=False)
    subject_id: Mapped[int] = mapped_column(Integer, ForeignKey('subjects.id'), nullable=False)
    class_group_id: Mapped[int] = mapped_column(Integer, ForeignKey('class_groups.id'), nullable=False)
    
    # Relationships
    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="classes")
    room: Mapped["Room"] = relationship("Room", back_populates="classes")
    subject: Mapped["Subject"] = relationship("Subject", back_populates="classes")
    class_group: Mapped["ClassGroup"] = relationship("ClassGroup", back_populates="classes")

"""
Main FastAPI Application Entry Point
Enterprise-grade unified system: Attendance + Timetable Generation
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.models.attendance import Student, AttendanceLog, Base
from app.models.session import AttendanceSession  # NEW: Session model
from app.models.timetable import Teacher, Room, Subject, ClassGroup, TimetableEntry, teacher_subject
from app.models.user import User, UserRole
from app.api.routes.timetable import router as timetable_router
from app.api.routes.attendance import router as attendance_router
from app.api.routes.sessions import router as sessions_router  # NEW: Sessions API
from app.api.routes.analytics import router as analytics_router
from app.core.config import config
from app.core.config_thresholds import thresholds  # NEW: Thresholds config
from app.core.database import create_tables, engine, SessionLocal
from app.core.logging import logger
from app.api.routes.auth import get_password_hash
from datetime import datetime, timezone
from sqlalchemy import text
import uvicorn

DEFAULT_FACULTY_NAME = "Dr. John Smith"

# Initialize database
logger.info("Initializing database...")
from app.models.user import Base as UserBase
UserBase.metadata.create_all(bind=engine)
create_tables()
logger.info("Database initialized successfully")

# Ensure users table has required columns (handles older SQLite schemas)
def ensure_user_schema() -> None:
    try:
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(users)"))
            existing_columns = {row[1] for row in result.fetchall()}

            if "password_hash" not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
            if "role" not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20)"))
            if "is_active" not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1"))
            if "created_at" not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN created_at DATETIME"))
            if "full_name" not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR(100)"))
            if "email" not in existing_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(100)"))

            # Backfill defaults for nullable legacy rows
            conn.execute(text("UPDATE users SET is_active = 1 WHERE is_active IS NULL"))
            conn.execute(text("UPDATE users SET role = 'STUDENT' WHERE role IS NULL"))
            conn.execute(text("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))

            # Backfill missing created_at values
            if "created_at" in existing_columns:
                conn.execute(text("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))

            conn.commit()
    except Exception as exc:
        logger.error(f"Failed to ensure user schema: {exc}")

ensure_user_schema()

# Ensure default users exist (dev convenience)
def ensure_default_users():
    db = SessionLocal()
    try:
        defaults = [
            {
                "username": "admin",
                "email": "admin@attendify.com",
                "full_name": "System Administrator",
                "password": "admin123",
                "role": UserRole.ADMIN,
            },
            {
                "username": "faculty1",
                "email": "faculty1@attendify.com",
                "full_name": DEFAULT_FACULTY_NAME,
                "password": "faculty123",
                "role": UserRole.FACULTY,
            },
            {
                "username": "student1",
                "email": "student1@attendify.com",
                "full_name": "Alice Johnson",
                "password": "student123",
                "role": UserRole.STUDENT,
            },
        ]

        for data in defaults:
            existing = db.query(User).filter(User.username == data["username"]).first()
            if existing:
                existing.email = data["email"]
                existing.full_name = data["full_name"]
                existing.password_hash = get_password_hash(data["password"])
                existing.role = data["role"]
                existing.is_active = True
                if existing.created_at is None:
                    existing.created_at = datetime.now(timezone.utc)
                continue
            user = User(
                username=data["username"],
                email=data["email"],
                full_name=data["full_name"],
                password_hash=get_password_hash(data["password"]),
                role=data["role"],
                is_active=True,
                created_at=datetime.now(timezone.utc),
            )
            db.add(user)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error(f"Failed to ensure default users: {exc}")
    finally:
        db.close()

ensure_default_users()

# Create FastAPI app
app = FastAPI(
    title="Attendify - Intelligent Student Attendance Verification System",
    description="Multi-factor attendance verification with face recognition, session management, proxy detection, and liveness checks",
    version="3.0.0"
)

# CORS Configuration (Admin Mode - No restrictions)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from app.api.routes import notices, auth
from app.api.routes import users as users_router
app.include_router(auth.router, prefix="/api")
app.include_router(timetable_router)
app.include_router(attendance_router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(sessions_router, prefix="/api/sessions", tags=["Sessions"])  # Added sessions router
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(notices.router, prefix="/api/notices", tags=["Notices"])
app.include_router(users_router.router, prefix="/api", tags=["Users"])

# ==================== SEEDING & UTILITIES ====================

@app.post("/api/seed")
def seed_database():
    """Seed database with sample data for testing"""
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Teacher).count() > 0:
            return {"message": "Database already seeded"}
        
        # Create Teachers
        teachers = [
            Teacher(name=DEFAULT_FACULTY_NAME, email="john@university.edu", max_hours_per_day=6),
            Teacher(name="Prof. Emily Davis", email="emily@university.edu", max_hours_per_day=5),
            Teacher(name="Dr. Michael Brown", email="michael@university.edu", max_hours_per_day=6),
            Teacher(name="Prof. Sarah Wilson", email="sarah@university.edu", max_hours_per_day=6),
            Teacher(name="Dr. Robert Taylor", email="robert@university.edu", max_hours_per_day=5),
        ]
        db.add_all(teachers)
        db.commit()
        
        # Create Rooms
        rooms = [
            Room(room_number="101", capacity=60, is_lab=False, room_type="Classroom"),
            Room(room_number="102", capacity=60, is_lab=False, room_type="Classroom"),
            Room(room_number="201", capacity=40, is_lab=True, room_type="Computer Lab"),
            Room(room_number="202", capacity=40, is_lab=True, room_type="Computer Lab"),
            Room(room_number="301", capacity=50, is_lab=False, room_type="Classroom"),
        ]
        db.add_all(rooms)
        db.commit()
        
        # Create Subjects
        subjects = [
            Subject(name="Data Structures", code="CS201", weekly_sessions=4, requires_lab=True),
            Subject(name="Database Management", code="CS202", weekly_sessions=3, requires_lab=True),
            Subject(name="Operating Systems", code="CS301", weekly_sessions=4, requires_lab=False),
            Subject(name="Computer Networks", code="CS302", weekly_sessions=3, requires_lab=True),
            Subject(name="Software Engineering", code="CS401", weekly_sessions=3, requires_lab=False),
        ]
        db.add_all(subjects)
        db.commit()
        
        # Assign teachers to subjects
        subjects[0].teachers.extend([teachers[0], teachers[1]])
        subjects[1].teachers.extend([teachers[1], teachers[2]])
        subjects[2].teachers.extend([teachers[2], teachers[3]])
        subjects[3].teachers.extend([teachers[3], teachers[4]])
        subjects[4].teachers.extend([teachers[0], teachers[4]])
        db.commit()
        
        # Create Class Groups
        class_groups = [
            ClassGroup(name="CSE-A", semester=4, strength=60),
            ClassGroup(name="CSE-B", semester=4, strength=60),
        ]
        db.add_all(class_groups)
        db.commit()
        
        return {
            "message": "Database seeded successfully",
            "summary": {
                "teachers": len(teachers),
                "rooms": len(rooms),
                "subjects": len(subjects),
                "class_groups": len(class_groups)
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Seeding failed: {str(e)}")
    finally:
        db.close()

@app.get("/")
def root():
    """API Health Check - Intelligent Attendance Verification System"""
    return {
        "service": "Attendify - Intelligent Attendance Verification",
        "version": "3.0.0",
        "status": "operational",
        "features": [
            "Multi-Factor Face Recognition",
            "Session-Based Attendance",
            "Temporal Multi-Frame Verification",
            "Liveness Detection (Anti-Spoofing)",
            "Proxy Detection",
            "Manual Override",
            "Configurable Thresholds",
            "Enterprise Anomaly Detection",
            "Real-time Analytics Dashboard",
            "Risk Scoring System"
        ],
        "endpoints": {
            "attendance": "/api/attendance/*",
            "sessions": "/api/sessions/*",
            "analytics": "/api/analytics/*",
            "docs": "/docs"
        },
        "thresholds": thresholds.to_dict()
    }

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": "connected"
    }

@app.get("/api/config")
def get_config():
    """Get system configuration"""
    return config.get_config()

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

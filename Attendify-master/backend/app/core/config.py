"""
Enterprise Configuration Management
Centralized configuration for all backend services
"""

import os
from typing import Dict, Any
from dotenv import load_dotenv

# Load .env file
load_dotenv()

class Config:
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///attendance.db")
    DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    AUTH_SECRET = os.getenv("AUTH_SECRET", "change-me-in-prod")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # CORS Settings
    # MUST be specific for allow_credentials=True
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
    ]
    
    # Timetable Generation
    DAYS_PER_WEEK = 5
    PERIODS_PER_DAY = 8
    PERIOD_DURATION = 60  # minutes
    START_TIME = "09:00"
    
    # Solver Configuration
    SOLVER_TIME_LIMIT = 120  # seconds
    
    # File Upload
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

    # Geofencing (Default: College Location)
    # Example: Central Park, NY (Lat: 40.785091, Long: -73.968285)
    COLLEGE_LATITUDE = float(os.getenv("COLLEGE_LATITUDE", "40.785091"))
    COLLEGE_LONGITUDE = float(os.getenv("COLLEGE_LONGITUDE", "-73.968285"))
    GEOFENCE_RADIUS_METERS = float(os.getenv("GEOFENCE_RADIUS_METERS", "500.0"))

    # Biometrics
    FINGERPRINT_MATCH_THRESHOLD = 70.0 # Mock threshold implementation
    FACE_MATCH_DISTANCE_THRESHOLD = 100.0 # Lower is better for LBPH
    FACE_CONFIDENCE_THRESHOLD = 60.0 # Percentage (0-100)
    
    @classmethod
    def get_config(cls) -> Dict[str, Any]:
        return {
            "database_url": cls.DATABASE_URL,
            "cors_origins": cls.CORS_ORIGINS,
            "timetable": {
                "days": cls.DAYS_PER_WEEK,
                "periods": cls.PERIODS_PER_DAY,
                "start_time": cls.START_TIME
            }
        }

config = Config()

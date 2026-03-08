"""
Core Model Factory
Centralized model management and integration with FaceDetector
Enterprise Refactor:
- Proper Dependency Injection for DB Sessions
- Enhanced Accuracy with Preprocessing Integration
- Confidence Score Reporting
"""

import cv2
import numpy as np
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.attendance import Student, AttendanceLog
from app.models.timetable import Teacher, Room, Subject, ClassGroup, TimetableEntry
from app.models.face_model import FaceDetector, DATA_FACE_DIR
from geopy.distance import geodesic
from app.core.config import Config
from app.core.logging import logger

# Initialize global FaceDetector
face_detector = FaceDetector()

class ModelFactory:
    """Centralized model factory for all database operations"""

    @staticmethod
    def is_within_geofence(user_lat: float, user_lon: float) -> bool:
        """Check if user is within the college geofence"""
        # Strict Mode: 0,0 is rejected unless in DEBUG_MODE
        if user_lat == 0 and user_lon == 0:
            if Config.DEBUG_MODE:
                logger.warning("Geofence skipped due to 0,0 coordinates in DEBUG_MODE")
                return True
            logger.warning("Geofence Rejected: Coordinate 0,0 detected (likely GPS error)")
            return False
            
        college_coords = (Config.COLLEGE_LATITUDE, Config.COLLEGE_LONGITUDE)
        user_coords = (user_lat, user_lon)
        
        try:
            distance = geodesic(college_coords, user_coords).meters
            if Config.DEBUG_MODE:
                logger.info(f"Geofence Distance: {distance:.2f}m (Allowed: {Config.GEOFENCE_RADIUS_METERS}m)")
            return distance <= Config.GEOFENCE_RADIUS_METERS
        except ValueError as e:
            logger.error(f"Geofence calculation error: {e}")
            return False

    @staticmethod
    def create_student(name: str, roll_number: str) -> Student:
        """Create a new student object"""
        return Student(
            name=name,
            roll_number=roll_number,
            face_encoding=b"LBPH_FILE_BASED"
        )

    @staticmethod
    def create_attendance_log(student_id: Optional[int], status: str = "Present") -> AttendanceLog:
        """Create attendance log entry"""
        return AttendanceLog(student_id=student_id, status=status)

    @staticmethod
    def register_student(db: Session, name: str, roll_number: str, image_file, fingerprint_file=None) -> dict:
        """Register a new student with Face & Biometric data"""
        try:
            # Check if roll number exists
            # ... (existing check)
            existing = db.query(Student).filter(Student.roll_number == roll_number).first()
            if existing:
                return {"success": False, "message": "Roll number already exists"}

            # Create student object
            student = Student(
                name=name,
                roll_number=roll_number,
                face_encoding=b"LBPH_FILE_BASED"
            )
            
            # Save fingerprint if provided
            if fingerprint_file:
                fp_bytes = fingerprint_file.file.read()
                if len(fp_bytes) > 0:
                    student.fingerprint_template = fp_bytes
            
            db.add(student)
            db.flush()

            # Process Image
            image_bytes = image_file.file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR) 
            
            if img is None:
                raise ValueError("Could not decode image")

            # Validate face presence
            faces = face_detector.detect_faces(img)
            if not faces:
                raise ValueError("No face detected - ensure good lighting")

            # Save with ID for robust labeling
            safe_name = "".join(x for x in name if x.isalnum() or x in (' ', '-', '_')).strip()
            filename = f"{student.id}_{safe_name}.jpg"
            save_path = DATA_FACE_DIR / filename
            
            # Use largest face for saving consistency
            x, y, w, h = max(faces, key=lambda r: r[2]*r[3])
            # Save the original image (detector handles preprocessing)
            cv2.imwrite(str(save_path), img)
            
            # Retrain model
            face_detector.train_model()
            
            db.commit()
            return {"success": True, "message": "Student registered successfully", "student_id": student.id}

        except Exception as e:
            db.rollback()
            return {"success": False, "message": str(e)}

    @staticmethod
    def mark_attendance(db: Session, image_file=None, fingerprint_file=None, latitude: float = 0.0, longitude: float = 0.0) -> dict:
        """
        Mark attendance using Face Recognition OR Fingerprint
        Fallback logic: If Face Confidence < 60, prompt for Fingerprint.
        """
        try:
            # 1. Geofence Check
            if not ModelFactory.is_within_geofence(latitude, longitude):
                return {
                    "success": False,
                    "name": "Unknown",
                    "status": "Rejected",
                    "message": "Geofence Violation: You are outside the allowed campus area."
                }
            
            # 2. Fingerprint Check (Priority if provided)
            if fingerprint_file:
                fp_bytes = fingerprint_file.file.read()
                # Simple 1:N Exact Match (Simulation)
                # In real scenario: Use SourceAFIS or libfprint
                candidates = db.query(Student).filter(Student.fingerprint_template.isnot(None)).all()
                for student in candidates:
                    if student.fingerprint_template == fp_bytes:
                        log = ModelFactory.create_attendance_log(student.id, "Present")
                        db.add(log)
                        db.commit()
                        return {
                            "success": True,
                            "name": student.name,
                            "status": "Present",
                            "confidence": "100.0% (Biometric)",
                            "message": f"Verified by Fingerprint: Welcome {student.name}!"
                        }
                return {"success": False, "message": "Fingerprint not recognized"}

            # 3. Face Recognition
            if not image_file:
                return {"success": False, "message": "No face image provided"}

            image_bytes = image_file.file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                 return {"success": False, "message": "Invalid image format"}

            faces = face_detector.detect_faces(img)
            if not faces:
                 return {"success": False, "message": "No face detected"}

            # Use the largest face
            largest_face = max(faces, key=lambda rect: rect[2] * rect[3])
            
            # Recognize with Confidence
            name_label, distance, confidence_score = face_detector.recognize_face(img, largest_face)
            
            # Logic: If Confidence < 60%, require Biometric (Fingerprint)
            # confidence_score is already 0-100 logic (calculated in face_model.py)
            is_low_confidence = confidence_score < Config.FACE_CONFIDENCE_THRESHOLD
            
            # Match Logic
            # LBPH Distance: Lower is better. 0 = Perfect. < 50 = Very Good. < 100 = Acceptable.
            # Confidence: Higher is better (calculated from distance).
            
            ACCEPTED = (distance < Config.FACE_MATCH_DISTANCE_THRESHOLD) 
            
            if name_label != "Unknown" and ACCEPTED:
                # Fallback Logic: If Confidence < 60%, require Biometric (Fingerprint)
                if is_low_confidence:
                    logger.info(f"Low Face Confidence ({confidence_score:.1f}%). Triggering Fingerprint Fallback.")
                    return {
                        "success": False,
                        "require_biometric": True,
                        "name": "Uncertain",
                        "status": "Verify",
                        "confidence": f"{confidence_score:.1f}%",
                        "message": f"Low certainty ({confidence_score:.1f}%). Please scan your fingerprint."
                    }

                if name_label.isdigit():
                    student_id = int(name_label)
                    student = db.query(Student).filter(Student.id == student_id).first()
                else:
                     student = db.query(Student).filter(Student.name == name_label).first()

                if student:
                    log = ModelFactory.create_attendance_log(student.id, "Present")
                    db.add(log)
                    db.commit()
                    return {
                        "success": True,
                        "name": student.name,
                        "status": "Present",
                        "confidence": f"{confidence_score:.1f}%",
                        "message": f"Welcome, {student.name}!"
                    }
            
            return {
                "success": False,
                "name": "Unknown",
                "status": "Unknown",
                "confidence": f"{confidence_score:.1f}%",
                "message": f"Unknown User (Confidence: {confidence_score:.1f}%)"
            }

        except Exception as e:
            db.rollback()
            return {"success": False, "message": f"Error: {str(e)}"}

    @staticmethod
    def get_students(db: Session) -> List[dict]:
        """Get all registered students"""
        students = db.query(Student).all()
        return [{
            "id": s.id,
            "name": s.name,
            "roll_number": s.roll_number
        } for s in students]

    @staticmethod
    def get_attendance_logs(db: Session) -> List[dict]:
        """Get all attendance logs"""
        logs = db.query(AttendanceLog).join(Student, AttendanceLog.student_id == Student.id, isouter=True).order_by(AttendanceLog.timestamp.desc()).all()
        result = []
        for log in logs:
            result.append({
                "id": log.id,
                "student_name": log.student.name if log.student else "Unknown",
                "roll_number": log.student.roll_number if log.student else "-",
                "timestamp": log.timestamp.isoformat(),
                "status": log.status
            })
        return result

# Export all models and factory
__all__ = [
    'ModelFactory',
    'Student',
    'AttendanceLog',
    'Teacher',
    'Room',
    'Subject',
    'ClassGroup',
    'TimetableEntry'
]

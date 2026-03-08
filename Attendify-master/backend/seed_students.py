"""
Seed database with sample students and biometric data
"""
from app.core.database import SessionLocal, engine
from app.models.attendance import Student, Base
from app.models.session import AttendanceSession
from app.models.timetable import ClassGroup
from app.models.user import User
from pathlib import Path
import os

def seed_students():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Define sample students
        students_data = [
            {
                "name": "Alice Johnson",
                "roll_number": "CS2024001",
                "fingerprint_id": "student1_thumb",
                "id_card_code": "CARD-001",
                "photo_folder_path": "_data-face/alice_johnson"
            },
            {
                "name": "Bob Williams",
                "roll_number": "CS2024002",
                "fingerprint_id": "student2_thumb",
                "id_card_code": "CARD-002",
                "photo_folder_path": "_data-face/bob_williams"
            },
            {
                "name": "Charlie Brown",
                "roll_number": "CS2024003",
                "fingerprint_id": "student3_thumb",
                "id_card_code": "CARD-003",
                "photo_folder_path": "_data-face/charlie_brown"
            }
        ]

        print("🌱 Seeding students with simulated biometric data...")

        for data in students_data:
            student = db.query(Student).filter(Student.roll_number == data["roll_number"]).first()
            if student:
                print(f"   Student exists: {data['name']}")
                # Update biometric data if missing
                if not student.fingerprint_id:
                    student.fingerprint_id = data['fingerprint_id']
                    print(f"   Updated fingerprint ID for {data['name']}")
                if not student.id_card_code:
                    student.id_card_code = data['id_card_code']
                    print(f"   Updated ID Card code for {data['name']}")
            else:
                # Create dummy folder
                os.makedirs(f"models/{data['photo_folder_path']}", exist_ok=True)
                
                new_student = Student(
                    name=data["name"],
                    roll_number=data["roll_number"],
                    photo_folder_path=data["photo_folder_path"],
                    fingerprint_id=data["fingerprint_id"],
                    id_card_code=data["id_card_code"]
                )
                db.add(new_student)
                print(f"   Created student: {data['name']}")

        db.commit()
        print("✅ Student seeding completed successfully!")
        print("   Test Data:")
        for s in students_data:
             print(f"   - {s['name']}: FP='{s['fingerprint_id']}', Card='{s['id_card_code']}'")

    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_students()

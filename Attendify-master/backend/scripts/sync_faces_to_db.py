
import sys
import os
from pathlib import Path
from sqlalchemy.orm import Session

# Add backend to path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BACKEND_DIR))

from app.core.database import SessionLocal, create_tables, engine
from app.models.attendance import Student

DATA_FACE_DIR = BACKEND_DIR / "models" / "_data-face"

def sync_db():
    print("[INFO] Initializing Database...")
    create_tables() # Create new tables
    
    db = SessionLocal()
    
    print(f"[INFO] Scanning {DATA_FACE_DIR}...")
    if not DATA_FACE_DIR.exists():
        print("[WARN] No data folder found.")
        return

    count = 0
    for folder in DATA_FACE_DIR.iterdir():
        if not folder.is_dir():
            continue
            
        # Skip unknown, organized_temp, etc.
        name = folder.name
        if name.startswith("unknown") or name == "organized_temp":
            continue
            
        # Prepare Student Data
        clean_name = name.replace("_", " ").title()
        
        # Check existence
        existing = db.query(Student).filter(Student.name == clean_name).first()
        if existing:
            print(f"[SKIP] {clean_name} already in DB")
            continue
            
        # Create Student
        # We assign a dummy Roll No based on name hash or random if missing
        # In real app, you'd want manual registration. Here we auto-sync.
        roll_no = f"AUTO-{clean_name[:3].upper()}-{len(name)}"
        
        student = Student(
            name=clean_name,
            roll_number=roll_no,
            photo_folder_path=str(folder),
            fingerprint_id=f"hash_{name}_123", # Simulated
            id_card_code=f"card_{name}_001"    # Simulated
        )
        db.add(student)
        count += 1
        print(f"[ADD] {clean_name} (Roll: {roll_no})")
        
    db.commit()
    print(f"[SUCCESS] Synced {count} students to Database.")
    db.close()

if __name__ == "__main__":
    sync_db()

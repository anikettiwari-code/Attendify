"""
Initialize test users for authentication testing
"""

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.user import User, UserRole, Base
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_users():
    """Create test users for authentication"""
    # Create users table
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Define test users
        users_data = [
            {
                "username": "admin",
                "email": "admin@attendify.com",
                "full_name": "System Administrator",
                "password": "admin123",
                "role": UserRole.ADMIN
            },
            {
                "username": "faculty1",
                "email": "faculty1@attendify.com",
                "full_name": "Dr. John Smith",
                "password": "faculty123",
                "role": UserRole.FACULTY
            },
            {
                "username": "student1",
                "email": "student1@attendify.com",
                "full_name": "Alice Johnson",
                "password": "student123",
                "role": UserRole.STUDENT
            },
            {
                "username": "student2",
                "email": "student2@attendify.com",
                "full_name": "Bob Williams",
                "password": "student123",
                "role": UserRole.STUDENT
            }
        ]

        print("🔄 Initializing default users...")

        for data in users_data:
            user = db.query(User).filter(User.username == data["username"]).first()
            hashed = pwd_context.hash(data["password"])
            if user:
                # Update existing user
                user.password_hash = hashed
                user.email = data["email"]
                user.full_name = data["full_name"]
                user.role = data["role"]
                user.is_active = True
                print(f"   Updated user: {data['username']}")
            else:
                # Create new user
                new_user = User(
                    username=data["username"],
                    email=data["email"],
                    full_name=data["full_name"],
                    password_hash=hashed,
                    role=data["role"],
                    is_active=True
                )
                db.add(new_user)
                print(f"   Created user: {data['username']}")

        db.commit()
        
        print("✅ Default users enforced successfully:")
        print("   Admin: admin / admin123")
        print("   Faculty: faculty1 / faculty123")
        print("   Student: student1 / student123")
        print("   Student: student2 / student123")
        
    except Exception as e:
        print(f"❌ Error creating users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_users()

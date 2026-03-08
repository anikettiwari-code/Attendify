"""
Database Configuration
Enterprise-grade database setup with connection pooling and error handling
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool
from app.core.config import config

class Base(DeclarativeBase):
    pass

# Database URL
primary_url = config.DATABASE_URL
fallback_url = "sqlite:///attendance.db"

def create_db_engine(url):
    return create_engine(
        url,
        poolclass=StaticPool if "sqlite" in url else None,
        pool_pre_ping=True,
        echo=config.DEBUG_MODE,
        connect_args={"check_same_thread": False} if "sqlite" in url else {}
    )

try:
    print("[INFO] Attempting to connect to database...")
    engine = create_db_engine(primary_url)
    
    # Test connection
    with engine.connect() as connection:
        print("[INFO] Successfully connected to primary database")
        
except Exception as e:
    print(f"[WARNING] Failed to connect to primary database: {e}")
    print(f"[INFO] Falling back to SQLite: {fallback_url}")
    engine = create_db_engine(fallback_url)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

def reset_database():
    """Drop and recreate all tables (for testing)"""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
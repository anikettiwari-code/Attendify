"""
Quick System Validation Script
Tests all critical components for competition readiness
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_imports():
    """Test all critical module imports"""
    print("🔍 Testing Module Imports...")
    try:
        from app.services.anomaly_service import analyze_anomalies, detect_anomalies, RiskLevel, AnomalyResult
        from app.api.routes.analytics import router as analytics_router
        from app.models.attendance import AttendanceLog, Student
        from app.models.session import AttendanceSession
        from app.core.database import engine, SessionLocal
        print("✅ All modules import successfully")
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_database():
    """Test database connection and ensure tables exist"""
    print("\n🔍 Testing Database Connection...")
    try:
        from app.core.database import engine, create_tables
        from app.models.user import Base as UserBase
        from app.models.attendance import Base as AttendanceBase
        from app.models.timetable import Base as TimetableBase
        from app.models.session import Base as SessionBase
        from sqlalchemy import text
        
        # Ensure all tables are created (order matters for foreign keys)
        TimetableBase.metadata.create_all(bind=engine)  # Create class_groups first
        SessionBase.metadata.create_all(bind=engine)
        AttendanceBase.metadata.create_all(bind=engine)
        UserBase.metadata.create_all(bind=engine)
        create_tables()
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            assert result.fetchone()[0] == 1
        print("✅ Database connection successful (all tables initialized)")
        return True
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_anomaly_service():
    """Test anomaly detection service"""
    print("\n🔍 Testing Anomaly Detection Service...")
    try:
        from app.services.anomaly_service import analyze_anomalies, RiskLevel, AnomalyResult
        from app.models.attendance import AttendanceLog, Student
        from app.core.database import SessionLocal
        from datetime import datetime, timezone
        
        # Create test log WITHOUT session_id to avoid table lookup
        test_log = AttendanceLog(
            student_id=None,  # No student ID to avoid lookups
            session_id=None,  # No session ID to avoid table lookup
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0",
            timestamp=datetime.now(timezone.utc),
            status="Present",
            confidence=95.0
        )
        
        # Test with database session
        db = SessionLocal()
        try:
            result = analyze_anomalies(db, test_log, lat=12.9716, lon=77.5946)
            
            assert hasattr(result, 'is_anomaly')
            assert hasattr(result, 'risk_score')
            assert hasattr(result, 'risk_level')
            assert isinstance(result, AnomalyResult)
            assert isinstance(result.risk_level, RiskLevel)
            
            print(f"✅ Anomaly service working (Risk: {result.risk_level.value}, Score: {result.risk_score})")
            return True
        finally:
            db.close()
    except Exception as e:
        print(f"❌ Anomaly service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
        return False

def test_models():
    """Test database models"""
    print("\n🔍 Testing Database Models...")
    try:
        from app.models.attendance import AttendanceLog, Student
        from app.models.session import AttendanceSession
        
        # Check critical fields exist on the model class
        assert hasattr(AttendanceLog, 'risk_score'), "AttendanceLog missing risk_score field"
        assert hasattr(AttendanceLog, 'user_agent'), "AttendanceLog missing user_agent field"
        assert hasattr(AttendanceLog, 'is_anomaly'), "AttendanceLog missing is_anomaly field"
        assert hasattr(AttendanceLog, 'anomaly_reason'), "AttendanceLog missing anomaly_reason field"
        
        print("✅ Database models validated (all enterprise fields present)")
        return True
    except AssertionError as e:
        print(f"❌ Model test failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Model test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_analytics():
    """Test analytics configuration"""
    print("\n🔍 Testing Analytics Configuration...")
    try:
        from app.api.routes.analytics import router
        
        # Check router has expected endpoints
        route_paths = [route.path for route in router.routes]
        expected_endpoints = ['/dashboard', '/stats', '/anomalies']
        
        for endpoint in expected_endpoints:
            assert any(endpoint in path for path in route_paths), f"Missing endpoint: {endpoint}"
        
        print(f"✅ Analytics router configured ({len(router.routes)} routes)")
        return True
    except Exception as e:
        print(f"❌ Analytics test failed: {e}")
        return False

def main():
    """Run all validation tests"""
    print("=" * 60)
    print("🏆 ATTENDIFY - COMPETITION READINESS VALIDATION")
    print("=" * 60)
    
    tests = [
        ("Module Imports", test_imports),
        ("Database Connection", test_database),
        ("Anomaly Detection", test_anomaly_service),
        ("Database Models", test_models),
        ("Analytics API", test_analytics),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"❌ {name} crashed: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 60)
    print("📊 VALIDATION SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print("=" * 60)
    print(f"Score: {passed}/{total} ({passed/total*100:.0f}%)")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED - COMPETITION READY! 🎉")
        return 0
    else:
        print("⚠️ SOME TESTS FAILED - REVIEW REQUIRED")
        return 1

if __name__ == "__main__":
    exit(main())

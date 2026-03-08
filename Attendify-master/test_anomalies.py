"""
Test Script to Demonstrate Anomaly Detection
Run this to create test attendance records with various anomalies
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import SessionLocal
from app.models.attendance import AttendanceLog, Student
from app.models.session import AttendanceSession
from app.services.anomaly_service import analyze_anomalies
from datetime import datetime, timezone, timedelta

def create_test_anomalies():
    """Create test attendance records with different anomaly types"""
    db = SessionLocal()
    
    try:
        print("🔬 Creating Test Anomalies for Demonstration\n")
        print("=" * 60)
        
        # Test 1: Off-Campus Location Anomaly
        print("\n1️⃣ Testing OFF-CAMPUS LOCATION Anomaly")
        log1 = AttendanceLog(
            student_id=1,
            session_id=None,
            ip_address="203.192.1.100",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            timestamp=datetime.now(timezone.utc),
            status="Present",
            confidence=85.5,
            latitude=13.5,  # Far from campus (12.9716)
            longitude=78.2   # Far from campus (77.5946)
        )
        result1 = analyze_anomalies(db, log1, lat=13.5, lon=78.2)
        print(f"   Risk Level: {result1.risk_level.value}")
        print(f"   Risk Score: {result1.risk_score}")
        print(f"   Reasons: {result1.reasons}")
        
        # Test 2: Multiple Failed Attempts (Brute Force)
        print("\n2️⃣ Testing BRUTE FORCE Anomaly (Multiple Failed Attempts)")
        # Create 6 failed attempts in last 5 minutes
        base_time = datetime.now(timezone.utc)
        for i in range(6):
            failed_log = AttendanceLog(
                student_id=2,
                session_id=None,
                ip_address="192.168.1.50",
                user_agent="Mozilla/5.0",
                timestamp=base_time - timedelta(minutes=i),
                status="Rejected - Low Confidence",
                confidence=25.0
            )
            db.add(failed_log)
        db.commit()
        
        # Now create a successful attempt - should trigger anomaly
        log2 = AttendanceLog(
            student_id=2,
            session_id=None,
            ip_address="192.168.1.50",
            user_agent="Mozilla/5.0",
            timestamp=datetime.now(timezone.utc),
            status="Present",
            confidence=82.0
        )
        result2 = analyze_anomalies(db, log2, lat=12.9716, lon=77.5946)
        print(f"   Risk Level: {result2.risk_level.value}")
        print(f"   Risk Score: {result2.risk_score}")
        print(f"   Reasons: {result2.reasons}")
        
        # Test 3: Multi-Device Anomaly
        print("\n3️⃣ Testing MULTI-DEVICE Anomaly")
        # Create attendance from 4 different IPs in last hour
        for i, ip in enumerate(["10.0.0.1", "10.0.0.2", "10.0.0.3", "10.0.0.4"]):
            device_log = AttendanceLog(
                student_id=3,
                session_id=None,
                ip_address=ip,
                user_agent=f"Device-{i}",
                timestamp=datetime.now(timezone.utc) - timedelta(minutes=i*10),
                status="Present",
                confidence=80.0
            )
            db.add(device_log)
        db.commit()
        
        log3 = AttendanceLog(
            student_id=3,
            session_id=None,
            ip_address="10.0.0.5",
            user_agent="Device-5",
            timestamp=datetime.now(timezone.utc),
            status="Present",
            confidence=85.0
        )
        result3 = analyze_anomalies(db, log3, lat=12.9716, lon=77.5946)
        print(f"   Risk Level: {result3.risk_level.value}")
        print(f"   Risk Score: {result3.risk_score}")
        print(f"   Reasons: {result3.reasons}")
        
        # Test 4: Impossible Travel
        print("\n4️⃣ Testing IMPOSSIBLE TRAVEL Anomaly")
        # Create attendance 100km away just 1 minute ago
        travel_log1 = AttendanceLog(
            student_id=4,
            session_id=None,
            ip_address="192.168.1.60",
            user_agent="Mozilla/5.0",
            timestamp=datetime.now(timezone.utc) - timedelta(minutes=1),
            status="Present",
            confidence=82.0,
            latitude=12.9716,
            longitude=77.5946
        )
        db.add(travel_log1)
        db.commit()
        db.refresh(travel_log1)  # Refresh to get stored timestamp
        
        # Now try from very far location (requires >150km/h speed)
        log4 = AttendanceLog(
            student_id=4,
            session_id=None,
            ip_address="192.168.1.60",
            user_agent="Mozilla/5.0",
            timestamp=datetime.now(timezone.utc),
            status="Present",
            confidence=85.0,
            latitude=14.5,  # ~180km away
            longitude=78.9
        )
        db.add(log4)
        db.commit()
        db.refresh(log4)  # Refresh to get stored timestamp
        
        result4 = analyze_anomalies(db, log4, lat=14.5, lon=78.9)
        print(f"   Risk Level: {result4.risk_level.value}")
        print(f"   Risk Score: {result4.risk_score}")
        print(f"   Reasons: {result4.reasons}")
        
        print("\n" + "=" * 60)
        print("✅ Test anomalies created successfully!")
        print("\n📊 View them at:")
        print("   • Analytics Dashboard: http://localhost:3000/analytics")
        print("   • API: http://127.0.0.1:8000/api/analytics/anomalies")
        print("   • Security Report: http://127.0.0.1:8000/api/analytics/reports/security")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_anomalies()

"""View anomalies in the database"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import SessionLocal
from app.models.attendance import AttendanceLog
from app.models.session import AttendanceSession  # Import to resolve relationship

db = SessionLocal()

try:
    anomalies = db.query(AttendanceLog).filter(
        AttendanceLog.risk_score.isnot(None),
        AttendanceLog.risk_score > 0
    ).order_by(AttendanceLog.timestamp.desc()).all()
    
    print(f'\n🔍 FOUND {len(anomalies)} ANOMALIES IN DATABASE:\n')
    print('='*80)
    
    for i, a in enumerate(anomalies[:10]):
        print(f'\n📊 Anomaly #{i+1}:')
        print(f'  Student ID: {a.student_id}')
        print(f'  Risk Score: {a.risk_score}')
        print(f'  Timestamp: {a.timestamp}')
        print(f'  IP: {a.ip_address}')
        print(f'  Status: {a.status}')
        print(f'  Confidence: {a.confidence}%')
        print(f'  Is Anomaly: {a.is_anomaly}')
        print(f'  Reason: {a.anomaly_reason}')
    
    print('\n' + '='*80)
    print(f'\n✅ Total anomalies: {len(anomalies)}')
    print('\n📍 To view in analytics dashboard:')
    print('   1. Start frontend: cd frontend && npm run dev')
    print('   2. Navigate to: http://localhost:3000/analytics')
    
finally:
    db.close()

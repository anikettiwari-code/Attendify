"""
Enterprise Attendance Management System - README
=================================================

🎓 **Intelligent Attendance Management for Smart Campuses**

## Overview
A cutting-edge attendance tracking system featuring multi-factor biometric verification,
real-time anomaly detection, and comprehensive analytics for educational institutions.

## 🚀 Key Features

### Core Functionality
✅ **Multi-Factor Verification**
- Face Recognition (LBPH + OpenCV)
- Fingerprint Authentication (Simulated)
- ID Card Validation
- Configurable confidence thresholds

✅ **Anti-Spoofing & Proxy Detection**
- Liveness detection (blink detection)
- Multi-frame temporal verification
- Multiple face detection
- Identity consistency checks

✅ **Enterprise Anomaly Detection**
- Geolocation analysis (off-campus detection)
- Temporal analysis (session timing violations)
- Impossible travel detection (behavioral patterns)
- Repeated failed attempts tracking
- Device fingerprinting & multi-device abuse detection
- Risk scoring (LOW/MEDIUM/HIGH/CRITICAL)

✅ **Session Management**
- Class-based attendance sessions
- Session lifecycle (PENDING/ACTIVE/ENDED)
- Duplicate prevenession
- Faculty-controlled session management

✅ **Real-Time Analytics Dashboard**
- Live security monitoring
- Attendance trends & statistics
- Risk assessment & critical alertstion per s
- Comprehensive reporting

## 🏗️ Architecture

### Backend (FastAPI + Python)
```
backend/
├── app/
│   ├── api/routes/         # REST API endpoints
│   │   ├── attendance.py   # Attendance marking & registration
│   │   ├── analytics.py    # Enterprise analytics & reports
│   │   ├── sessions.py     # Session management
│   │   └── auth.py         # Authentication & authorization
│   ├── services/           # Business logic
│   │   ├── face_service.py          # Face recognition
│   │   ├── anomaly_service.py       # Anomaly detection engine
│   │   ├── verification_service.py  # Multi-frame verification
│   │   └── liveness_service.py      # Anti-spoofing
│   ├── models/             # Database models
│   │   ├── attendance.py   # Student & AttendanceLog models
│   │   ├── session.py      # Session management models
│   │   └── user.py         # User authentication models
│   └── core/               # Configuration & utilities
```

### Frontend (React + TypeScript)
```
frontend/
├── src/
│   ├── pages/
│   │   ├── MarkAttendancePage.tsx    # Attendance marking UI
│   │   ├── AnalyticsDashboard.tsx    # Enterprise dashboard
│   │   ├── RegisterPage.tsx          # Student registration
│   │   └── AuthPage.tsx              # Login/Signup
│   ├── services/          # API clients
│   ├── components/        # Reusable UI components
│   └── utils/             # Helpers
```

## 🔧 Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- Webcam (for face recognition)
- Modern browser

### Backend Setup
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 📊 API Endpoints

### Attendance
- `POST /api/attendance/mark` - Mark attendance (single frame)
- `POST /api/attendance/mark-multi` - Mark attendance (multi-frame)
- `POST /api/attendance/register` - Register new student
- `GET /api/attendance/logs` - Get attendance logs

### Analytics
- `GET /api/analytics/dashboard` - Complete dashboard data
- `GET /api/analytics/stats` - Statistics overview
- `GET /api/analytics/anomalies` - Recent anomalies
- `GET /api/analytics/reports/security` - Security audit report
- `GET /api/analytics/trends` - Time-series trends

### Sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions` - List sessions
- `PUT /api/sessions/{id}/start` - Start session
- `PUT /api/sessions/{id}/end` - End session

## 🔐 Security Features

### Data Privacy
- IP addresses masked in frontend display
- Location data encrypted
- Biometric consent required
- GDPR-compliant data handling

### Anomaly Detection
- **Location Anomaly**: Attendance >500m from campus flagged
- **Time Anomaly**: Late/early submissions detected
- **Impossible Travel**: Speed >150km/h between check-ins flagged
- **Brute Force**: 5+ failed attempts in 5min triggers alert
- **Device Abuse**: Multiple IPs per student monitored

### Risk Scoring
- Weighted risk calculation (0-100)
- Automatic severity classification
- Actionable recommendations
- Real-time alerting

## 📈 Competition Features

### Innovation
- ✨ **AI-Powered Anomaly Detection** - ML-based pattern recognition
- 🎯 **Risk-Based Authentication** - Adaptive security levels
- 📊 **Real-Time Dashboard** - Live monitoring & alerts
- 🔄 **Multi-Modal Biometrics** - Face + Fingerprint + ID Card

### Scalability
- Database indexing for performance
- Optimized queries (JOIN + eager loading)
- Async processing
- Connection pooling

### User Experience
- Glassmorphism UI design
- Real-time feedback
- Auto-refresh dashboard (30s)
- Responsive design (mobile-ready)

## 🧪 Testing

### Default Users
- **Admin**: `admin` / `admin123`
- **Faculty**: `faculty1` / `faculty123`
- **Student**: `student1` / `student123`

### Test Workflow
1. Login as faculty
2. Create a session
3. Start the session
4. Mark attendance (face/fingerprint/manual)
5. View analytics dashboard
6. Check anomaly reports

## 🏆 Hackathon Highlights

### Problem Statement Compliance
✅ Multi-factor verification (Face + Fingerprint + ID)
✅ Proxy detection & prevention
✅ Lighting/quality variation handling
✅ Identity consistency validation
✅ Secure storage & dashboards
✅ **Bonus**: Liveness detection ✨
✅ **Bonus**: Advanced anomaly detection ✨
✅ **Bonus**: Session integration ✨

### Technical Excellence
- Clean architecture (separation of concerns)
- Type safety (TypeScript + Python type hints)
- Error handling & logging
- Database migrations support
- RESTful API design
- Comprehensive documentation

### Real-World Applicability
- Privacy-aware design
- Configurable thresholds
- Manual override support
- Audit trail
- Multi-tenancy ready

## 📝 Configuration

### Anomaly Detection Thresholds
```python
# backend/app/services/anomaly_service.py
CAMPUS_LAT = 12.9716  # Campus latitude
CAMPUS_LON = 77.5946  # Campus longitude
MAX_DISTANCE_METERS = 500  # Off-campus threshold
IMPOSSIBLE_SPEED_MPS = 42  # ~150 km/h
MAX_FAILED_ATTEMPTS = 5  # Brute force threshold
```

### Confidence Thresholds
```python
# backend/app/core/config_thresholds.py
HIGH_CONFIDENCE = 85
MEDIUM_CONFIDENCE = 70
LOW_CONFIDENCE = 60
```

## 🚀 Deployment

### Production Checklist
- [ ] Update campus coordinates
- [ ] Configure SMTP for alerts
- [ ] Set up PostgreSQL/MySQL
- [ ] Enable HTTPS
- [ ] Configure CORS origins
- [ ] Set JWT secret
- [ ] Enable backup strategy
- [ ] Set up monitoring

## 📞 Support

For issues or questions:
- Check logs in `backend/logs/`
- Review error messages in browser console
- Verify database connections
- Ensure webcam permissions granted

## 🎯 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Advanced liveness (3D depth sensing)
- [ ] Integration with LMS platforms
- [ ] Automated report generation (PDF)
- [ ] SMS/Email notifications
- [ ] Multi-language support
- [ ] Blockchain attendance verification
- [ ] AI-powered attendance predictions

---

**Built for Modern Smart Campuses** 🎓
*Secure • Scalable • Intelligent*

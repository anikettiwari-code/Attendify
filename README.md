<div align="center">

# Attendify

### AI-Powered Facial Recognition Attendance System

[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=flat-square&logo=react&logoColor=white)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.9-5C3EE8?style=flat-square&logo=opencv&logoColor=white)](https://opencv.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org/)

&mdash;

A full-stack mobile application that automates student attendance tracking using real-time face recognition, eliminating manual roll calls and reducing proxy attendance in educational institutions.

[Getting Started](#-getting-started) · [Architecture](#-system-architecture) · [API Reference](#-api-endpoints) · [AI Pipeline](#-ai--face-recognition-pipeline)

</div>

---

## 📌 Overview

**Attendify** replaces manual attendance systems with an intelligent, camera-based solution. Teachers can mark attendance through a single camera scan of the classroom, while students get real-time visibility into their attendance records.

The system combines a **React Native** mobile app for cross-platform access, a **FastAPI** backend for AI inference, **Supabase** for authentication & database, and **OpenCV's LBPH** algorithm for face recognition — achieving reliable identification under varying lighting conditions.

### Key Capabilities

| Feature | Description |
|:---|:---|
| **Face Recognition Attendance** | Automated attendance via YOLOv8 + LBPH face detection and recognition |
| **Anti-Spoofing** | MediaPipe FaceMesh blink detection prevents photo-based attacks |
| **Role-Based Access** | Separate student and teacher interfaces with Supabase Auth |
| **Lecture Scheduling** | Teachers create and manage weekly lecture timetables |
| **Enrollment Workflow** | Students submit face photos → teacher reviews and approves → AI model trains |
| **Real-time Notifications** | Push notifications for attendance alerts and enrollment status |
| **CCTV Integration** | Standalone Python script for continuous monitoring via webcam/CCTV feeds |
| **Anomaly Detection** | Flags suspicious attendance patterns for review |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────┐ │
│  │  Student App  │  │  Teacher App  │  │   CCTV Script       │ │
│  │  (React Native│  │  (React Native│  │   (Python/OpenCV)   │ │
│  │   + Expo)     │  │   + Expo)     │  │                     │ │
│  └───────┬───────┘  └───────┬───────┘  └──────────┬──────────┘ │
└──────────┼──────────────────┼─────────────────────┼────────────┘
           │                  │                     │
           ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                                │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              FastAPI Backend (Python)                 │      │
│  │  /api/v1/attendance/recognise-frame   (AI inference)  │      │
│  │  /api/v1/attendance/recognise         (log detection)  │      │
│  │  /api/v1/attendance/manual            (roll call)     │      │
│  │  /api/v1/students/upload-biometrics   (enrollment)    │      │
│  │  /api/v1/model/retrain               (model update)   │      │
│  └──────────────────┬───────────────────────────────────┘      │
└─────────────────────┼──────────────────────────────────────────┘
                      │
      ┌───────────────┼───────────────┐
      ▼               ▼               ▼
┌───────────┐  ┌─────────────┐  ┌──────────────┐
│ Supabase  │  │  AI Engine  │  │  Storage     │
│ PostgreSQL│  │  YOLO+LBPH  │  │  (Supabase)  │
│ + RLS     │  │  FaceDetect │  │  Face Photos │
└───────────┘  └─────────────┘  └──────────────┘
```

---

## 📂 Project Structure

```
attendify/
│
├── app/                            # Mobile app screens (Expo Router)
│   ├── (auth)/                     #   Login & Registration
│   ├── (student)/                  #   Student dashboard, attendance, profile
│   └── (teacher)/                  #   Teacher dashboard, scheduling, students
│
├── components/                     # Shared UI components
├── context/AuthContext.tsx          # Authentication state provider
├── hooks/                          # Custom React hooks (useAttendance, useRecognition, etc.)
├── services/                       # Supabase service layer (attendance, enrollment, lectures)
├── lib/                            # Core utilities (Supabase client, API, theme, constants)
├── types/                          # TypeScript type definitions
│
├── backend/                        # FastAPI server
│   ├── main.py                     #   API entry point (620 LOC)
│   ├── ai/                         #   AI modules
│   │   ├── face_detector.py        #     YOLO + LBPH detection & recognition engine
│   │   ├── face_service.py         #     Service wrapper for face operations
│   │   └── liveness.py             #     MediaPipe blink detection
│   └── requirements.txt
│
├── model-training/                 # ML training pipeline
│   ├── models/face_model.py        #   Core LBPH model logic
│   ├── scripts/                    #   Capture, train, demo utilities
│   ├── services/                   #   Anomaly, liveness, verification services
│   ├── tests/                      #   Validation scripts
│   ├── pretrained/yolov8n.pt       #   YOLOv8 Nano weights
│   └── docs/                       #   Guides & test reports
│
├── supabase/migrations/            # SQL schema migrations (7 files)
│
├── capture_and_train.py            # Standalone CLI: capture faces + train model
├── cctv_recognition.py             # Standalone CLI: real-time CCTV recognition
├── normalize_training_data.py      # Image normalization utility
│
├── .env                            # Environment variables
├── app.json                        # Expo configuration
├── package.json                    # Node.js dependencies
└── eas.json                        # EAS Build configuration
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|:---|:---|:---|
| Node.js | ≥ 18.x | React Native / Expo runtime |
| Python | ≥ 3.10 | Backend server & AI inference |
| pip | Latest | Python package manager |
| Git | Latest | Version control |
| Webcam | — | Face capture & recognition |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/anikettiwari-code/Attendify.git
cd Attendify

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..

# 4. (Optional) Install model-training dependencies
cd model-training
pip install -r requirements.txt
cd ..
```

### Environment Configuration

The project uses a `.env` file at the root for all configuration:

```env
EXPO_PUBLIC_SUPABASE_URL=<supabase-project-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
EXPO_PUBLIC_SUPABASE_SERVICE_KEY=<supabase-service-key>
```

### Running the Application

**Terminal 1 — Mobile App (Expo)**
```bash
npx expo start
```

**Terminal 2 — Backend API Server**
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The app runs on:
- 📱 **Mobile**: Scan the QR code with Expo Go
- 🌐 **Web**: `http://localhost:8081`
- 📡 **API Docs**: `http://localhost:8000/docs` (Swagger UI)

---

## 🤖 AI / Face Recognition Pipeline

### Processing Flow

```
Camera Frame
     │
     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  YOLOv8 Nano │ ──▶ │ Haar Cascade │ ──▶ │  LBPH Recognizer │
│  (Person     │     │ (Face        │     │  (Identity       │
│   Detection) │     │  Extraction) │     │   Matching)      │
└──────────────┘     └──────────────┘     └────────┬─────────┘
                                                    │
                                          ┌─────────▼──────────┐
                                          │  Confidence Check   │
                                          │  (≥ 50% threshold)  │
                                          └─────────┬──────────┘
                                                    │
                                          ┌─────────▼──────────┐
                                          │  Log Attendance     │
                                          │  (Supabase INSERT)  │
                                          └────────────────────┘
```

### Model Components

| Component | Technology | Details |
|:---|:---|:---|
| Person Detection | YOLOv8 Nano | Lightweight model for real-time person localization |
| Face Detection | Haar Cascades (OpenCV) | `frontalface_default` + `frontalface_alt2` dual cascade |
| Face Recognition | LBPH (OpenCV) | Local Binary Patterns Histogram with configurable radius/neighbors |
| Anti-Spoofing | MediaPipe FaceMesh | 468-landmark mesh for blink detection (EAR threshold) |
| Preprocessing | CLAHE + Histogram Eq. | Contrast Limited Adaptive Histogram Equalization for lighting invariance |

### Preprocessing Pipeline

Each captured face goes through a consistent 5-step pipeline before recognition:

1. **Resize** → Normalize to 150×150 px (backend) or 100×100 px (standalone)
2. **Denoise** → `cv2.fastNlMeansDenoising` removes sensor noise
3. **CLAHE** → Adaptive contrast enhancement (handles backlit rooms)
4. **Gamma Correction** → Brightness normalization (γ = 1.2)
5. **Sharpening** → Laplacian kernel for edge enhancement

### Face Capture & Training

```bash
# Interactive CLI tool
python capture_and_train.py

# Options:
#   1 → Capture new face (50 images via webcam)
#   2 → Train LBPH model
#   3 → Capture + Train (batch mode)
#   4 → Verify model (live test)
#   5 → Clear all data

# CCTV continuous recognition
python cctv_recognition.py --camera 0
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/v1/attendance/recognise-frame` | Send base64 image → AI detects & identifies faces → logs attendance |
| `POST` | `/api/v1/attendance/recognise` | Log a pre-identified student (from CCTV engine) |
| `POST` | `/api/v1/attendance/manual` | Teacher submits manual roll call |
| `POST` | `/api/v1/students/upload-multiple-biometrics` | Upload face photos for AI training |
| `POST` | `/api/v1/students/{id}/approve` | Approve enrollment → triggers model training |
| `POST` | `/api/v1/students/{id}/reject` | Reject enrollment → deletes photos |
| `POST` | `/api/v1/model/retrain` | Force full model retraining |
| `GET`  | `/api/v1/model/status` | Get model statistics (persons, image counts) |
| `GET`  | `/health` | Health check |

Full interactive documentation available at `/docs` (Swagger UI) when the server is running.

---

## 🗄 Database Schema

```sql
-- Core tables with Row Level Security (RLS)

profiles        (id, full_name, email, role, roll_no, department, class_id, avatar_url)
classes         (id, name, department, student_count)
lectures        (id, teacher_id, class_id, subject, lecture_date, start_time, end_time, room_no)
attendance      (id, student_id, lecture_id, status, method, confidence_score, camera_id, marked_at)
student_photos  (id, student_id, photo_url, photo_index)
notifications   (id, user_id, title, body, type, read, urgent)
```

### Security

- All tables protected with **Row Level Security (RLS)** policies
- Students can only view their own attendance records
- Teachers can only manage their own lectures and students
- Service role key used server-side for AI-driven attendance logging

---

## 🛠 Tech Stack

<table>
<tr><td><b>Layer</b></td><td><b>Technology</b></td></tr>
<tr><td>Mobile App</td><td>React Native 0.81 · Expo 54 · TypeScript · Expo Router</td></tr>
<tr><td>State Management</td><td>React Context API · Redux Toolkit</td></tr>
<tr><td>UI/UX</td><td>Inter Font Family · Lucide Icons · Moti Animations</td></tr>
<tr><td>Backend API</td><td>FastAPI · Uvicorn · Pydantic</td></tr>
<tr><td>Database</td><td>Supabase (PostgreSQL) · Row Level Security</td></tr>
<tr><td>Authentication</td><td>Supabase Auth · JWT Sessions</td></tr>
<tr><td>AI / Computer Vision</td><td>OpenCV 4.9 · LBPH · YOLOv8 Nano · MediaPipe</td></tr>
<tr><td>Build & Deploy</td><td>EAS Build · Netlify (web)</td></tr>
</table>

---

## 📱 App Screens

| Screen | Role | Description |
|:---|:---|:---|
| Login / Register | All | Email-based authentication with role selection |
| Student Dashboard | Student | Attendance summary, recent lectures, today's schedule |
| Student Attendance | Student | Detailed attendance history per subject |
| Student Profile | Student | Face enrollment (5 photos), edit profile |
| Teacher Dashboard | Teacher | Class overview, attendance statistics |
| Teacher Schedule | Teacher | Create and manage weekly lecture timetable |
| Teacher Students | Teacher | Approve/reject enrollments, view student list |
| Teacher Attendance | Teacher | Mark attendance (manual or AI camera scan) |
| Notifications | All | Real-time alerts for attendance and enrollment events |

---

## 📋 SQL Migrations

The database schema is version-controlled through sequential migration files:

| Migration | Purpose |
|:---|:---|
| `20250214000000_init_schema.sql` | Core tables, RLS policies, auth trigger |
| `20250214000001_update_trigger.sql` | Updated user creation trigger |
| `20250214000002_storage_setup.sql` | Supabase Storage bucket for face photos |
| `20250215000000_notifications_setup.sql` | Notifications table and policies |
| `20250215000001_add_urgent_to_notifications.sql` | Urgent flag for critical alerts |
| `20250215000002_seed_mock_data.sql` | Sample data for testing |
| `20250223000000_enrollment_status.sql` | Enrollment status workflow |

---

## 👥 Contributors

- **Aniket Tiwari** — Full-Stack Development · AI/ML Integration

---

## 📄 License

This project was developed for academic purposes as part of a college project submission.

---

<div align="center">
<sub>Built with ❤️ using React Native, FastAPI, Supabase & OpenCV</sub>
</div>
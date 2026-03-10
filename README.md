<![CDATA[# 🎓 Attendify — AI-Powered Attendance Management System

<p align="center">
  <img src="https://img.shields.io/badge/React%20Native-v0.81-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Expo-v54-000020?logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenCV-Face%20Recognition-5C3EE8?logo=opencv&logoColor=white" />
</p>

**Attendify** is a smart, AI-driven attendance management system that combines **face recognition** with a modern **mobile-first application**. Designed for educational institutions, it automates student attendance using live camera feeds (CCTV/webcam) and LBPH face recognition, while providing teachers and students with an intuitive dashboard experience.

---

## ✨ Features

### 📱 Mobile Application (React Native + Expo)
- **Role-based Authentication** — Separate interfaces for students and teachers via Supabase Auth
- **Student Dashboard** — View attendance records, enrollment status, and notifications
- **Teacher Dashboard** — Manage classes, schedule lectures, approve student enrollments, and view analytics
- **Real-time Notifications** — Push notification support for attendance alerts and approvals
- **Responsive Design** — Works on Android, iOS, and Web platforms

### 🤖 AI / Face Recognition (Python + OpenCV)
- **LBPH Face Recognition** — Local Binary Patterns Histogram for robust face matching
- **YOLOv8 + Haar Cascade Detection** — Multi-model face detection for maximum reliability
- **Liveness Detection** — MediaPipe FaceMesh-based blink detection to prevent spoofing
- **CCTV Live Recognition** — Real-time face recognition from webcam/CCTV feeds
- **Automated Capture & Training** — Interactive CLI tool to capture face images and train the model
- **Anomaly Detection** — Flags suspicious attendance patterns

### 🗄️ Backend (FastAPI + Supabase)
- **FastAPI Server** — REST API for face recognition, enrollment, and attendance management
- **Supabase Database** — PostgreSQL with Row Level Security (RLS) for data protection
- **Service Layer Architecture** — Modular services for attendance, enrollment, lectures, and notifications
- **SQL Migrations** — Version-controlled database schema with migration files

---

## 📂 Project Structure

```
attendify/
├── app/                          # React Native screens (Expo Router)
│   ├── (auth)/                   # Authentication screens (login, register)
│   ├── (student)/                # Student portal screens
│   └── (teacher)/                # Teacher portal screens
├── components/                   # Reusable UI components
│   ├── attendance/               # Attendance-related components
│   ├── charts/                   # Analytics charts
│   └── ui/                       # Common UI widgets
├── context/                      # React Context providers
│   └── AuthContext.tsx            # Authentication state management
├── hooks/                        # Custom React hooks
│   ├── useAttendance.ts          # Attendance data hooks
│   ├── useEnrollment.ts          # Enrollment logic
│   ├── useLectures.ts            # Lecture scheduling hooks
│   └── useRecognition.ts         # Face recognition integration
├── services/                     # API service layer
│   ├── approvalService.ts        # Student approval workflows
│   ├── attendanceService.ts      # Attendance recording
│   ├── enrollmentService.ts      # Student enrollment
│   ├── lectureService.ts         # Lecture management
│   └── recognitionService.ts     # Face recognition API calls
├── lib/                          # Core utilities
│   ├── supabase.ts               # Supabase client configuration
│   ├── api.ts                    # HTTP API client
│   ├── constants.ts              # App constants
│   └── theme.ts                  # Design tokens
├── backend/                      # FastAPI backend server
│   ├── main.py                   # FastAPI application entry point
│   ├── ai/                       # AI modules
│   │   ├── face_detector.py      # YOLO + LBPH face detection & recognition
│   │   ├── face_service.py       # Face service layer
│   │   └── liveness.py           # Liveness detection (blink detection)
│   └── requirements.txt          # Python dependencies
├── model-training/               # ML model training & data
│   ├── models/                   # Trained model files
│   │   ├── face_model.py         # Core model training logic
│   │   ├── lbph_model.yml        # Trained LBPH model weights
│   │   └── labels.pickle         # Label-to-name mappings
│   ├── training-data/            # Face images for training
│   │   ├── ani/                  # 50 face images — Ani
│   │   └── sagar_t/              # 50 face images — Sagar T
│   ├── scripts/                  # Utility scripts
│   │   ├── capture_faces.py      # Face capture utility
│   │   ├── train_faces.py        # Model training script
│   │   └── demo_webcam.py        # Live demo kiosk
│   ├── services/                 # AI service modules
│   ├── tests/                    # Validation & test scripts
│   ├── docs/                     # Documentation & guides
│   ├── pretrained/               # YOLOv8 pretrained weights
│   └── requirements.txt          # ML Python dependencies
├── supabase/                     # Database configuration
│   └── migrations/               # SQL migration files
│       ├── 20250214000000_init_schema.sql
│       ├── 20250214000001_update_trigger.sql
│       ├── 20250214000002_storage_setup.sql
│       ├── 20250215000000_notifications_setup.sql
│       └── 20250223000000_enrollment_status.sql
├── capture_and_train.py          # Standalone face capture + training CLI
├── cctv_recognition.py           # CCTV live recognition script
├── normalize_training_data.py    # Training data normalization utility
├── .env                          # Environment variables (Supabase keys)
├── app.json                      # Expo configuration
├── package.json                  # Node.js dependencies
└── README.md                     # This file
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ and **npm**
- **Python** 3.10+
- **Expo CLI** (`npm install -g expo-cli`)
- A webcam (for face recognition features)

### 1. Clone the Repository

```bash
git clone https://github.com/anikettiwari-code/Attendify.git
cd Attendify
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Python Dependencies

```bash
# Backend server
cd backend
pip install -r requirements.txt
cd ..

# Model training (optional)
cd model-training
pip install -r requirements.txt
cd ..
```

### 4. Configure Environment Variables

The `.env` file is included in the repository with the Supabase project keys:

```env
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
EXPO_PUBLIC_SUPABASE_SERVICE_KEY=<your-service-key>
```

### 5. Run the Application

```bash
# Start the Expo development server
npx expo start

# In a separate terminal — start the FastAPI backend
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 🧠 AI Face Recognition

### How it works

1. **Capture** — Use `capture_and_train.py` to capture 50 face images per student via webcam.
2. **Train** — The LBPH (Local Binary Patterns Histogram) model is trained on the preprocessed face images.
3. **Recognize** — The trained model runs on live camera/CCTV feeds for real-time attendance.
4. **Verify** — A built-in verification mode tests the model's accuracy live.

### Quick Commands

```bash
# Interactive capture + train tool
python capture_and_train.py

# CCTV live recognition
python cctv_recognition.py

# Normalize training data (resize, clean)
python normalize_training_data.py
```

### Model Architecture

| Component         | Technology                        | Purpose                      |
|-------------------|-----------------------------------|------------------------------|
| Face Detection    | YOLOv8 Nano + Haar Cascades      | Locate faces in frames       |
| Face Recognition  | LBPH (OpenCV)                    | Match faces to identities    |
| Liveness Detection| MediaPipe FaceMesh               | Blink detection anti-spoof   |
| Preprocessing     | CLAHE + Histogram Equalization   | Handle varying lighting      |

### Training Data

The `model-training/training-data/` directory contains face images organized by student name:
- Each student has ~50 face images captured via webcam
- Images are 100×100 pixels, saved as JPEG
- Current trained students: **Ani**, **Sagar T**

---

## 🗃️ Database Schema

The Supabase PostgreSQL database includes:

| Table           | Description                                    |
|-----------------|------------------------------------------------|
| `students`      | Student profiles with enrollment status        |
| `teachers`      | Teacher profiles                               |
| `classes`       | Class/division definitions                     |
| `lectures`      | Scheduled lecture slots                        |
| `attendance`    | Attendance records with timestamps             |
| `notifications` | Push notification records                      |
| `enrollments`   | Student enrollment requests and approvals      |

All tables are protected with **Row Level Security (RLS)** policies.

---

## 🛠️ Tech Stack

| Layer            | Technology                                              |
|------------------|--------------------------------------------------------|
| **Frontend**     | React Native 0.81, Expo 54, TypeScript                 |
| **Navigation**   | Expo Router (file-based routing)                       |
| **State**        | React Context + Redux Toolkit                          |
| **Backend API**  | FastAPI (Python)                                       |
| **Database**     | Supabase (PostgreSQL)                                  |
| **Auth**         | Supabase Authentication                                |
| **AI/ML**        | OpenCV, LBPH, YOLOv8, MediaPipe                       |
| **Build**        | EAS Build (Expo Application Services)                  |

---

## 📸 Screenshots

*Screenshots of the application will be added here.*

---

## 👥 Team

- **Aniket Tiwari** — Full-stack Development, AI/ML Integration

---

## 📄 License

This project is developed for educational purposes as part of a college project.

---

## 📝 Notes

- The `.env` file with API keys is included intentionally for project submission and demonstration.
- The model cache (`model-training/model-cache/`) is excluded from the repository due to large file sizes (~12 GB). Retrain the model locally after cloning.
- The `Attendify-master/` directory contains the original reference codebase.
- Training data images in `model-training/training-data/` are included for model reproducibility.
]]>
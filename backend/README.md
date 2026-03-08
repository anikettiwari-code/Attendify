# Attendify AI Backend

This is the FastAPI-based backend for the Attendify AI-Powered Attendance Management System.

## Features
- **AI Recognition Endpoint**: Receives face recognition results from the Recognition Engine.
- **Deduplication**: Ensures a student is only marked present once per lecture.
- **Confidence Threshold**: Validates recognition confidence before marking attendance.
- **Supabase Integration**: Direct integration with Supabase PostgreSQL for data persistence.

## Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Variables**:
   Ensure your `.env` file in the root directory contains:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

3. **Run the Backend**:
   ```bash
   python main.py
   ```

## Face Recognition Simulation

To simulate the Face Recognition Engine (CCTV feed) calling the API:
```bash
python recognizer_simulation.py
```

## API Endpoints

- `POST /api/v1/attendance/recognise`: Log a recognised student.
  - Required Body: `student_id`, `lecture_id`, `confidence_score`, `frame_timestamp`, `camera_id`.

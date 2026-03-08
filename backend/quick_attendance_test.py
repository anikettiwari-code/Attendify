import requests
from datetime import datetime

API_URL = "http://localhost:8000/api/v1/attendance/recognise"

payload = {
    "student_id": "00000000-0000-0000-0000-000000000002", # Test Student
    "lecture_id": "00000000-0000-0000-0000-000000000004", # AI & Machine Learning
    "confidence_score": 0.95,
    "frame_timestamp": datetime.utcnow().isoformat() + "Z",
    "camera_id": "TEST-CAM"
}

try:
    print(f"Sending request to {API_URL}...")
    res = requests.post(API_URL, json=payload)
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"Error: {e}")

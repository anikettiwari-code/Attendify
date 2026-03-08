import os
import requests
import json
import time
import random
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Configuration
API_URL = "http://localhost:8000/api/v1"
SUPABASE_URL = os.getenv("EXPO_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def simulate_engine():
    print("🚀 Starting AI Face Recognition Engine Simulation...")
    print(f"📡 Backend URL: {API_URL}")
    
    # 1. Fetch Students (Step ② - Fetch enrolled faces)
    try:
        response = supabase.table("profiles").select("id, full_name").eq("role", "student").execute()
        students = response.data
        
        if not students:
            print("❌ No students found in database. Create students first.")
            return

        print(f"📚 Loaded {len(students)} enrolled students.")

        # Fetch an active lecture
        res_lec = supabase.table("lectures").select("id, subject").limit(1).execute()
        if not res_lec.data:
            print("❌ No lectures found. Create a lecture first.")
            return
        
        lecture = res_lec.data[0]
        print(f"🎯 Monitoring Lecture: {lecture['subject']} (ID: {lecture['id']})")

        # 2. Continuous Monitoring Loop (Step ① & ②)
        while True:
            # Simulate processing frames at ~2 FPS (Principle 3.2)
            time.sleep(2)
            
            # Randomly "detect" a student
            if random.random() > 0.3: # 70% chance to detect someone
                student = random.choice(students)
                confidence = random.uniform(0.55, 0.98)
                
                print(f"👤 Detected: {student['full_name']} | Confidence: {confidence:.2%}")
                
                # 3. Call Recognition Endpoint (Step ③)
                payload = {
                    "student_id": student['id'],
                    "lecture_id": lecture['id'],
                    "confidence_score": confidence,
                    "frame_timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "camera_id": "CAM-ROOM-101"
                }

                try:
                    res = requests.post(f"{API_URL}/attendance/recognise", json=payload)
                    if res.status_code == 201:
                        print(f"✅ SUCCESS: {res.json()['message']}")
                    elif res.status_code == 409:
                        print(f"ℹ️ INFO: {res.json()['detail']}")
                    elif res.status_code == 422:
                        print(f"⚠️ WARNING: {res.json()['detail']}")
                    else:
                        print(f"❌ ERROR: {res.status_code} - {res.text}")
                except Exception as e:
                    print(f"❌ API Connection Failed: {e}. Is the backend running?")
            else:
                print("⌛ Scanning... No faces detected.")

    except Exception as e:
        print(f"💥 Error: {e}")

if __name__ == "__main__":
    import datetime
    simulate_engine()

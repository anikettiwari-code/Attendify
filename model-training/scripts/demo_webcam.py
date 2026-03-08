import cv2
import requests
import time
from datetime import datetime

# Configuration
API_URL = "http://localhost:8000/api/attendance/mark"
REGISTER_URL = "http://localhost:8000/api/attendance/register"

def register_student(name, roll_no, fingerprint_id, id_card_code, image_path):
    print(f"[INFO] Registering {name}...")
    with open(image_path, "rb") as f:
        files = {"file": f}
        data = {
            "name": name,
            "roll_number": roll_no,
            "fingerprint_id": fingerprint_id,
            "id_card_code": id_card_code
        }
        res = requests.post(REGISTER_URL, data=data, files=files)
        print(res.json())

def run_attendance_kiosk():
    print("="*50)
    print("ATTENDIFY KIOSK - INTELLIGENT ATTENDANCE")
    print("="*50)
    print("Controls:")
    print("  SPACE - Mark Attendance (Face Recognition)")
    print("  F     - Mark + Fingerprint Simulation")
    print("  I     - Mark + ID Card Simulation")
    print("  N     - Simulate No Face (Biometric Fallback)")
    print("  M     - Simulate Multiple Faces (Biometric Fallback)")
    print("  Q     - Quit")
    print()
    print("Biometric Behavior:")
    print("  - Face confidence >= 60%: Accept immediately")
    print("  - Face confidence 40-60%: Require fingerprint")
    print("  - Face confidence < 40%: Require fingerprint")
    print("  - No face detected: Require fingerprint")
    print("  - Multiple faces: Require fingerprint")
    
    cap = cv2.VideoCapture(0)
    
    # Simulation Data
    sim_fingerprint = "hash_ash_123"
    sim_id_card = "card_ash_001"
    
    # UI State
    last_status = ""
    last_status_color = (0, 255, 0)
    status_timer = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        # Draw Status Overlay
        if time.time() - status_timer < 3.0: # Show for 3 seconds
            cv2.rectangle(frame, (0, 0), (640, 40), last_status_color, -1)
            cv2.putText(frame, last_status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        else:
            # Helper Text
            cv2.putText(frame, "SPACE: Mark | F: Fingerprint | I: ID Card", (10, 470), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

        cv2.imshow("Attendify Kiosk", frame)
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('q'):
            break
        elif key == 32 or key == ord('f') or key == ord('i'):
            # Trigger Verification
            print("\n[ACTION] Capturing & Verifying...")
            
            # Loading indicator
            last_status = "Verifying..."
            last_status_color = (255, 165, 0)
            status_timer = time.time()
            
            # Encode frame
            _, img_encoded = cv2.imencode('.jpg', frame)
            files = {"file": img_encoded.tobytes()}
            
            data = {}
            if key == ord('f'):
                print(" -> Simulating Fingerprint Scan")
                data["fingerprint_data"] = sim_fingerprint
            if key == ord('i'):
                print(" -> Simulating ID Card Scan")
                data["id_card_scan"] = sim_id_card
                # Also send claimed ID to test 1:1 match if needed
                # data["student_id"] = "A001" 
            
            try:
                start = time.time()
                res = requests.post(API_URL, files=files, data=data)
                duration = time.time() - start
                
                if res.status_code == 200:
                    result = res.json()
                    name = result.get('student', 'Unknown')
                    st_text = result['status']
                    
                    print(f"✅ Result: {st_text} ({name})")
                    
                    if "Proxy Suspected" in st_text:
                        last_status = f"ALERT: {st_text}"
                        last_status_color = (0, 0, 255) # Red
                    elif "Verified" in st_text:
                        last_status = f"SUCCESS: {name} Marked Present"
                        last_status_color = (0, 200, 0) # Green
                    else:
                        last_status = f"{st_text}"
                        last_status_color = (0, 165, 255) # Orange
                        
                    status_timer = time.time()
                else:
                    print(f"❌ Error: {res.text}")
                    last_status = "Error: See Console"
                    last_status_color = (0, 0, 255)
                    status_timer = time.time()
                    
            except Exception as e:
                print(f"❌ Connection Failed: {e}")
                last_status = "Connection Failed"
                last_status_color = (0, 0, 255)
                status_timer = time.time()
                
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    # Optional: Register logic if needed
    # register_student("Ash", "A001", "hash_ash_123", "card_ash_001", "path/to/img.jpg")
    run_attendance_kiosk()

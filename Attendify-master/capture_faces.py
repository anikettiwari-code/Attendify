"""
Easy Webcam Face Capture for Training
Captures faces from webcam and saves them for training
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

import cv2
import numpy as np
from pathlib import Path
from datetime import datetime

# Setup paths
DATA_FACE_DIR = Path(__file__).parent / "backend" / "app" / "models" / "_data-face"
DATA_FACE_DIR.mkdir(parents=True, exist_ok=True)

print("=" * 80)
print("📸 ENTERPRISE FACE CAPTURE SYSTEM")
print("=" * 80)

# Get person name
print("\n👤 Enter the person's name (e.g., John Doe):")
person_name = input("> ").strip()

if not person_name:
    print("❌ Name cannot be empty!")
    sys.exit(1)

# Create folder
folder_name = person_name.lower().replace(" ", "_")
folder_name = ''.join(c for c in folder_name if c.isalnum() or c == '_')
person_folder = DATA_FACE_DIR / folder_name
person_folder.mkdir(parents=True, exist_ok=True)

print(f"\n📁 Saving to: {person_folder}")
print(f"\n📷 Opening webcam...")

# Open camera
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
if not cap.isOpened():
    cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Cannot open camera!")
    sys.exit(1)

# Set high resolution
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

# Load face detector
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

captured = 0
target = 30  # Capture 30 images for good training

print(f"\n🎯 Goal: Capture {target} face images")
print("\n📋 Instructions:")
print("   • Face the camera directly")
print("   • Move slightly left/right")
print("   • Try different expressions")
print("   • Change distance from camera")
print("   • Press SPACE to capture")
print("   • Press ESC to finish early")
print("   • Press Q to quit")

cv2.namedWindow(f'Capture: {person_name}', cv2.WINDOW_NORMAL)
cv2.resizeWindow(f'Capture: {person_name}', 1000, 750)

print(f"\n✅ Camera ready! Start capturing...\n")

while captured < target:
    ret, frame = cap.read()
    if not ret:
        break
    
    # Detect faces
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Apply preprocessing for better detection
    gray = cv2.fastNlMeansDenoising(gray, None, h=10)
    clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    
    faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(100, 100))
    
    # Draw rectangles and status
    display = frame.copy()
    
    for (x, y, w, h) in faces:
        # Green rectangle for face
        cv2.rectangle(display, (x, y), (x+w, y+h), (0, 255, 0), 3)
        cv2.putText(display, f"Face Detected", (x, y-10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    
    # Status overlay
    progress = f"{captured}/{target} captured"
    cv2.rectangle(display, (10, 10), (400, 120), (0, 0, 0), -1)
    cv2.putText(display, progress, (20, 40), 
               cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    cv2.putText(display, "SPACE: Capture | ESC: Done | Q: Quit", (20, 70), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
    
    if len(faces) > 0:
        cv2.putText(display, f"{len(faces)} face(s) in frame", (20, 100), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 1)
    else:
        cv2.putText(display, "No face detected!", (20, 100), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 1)
    
    cv2.imshow(f'Capture: {person_name}', display)
    
    key = cv2.waitKey(1) & 0xFF
    
    if key == ord(' ') and len(faces) > 0:  # Space to capture
        # Save the face
        for i, (x, y, w, h) in enumerate(faces):
            face_img = frame[y:y+h, x:x+w]
            
            # Get next number
            existing = list(person_folder.glob("*.jpg"))
            next_num = max([int(f.stem) for f in existing if f.stem.isdigit()] + [0]) + 1
            
            filename = person_folder / f"{next_num}.jpg"
            cv2.imwrite(str(filename), face_img)
            captured += 1
            print(f"   ✅ Captured {captured}/{target}: {filename.name}")
            
            if captured >= target:
                break
    
    elif key == 27:  # ESC
        print(f"\n⏭️ Finishing early with {captured} images...")
        break
    
    elif key == ord('q'):
        print(f"\n❌ Cancelled!")
        cap.release()
        cv2.destroyAllWindows()
        sys.exit(0)

cap.release()
cv2.destroyAllWindows()

print(f"\n" + "=" * 80)
print(f"✅ CAPTURE COMPLETE!")
print(f"=" * 80)
print(f"\n📊 Summary:")
print(f"   • Person: {person_name}")
print(f"   • Images captured: {captured}")
print(f"   • Saved to: {person_folder}")

if captured >= 10:
    print(f"\n✅ Sufficient images for training!")
    print(f"\n🎓 Next step: Run training script")
    print(f"   python train_faces.py")
else:
    print(f"\n⚠️ Warning: Only {captured} images captured")
    print(f"   Recommended: At least 15-20 images for best accuracy")
    print(f"   Run this script again to add more images")

print()

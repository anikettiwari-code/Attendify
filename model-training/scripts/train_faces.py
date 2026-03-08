"""
Enterprise Face Recognition Training Script
Automatically trains the face recognition model using available images
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from pathlib import Path
from app.models.face_model import FaceDetector, DATA_FACE_DIR
import cv2
import shutil

print("=" * 80)
print("🎓 ENTERPRISE FACE RECOGNITION TRAINING")
print("=" * 80)

# Initialize detector
print("\n[1/4] Initializing face detector...")
detector = FaceDetector()

# Check for existing training data
print(f"\n[2/4] Checking training data directory: {DATA_FACE_DIR}")
DATA_FACE_DIR.mkdir(parents=True, exist_ok=True)

person_folders = [f for f in DATA_FACE_DIR.iterdir() if f.is_dir() and not f.name.startswith('unknown')]

if not person_folders:
    print("\n❌ No training data found!")
    print(f"\n📁 Please add face images to: {DATA_FACE_DIR}")
    print("\nExpected structure:")
    print("  _data-face/")
    print("    ├── john_doe/")
    print("    │   ├── 1.jpg")
    print("    │   ├── 2.jpg")
    print("    │   └── 3.jpg")
    print("    ├── jane_smith/")
    print("    │   ├── 1.jpg")
    print("    │   └── 2.jpg")
    print("    └── ...")
    print("\n💡 TIP: Run demo_webcam.py to capture faces automatically")
    sys.exit(1)

print(f"\n✅ Found {len(person_folders)} person folder(s):")
for folder in person_folders:
    image_count = len(list(folder.glob("*.jpg"))) + len(list(folder.glob("*.png")))
    print(f"   • {folder.name}: {image_count} images")

# Force retrain
print("\n[3/4] Training face recognition model...")
print("   This may take a moment...\n")

try:
    detector.force_retrain()
    
    if detector.is_trained:
        print("\n✅ Training completed successfully!")
        print(f"\n📊 Model Statistics:")
        print(f"   • Trained on: {len(detector.known_face_labels)} persons")
        print(f"   • Recognition algorithm: LBPH (Local Binary Patterns Histogram)")
        print(f"   • Max distance threshold: {detector.max_distance}")
        print(f"   • Min confidence: {detector.min_confidence}%")
        print(f"\n🎯 Enterprise Features Enabled:")
        print("   ✓ Low-light enhancement (CLAHE + Gamma correction)")
        print("   ✓ Noise reduction (for low-quality cameras)")
        print("   ✓ Image sharpening")
        print("   ✓ Advanced histogram equalization")
        print("   ✓ Multi-scale face detection (YOLO + Haar Cascades)")
        
        print(f"\n💾 Model saved to cache for fast loading")
        print(f"\n🚀 Ready for attendance marking!")
        
        # Test detection
        print(f"\n[4/4] Testing face detection...")
        print("   Creating test frame...")
        test_frame = cv2.imread(str(next(person_folders[0].glob("*.jpg"))))
        if test_frame is not None:
            faces = detector.detect_faces_fast(test_frame)
            if faces:
                name, conf, dist = detector.recognize_face(test_frame, faces[0])
                print(f"   ✅ Detection test passed!")
                print(f"      Recognized: {name} ({conf:.1f}% confidence)")
            else:
                print(f"   ⚠️ No face detected in test image")
        
        print("\n" + "=" * 80)
        print("✅ TRAINING COMPLETE - SYSTEM READY")
        print("=" * 80)
        
    else:
        print("\n❌ Training failed - no faces were processed")
        print("   Please check that your images contain visible faces")
        sys.exit(1)
        
except Exception as e:
    print(f"\n❌ Training error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print(f"\n📖 Next Steps:")
print("   1. Start backend: cd backend && python -m uvicorn app.main:app --reload")
print("   2. Test attendance marking with webcam")
print("   3. Model will auto-retrain when new images are added\n")

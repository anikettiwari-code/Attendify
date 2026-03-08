"""
Quick test script to verify the AI model is working correctly.
Tests:
1. Model loading
2. Face detection
3. Face recognition
"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

print("=" * 80)
print("🧪 TESTING AI MODEL")
print("=" * 80)

# Test 1: Import and initialize
print("\n[1/4] Loading AI service...")
try:
    from ai.face_service import get_face_service
    svc = get_face_service()
    print("✅ AI service loaded successfully")
except Exception as e:
    print(f"❌ Failed to load AI service: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 2: Check model status
print("\n[2/4] Checking model status...")
try:
    stats = svc.get_stats()
    print(f"✅ Model status:")
    print(f"   • Trained: {stats['is_trained']}")
    print(f"   • Total persons: {stats['total_persons']}")
    print(f"   • Total faces: {stats['total_faces']}")
    print(f"   • Known persons: {', '.join(stats['known_persons']) if stats['known_persons'] else 'None'}")
    
    if not stats['is_trained']:
        print("\n⚠️  Model is not trained yet!")
        print("   Please add training data and retrain the model.")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ Failed to get model status: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 3: Test face detection on a training image
print("\n[3/4] Testing face detection...")
try:
    import cv2
    
    # Find a test image from training data
    training_dir = Path(__file__).parent.parent / "model-training" / "training-data"
    test_image = None
    
    for person_dir in training_dir.iterdir():
        if person_dir.is_dir():
            images = list(person_dir.glob("*.jpg")) + list(person_dir.glob("*.png"))
            if images:
                test_image = images[0]
                expected_name = person_dir.name
                break
    
    if not test_image:
        print("⚠️  No test images found in training-data/")
        print("   Skipping detection test")
    else:
        print(f"   Using test image: {test_image}")
        frame = cv2.imread(str(test_image))
        
        if frame is None:
            print(f"❌ Failed to load test image")
        else:
            faces = svc.detector.detect_faces(frame)
            print(f"✅ Detected {len(faces)} face(s)")
            
            if faces:
                # Test recognition
                print("\n[4/4] Testing face recognition...")
                name, conf, dist = svc.detector.recognize_face(frame, faces[0])
                print(f"✅ Recognition result:")
                print(f"   • Recognized as: {name}")
                print(f"   • Confidence: {conf:.1f}%")
                print(f"   • Distance: {dist:.1f}")
                print(f"   • Expected: {expected_name}")
                
                if name.lower() == expected_name.lower():
                    print(f"\n🎉 Recognition PASSED - Correctly identified!")
                elif name == "Unknown":
                    print(f"\n⚠️  Recognition returned Unknown (confidence too low or distance too high)")
                else:
                    print(f"\n⚠️  Recognition mismatch - got '{name}' but expected '{expected_name}'")
            else:
                print("⚠️  No faces detected in test image")
                
except Exception as e:
    print(f"❌ Test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 80)
print("✅ MODEL TEST COMPLETE")
print("=" * 80)
print("\n📝 Next Steps:")
print("   1. If tests passed, the model is ready for use")
print("   2. Start backend: python main.py")
print("   3. Test with frontend or use test_ai.py for API testing\n")

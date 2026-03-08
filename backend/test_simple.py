"""
Simple model test - checks if LBPH model is trained and can be loaded.
"""

import sys
from pathlib import Path

print("=" * 80)
print("🧪 SIMPLE MODEL TEST")
print("=" * 80)

# Check if model cache exists
model_cache = Path(__file__).parent.parent / "model-training" / "model-cache" / "lbph_model.yml"
training_data = Path(__file__).parent.parent / "model-training" / "training-data"

print(f"\n[1/3] Checking paths...")
print(f"   Model cache: {model_cache}")
print(f"   Exists: {model_cache.exists()}")
print(f"   Training data: {training_data}")
print(f"   Exists: {training_data.exists()}")

if model_cache.exists():
    print(f"   ✅ Model cache found ({model_cache.stat().st_size} bytes)")
else:
    print(f"   ❌ Model cache not found - model needs training")

# Count training data
if training_data.exists():
    person_folders = [f for f in training_data.iterdir() if f.is_dir()]
    total_images = 0
    print(f"\n[2/3] Training data:")
    for folder in person_folders:
        images = list(folder.glob("*.jpg")) + list(folder.glob("*.png"))
        total_images += len(images)
        print(f"   • {folder.name}: {len(images)} images")
    print(f"   Total: {len(person_folders)} persons, {total_images} images")
else:
    print(f"\n❌ Training data directory not found")

# Try to load the model without YOLO
print(f"\n[3/3] Testing model load (without YOLO)...")
try:
    import cv2
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    
    if model_cache.exists():
        recognizer.read(str(model_cache))
        print(f"   ✅ LBPH model loaded successfully from cache")
        print(f"   ✅ Model is ready for recognition")
    else:
        print(f"   ⚠️  No cached model found - will need to train")
        
except Exception as e:
    print(f"   ❌ Failed to load model: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)
print("✅ SIMPLE TEST COMPLETE")
print("=" * 80)

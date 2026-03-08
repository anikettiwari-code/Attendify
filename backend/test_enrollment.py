"""Test script for the biometric enrollment flow."""
import urllib.request
import base64
import json
import os

# Test with a dummy student
student_name = "Abhishek" # Or a new name, let's use "TestStudent"
student_id = "00000000-0000-0000-0000-000000000001"
profile_id = student_id

# Read a few images from existing training data to simulate upload
image_paths = [
    '../model-training/training-data/aniket/1.jpg',
    '../model-training/training-data/aniket/2.jpg'
]

images_b64 = []
for p in image_paths:
    with open(p, 'rb') as f:
        images_b64.append(base64.b64encode(f.read()).decode())

payload = json.dumps({
    'profile_id': profile_id,
    'student_id': student_id,
    'full_name': student_name,
    'images': images_b64
}).encode()

req = urllib.request.Request(
    'http://localhost:8000/api/v1/students/upload-multiple-biometrics',
    data=payload,
    headers={'Content-Type': 'application/json'}
)

try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read().decode())
    print('Status:', resp.status)
    print(json.dumps(data, indent=2))
except Exception as e:
    print('Error:', e)

"""Quick test of the AI recognition endpoint."""
import urllib.request
import base64
import json

# Test with aniket (full frame)
with open('../model-training/training-data/aniket/1.jpg', 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode()

payload = json.dumps({
    'image': img_b64,
    'lecture_id': '00000000-0000-0000-0000-000000000000',
    'camera_id': 'test'
}).encode()

req = urllib.request.Request(
    'http://localhost:8000/api/v1/attendance/recognise-frame',
    data=payload,
    headers={'Content-Type': 'application/json'}
)
resp = urllib.request.urlopen(req)
data = json.loads(resp.read().decode())

print('Status:', resp.status)
print('Message:', data.get('message'))
print('Detections:', len(data.get('detections', [])))

for d in data.get('detections', []):
    print(f"  Name: {d['name']}, Confidence: {d['confidence']}%, Distance: {d['distance']}")

print('Attendance marked:', data.get('attendance_marked', []))

import mediapipe as mp
print("MediaPipe version:", mp.__version__)
print("Available modules:", dir(mp))

try:
    from mediapipe.tasks.python import vision
    print("Vision module available")
    print("Vision contents:", dir(vision))
except ImportError as e:
    print("Vision import failed:", e)

try:
    from mediapipe.tasks.python.vision import FaceLandmarker
    print("FaceLandmarker available")
except ImportError as e:
    print("FaceLandmarker import failed:", e)

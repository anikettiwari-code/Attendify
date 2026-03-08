try:
    import numpy
    print(f"NumPy version: {numpy.__version__}")
    
    import cv2
    print(f"OpenCV version: {cv2.__version__}")
    print(f"cv2.face has LBPH: {hasattr(cv2.face, 'LBPHFaceRecognizer_create')}")
    
    import mediapipe
    print(f"MediaPipe file: {mediapipe.__file__}")
    
    import ultralytics
    print(f"Ultralytics version: {ultralytics.__version__}")
    
    import firebase_admin
    print("Firebase Admin imported successfully")
    
except Exception as e:
    print(f"IMPORT ERROR: {e}")

import cv2
import numpy as np
from insightface.app import FaceAnalysis

print("Initializing FaceAnalysis app...")
try:
    # Use the lightweight model buffalo_sc if available, or buffalo_l
    app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=-1, det_size=(320, 320))
    print("Successfully initialized FaceAnalysis!")
    
    # Create a dummy image
    img = np.zeros((320, 320, 3), dtype=np.uint8)
    faces = app.get(img)
    print(f"Inference run complete. Found {len(faces)} faces in dummy image.")
except Exception as e:
    print(f"Error testing insightface: {e}")

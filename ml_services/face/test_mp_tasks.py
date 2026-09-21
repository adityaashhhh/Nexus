import os
import urllib.request
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

model_url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
model_path = "ml_services/face/face_landmarker.task"

if not os.path.exists(model_path):
    print("Downloading face_landmarker.task...")
    # Ensure directory exists
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    urllib.request.urlretrieve(model_url, model_path)
    print("Downloaded!")

print("Initializing FaceLandmarker...")
try:
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
        num_faces=1
    )
    detector = vision.FaceLandmarker.create_from_options(options)
    print("Successfully initialized FaceLandmarker!")
    
    # Run on dummy image
    img = np.zeros((320, 320, 3), dtype=np.uint8)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img)
    result = detector.detect(mp_image)
    print("Inference run successful! Face landmarks found:", len(result.face_landmarks))
except Exception as e:
    print("Error:", e)

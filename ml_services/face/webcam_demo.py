"""
webcam_demo.py
Interactive live webcam face verification demo with blink-based liveness detection.
Compares your live face against a profile picture (profile.jpg).
"""
import os
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from insightface.app import FaceAnalysis

# Constants for EAR calculation
LEFT_EYE = {'top': 386, 'bottom': 374, 'left': 362, 'right': 263}
RIGHT_EYE = {'top': 159, 'bottom': 145, 'left': 33, 'right': 133}
VERIFICATION_THRESHOLD = 0.23

FACE_DIR = os.path.dirname(__file__)
PROFILE_PATH = os.path.join(FACE_DIR, "profile.jpg")
LANDMARKER_MODEL_PATH = os.path.join(FACE_DIR, "face_landmarker.task")


def calculate_ear(landmarks, eye_indices) -> float:
    """Computes Eye Aspect Ratio (EAR) based on vertical vs horizontal landmark distances."""
    top = np.array([landmarks[eye_indices['top']].x, landmarks[eye_indices['top']].y])
    bottom = np.array([landmarks[eye_indices['bottom']].x, landmarks[eye_indices['bottom']].y])
    left = np.array([landmarks[eye_indices['left']].x, landmarks[eye_indices['left']].y])
    right = np.array([landmarks[eye_indices['right']].x, landmarks[eye_indices['right']].y])

    vertical = np.linalg.norm(top - bottom)
    horizontal = np.linalg.norm(left - right)

    if horizontal == 0:
        return 0.0
    return vertical / horizontal


def detect_blink(ear_history: list) -> bool:
    """Detects a blink in a rolling history window of EAR values."""
    if len(ear_history) < 10:
        return False

    # Look for a quick dip followed by a recovery
    max_ear = max(ear_history)
    min_ear = min(ear_history)

    # Range check to ensure we aren't triggered by tiny natural fluctuations
    if max_ear - min_ear < 0.08:
        return False

    min_idx = ear_history.index(min_ear)

    # Check if the minimum point is in the middle of the window (a dip and recovery)
    if 2 < min_idx < len(ear_history) - 2:
        pre_dip_max = max(ear_history[:min_idx])
        post_dip_max = max(ear_history[min_idx + 1:])
        
        # If both sides show open eyes and the middle shows a closed eye
        if min_ear < 0.18 and pre_dip_max > 0.22 and post_dip_max > 0.22:
            return True

    return False


def main():
    print("\n=======================================================")
    print("      SPOTTR FACE VERIFICATION LIVE WEBCAM DEMO        ")
    print("=======================================================")

    # Check if profile picture exists
    if not os.path.exists(PROFILE_PATH):
        print(f"\n❌ Error: Profile picture not found at: {PROFILE_PATH}")
        print("Please save a photo of yourself as 'profile.jpg' in that directory first!")
        return

    print("\nLoading models... (This may take a moment)")
    
    # 1. Initialize InsightFace
    face_app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
    face_app.prepare(ctx_id=-1, det_size=(320, 320))
    rec_model = face_app.models['recognition']
    print("✔ InsightFace Loaded.")

    # 2. Initialize MediaPipe FaceLandmarker
    base_options = python.BaseOptions(model_asset_path=LANDMARKER_MODEL_PATH)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
        num_faces=1
    )
    face_landmarker = vision.FaceLandmarker.create_from_options(options)
    print("✔ MediaPipe FaceLandmarker Loaded.")

    # 3. Load profile photo and extract its embedding
    print("Extracting embedding from profile.jpg...")
    profile_img = cv2.imread(PROFILE_PATH)
    if profile_img is None:
        print("❌ Error: Could not read profile.jpg")
        return
        
    faces = face_app.get(profile_img)
    if len(faces) == 0:
        print("❌ Error: No face detected in profile.jpg. Please use a clearer photo.")
        return
    
    # Take the largest face
    profile_face = max(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]))
    profile_emb = profile_face.normed_embedding
    profile_emb = profile_emb / np.linalg.norm(profile_emb)
    print("✔ Profile face embedding extracted successfully!")

    # 4. Open Webcam
    print("\nStarting webcam... Look at the camera and blink when ready!")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("❌ Error: Could not access webcam.")
        return

    ear_history = []
    verification_done = False
    status_text = "Look at the camera and BLINK to verify"
    status_color = (255, 255, 255) # White

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame.")
            break

        # Flip horizontally for mirroring effect
        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Run MediaPipe face landmarker
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
        result = face_landmarker.detect(mp_image)

        if not verification_done:
            if result.face_landmarks and len(result.face_landmarks) > 0:
                landmarks = result.face_landmarks[0]
                left_ear = calculate_ear(landmarks, LEFT_EYE)
                right_ear = calculate_ear(landmarks, RIGHT_EYE)
                avg_ear = (left_ear + right_ear) / 2.0
                
                # Keep a rolling window of the last 20 frames
                ear_history.append(avg_ear)
                if len(ear_history) > 20:
                    ear_history.pop(0)

                # Draw circles on eyes to show it's tracking
                # Convert normalized landmarks to pixel coordinates
                for idx in [LEFT_EYE['top'], LEFT_EYE['bottom'], RIGHT_EYE['top'], RIGHT_EYE['bottom']]:
                    pt = landmarks[idx]
                    cv2.circle(frame, (int(pt.x * w), int(pt.y * h)), 3, (0, 255, 0), -1)

                # Display active EAR value
                cv2.putText(frame, f"EAR: {avg_ear:.2f}", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

                # Check for a blink
                if detect_blink(ear_history):
                    print("Blink detected! Verifying face...")
                    # 1. Freeze frame and display message
                    status_text = "Blink Detected! Matching face..."
                    status_color = (255, 165, 0) # Orange
                    
                    # 2. Extract embedding from this live frame
                    live_faces = face_app.get(frame)
                    if len(live_faces) > 0:
                        live_face = max(live_faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]))
                        live_emb = live_face.normed_embedding
                        live_emb = live_emb / np.linalg.norm(live_emb)

                        # Cosine similarity
                        similarity = float(np.dot(profile_emb, live_emb))
                        print(f"Cosine Similarity: {similarity:.4f}")

                        if similarity >= VERIFICATION_THRESHOLD:
                            status_text = f"VERIFIED! Score: {similarity:.2f}"
                            status_color = (0, 255, 0) # Green
                        else:
                            status_text = f"MATCH FAILED! Score: {similarity:.2f}"
                            status_color = (0, 0, 255) # Red
                    else:
                        status_text = "No face detected in selfie!"
                        status_color = (0, 0, 255)
                    
                    verification_done = True
            else:
                cv2.putText(frame, "No face detected. Please position yourself.", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        # Display instructions/status at the bottom
        cv2.rectangle(frame, (0, h - 50), (w, h), (0, 0, 0), -1)
        cv2.putText(frame, status_text, (10, h - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)

        # Show frame
        cv2.imshow("Spottr Hinge-Style Verification Demo", frame)

        # Handle keyboard input
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27: # Esc or 'q'
            break
        elif key == ord('r') and verification_done: # 'r' to reset and retry
            verification_done = False
            ear_history = []
            status_text = "Look at the camera and BLINK to verify"
            status_color = (255, 255, 255)

    cap.release()
    cv2.destroyAllWindows()
    print("\nDemo finished.")


if __name__ == "__main__":
    main()

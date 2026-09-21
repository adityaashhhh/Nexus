import os
import io
import numpy as np
import cv2
from fastapi.testclient import TestClient
from app import app, startup_event

# Initialize the test client
client = TestClient(app)

# Trigger the startup event manually to load models
startup_event()

def get_test_image_bytes(name, idx):
    LFW_HOME = os.path.expanduser("~/scikit_learn_data/lfw_home")
    path = os.path.join(LFW_HOME, "lfw_funneled", name, f"{name}_{idx:04d}.jpg")
    if not os.path.exists(path):
        # Fallback dummy image
        img = np.zeros((112, 112, 3), dtype=np.uint8)
        _, buffer = cv2.imencode(".jpg", img)
        return io.BytesIO(buffer.tobytes())
        
    with open(path, "rb") as f:
        return io.BytesIO(f.read())

def test_profile_verification_endpoint():
    print("\n=======================================================")
    print("       TESTING HINGE-STYLE PROFILE VERIFICATION        ")
    print("=======================================================")

    # 1. Test Match Case (Selfie of Abdullah_Gul compared to Abdullah_Gul profile photo)
    # Note: Liveness will fail on static frames, but we verify similarity matching logic
    print("Testing match case (Same person)...")
    profile_img = get_test_image_bytes("Abdullah_Gul", 13)
    selfie_frame1 = get_test_image_bytes("Abdullah_Gul", 14)
    selfie_frame2 = get_test_image_bytes("Abdullah_Gul", 14)

    response = client.post(
        "/verify/profile",
        files=[
            ("profile_photos", ("profile1.jpg", profile_img, "image/jpeg")),
            ("selfie_frames", ("selfie1.jpg", selfie_frame1, "image/jpeg")),
            ("selfie_frames", ("selfie2.jpg", selfie_frame2, "image/jpeg"))
        ]
    )
    print("Status Code:", response.status_code)
    assert response.status_code == 200
    res_data = response.json()
    print("  Liveness Passed:", res_data["liveness_passed"])
    print("  Max Similarity Score:", res_data["max_similarity_score"])
    print("  Verified (Expected False due to static liveness check):", res_data["verified"])
    
    assert res_data["liveness_passed"] is False
    assert res_data["max_similarity_score"] >= res_data["threshold"]
    assert res_data["verified"] is False  # Because liveness_passed is False

    # 2. Test Non-Match Case (Selfie of Abdullah_Gul compared to Al_Pacino profile photo)
    print("\nTesting non-match case (Different person)...")
    profile_img_diff = get_test_image_bytes("Al_Pacino", 1)
    selfie_frame1 = get_test_image_bytes("Abdullah_Gul", 14)
    selfie_frame2 = get_test_image_bytes("Abdullah_Gul", 14)

    response = client.post(
        "/verify/profile",
        files=[
            ("profile_photos", ("profile_diff.jpg", profile_img_diff, "image/jpeg")),
            ("selfie_frames", ("selfie1.jpg", selfie_frame1, "image/jpeg")),
            ("selfie_frames", ("selfie2.jpg", selfie_frame2, "image/jpeg"))
        ]
    )
    print("Status Code:", response.status_code)
    assert response.status_code == 200
    res_data = response.json()
    print("  Max Similarity Score:", res_data["max_similarity_score"])
    assert res_data["max_similarity_score"] < res_data["threshold"]
    assert res_data["verified"] is False

    # 3. Test Multi-Photo Match Case (Selfie of Abdullah_Gul compared to a list of profile photos: Al_Pacino, Abdullah_Gul)
    # The selfie should match Abdullah_Gul (index 1) and output verified logic correctly
    print("\nTesting multi-photo list case (Selfie matches at least one profile picture)...")
    profile_img1 = get_test_image_bytes("Al_Pacino", 1)
    profile_img2 = get_test_image_bytes("Abdullah_Gul", 13)
    selfie_frame1 = get_test_image_bytes("Abdullah_Gul", 14)
    selfie_frame2 = get_test_image_bytes("Abdullah_Gul", 14)

    response = client.post(
        "/verify/profile",
        files=[
            ("profile_photos", ("profile1.jpg", profile_img1, "image/jpeg")),
            ("profile_photos", ("profile2.jpg", profile_img2, "image/jpeg")),
            ("selfie_frames", ("selfie1.jpg", selfie_frame1, "image/jpeg")),
            ("selfie_frames", ("selfie2.jpg", selfie_frame2, "image/jpeg"))
        ]
    )
    print("Status Code:", response.status_code)
    assert response.status_code == 200
    res_data = response.json()
    print("  Individual Similarity Scores:", res_data["similarity_scores"])
    print("  Max Similarity Score:", res_data["max_similarity_score"])
    print("  Processed Profile Photos:", res_data["processed_profile_photos"])
    
    assert res_data["processed_profile_photos"] == 2
    assert len(res_data["similarity_scores"]) == 2
    assert res_data["max_similarity_score"] >= res_data["threshold"]

    print("\n=======================================================")
    print("       ALL PROFILE VERIFICATION TESTS PASSED!          ")
    print("=======================================================")

if __name__ == "__main__":
    test_profile_verification_endpoint()

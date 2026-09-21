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

def test_verify_service():
    print("\n=======================================================")
    print("           TESTING FACE VERIFICATION SERVICE           ")
    print("=======================================================")
    
    # 1. Test ID photo embedding extraction
    print("Testing POST /verify/id...")
    img_bytes = get_test_image_bytes("Abdullah_Gul", 13)
    response = client.post(
        "/verify/id",
        files={"id_photo": ("id.jpg", img_bytes, "image/jpeg")}
    )
    print("Status Code:", response.status_code)
    assert response.status_code == 200
    res_data = response.json()
    assert "id_embedding" in res_data
    assert len(res_data["id_embedding"]) == 512
    id_emb = res_data["id_embedding"]
    print("Successfully extracted ID embedding! Length:", len(id_emb))
    
    # 2. Test Selfie photo embedding extraction & liveness (static/no-blink test)
    print("\nTesting POST /verify/selfie (No-blink scenario)...")
    img_bytes1 = get_test_image_bytes("Abdullah_Gul", 14)
    img_bytes2 = get_test_image_bytes("Abdullah_Gul", 14)
    
    # Send multiple frames of the same image (liveness should fail because there is no blink)
    response = client.post(
        "/verify/selfie",
        files=[
            ("selfie_frames", ("frame1.jpg", img_bytes1, "image/jpeg")),
            ("selfie_frames", ("frame2.jpg", img_bytes2, "image/jpeg"))
        ]
    )
    print("Status Code:", response.status_code)
    assert response.status_code == 200
    res_data = response.json()
    assert "selfie_embedding" in res_data
    assert "liveness_passed" in res_data
    assert len(res_data["selfie_embedding"]) == 512
    selfie_emb = res_data["selfie_embedding"]
    liveness = res_data["liveness_passed"]
    print(f"Successfully extracted Selfie embedding! Length: {len(selfie_emb)}")
    print(f"Liveness Passed (Expected False for static frames): {liveness}")
    assert liveness is False # Correct behavior for static identical frames
    
    # 3. Test Embedding Comparison (Match case)
    print("\nTesting POST /verify/compare (Match case: Abdullah Gul 13 vs 14)...")
    response = client.post(
        "/verify/compare",
        json={"id_embedding": id_emb, "selfie_embedding": selfie_emb}
    )
    print("Status Code:", response.status_code)
    assert response.status_code == 200
    res_data = response.json()
    print("Match Score:", res_data["similarity_score"])
    print("Verified:", res_data["verified"])
    assert res_data["verified"] is True
    
    # 4. Test Embedding Comparison (Non-match case: Abdullah Gul 13 vs different person)
    print("\nTesting POST /verify/compare (Non-match case)...")
    # Get embedding for a different person
    diff_bytes = get_test_image_bytes("Al_Pacino", 1)
    response_diff = client.post(
        "/verify/id",
        files={"id_photo": ("diff.jpg", diff_bytes, "image/jpeg")}
    )
    diff_emb = response_diff.json()["id_embedding"]
    
    response = client.post(
        "/verify/compare",
        json={"id_embedding": id_emb, "selfie_embedding": diff_emb}
    )
    print("Status Code:", response.status_code)
    assert response.status_code == 200
    res_data = response.json()
    print("Match Score (Different people):", res_data["similarity_score"])
    print("Verified:", res_data["verified"])
    assert res_data["verified"] is False
    
    print("\n=======================================================")
    print("               ALL SERVICE TESTS PASSED!               ")
    print("=======================================================")

if __name__ == "__main__":
    test_verify_service()

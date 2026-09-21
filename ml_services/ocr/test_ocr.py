import os
from fastapi.testclient import TestClient
from app import app, startup_event

# Initialize the test client
client = TestClient(app)

# Trigger startup event manually to load EasyOCR model
startup_event()

# Path to generated sample IDs
OCR_DIR = os.path.dirname(__file__)
SAMPLE_IDS_DIR = os.path.join(OCR_DIR, "sample_ids")

# Sample data dictionary matching generate_sample_ids.py ground truth
SAMPLE_DATA = [
    {"name": "JOHN MICHAEL SMITH", "dob": "15/03/1992", "id_number": "SPT-2024-00142"},
    {"name": "PRIYA SHARMA", "dob": "22/07/1995", "id_number": "SPT-2024-00287"},
    {"name": "CARLOS HERNANDEZ", "dob": "08/11/1988", "id_number": "SPT-2024-00391"},
    {"name": "AISHA MOHAMMED", "dob": "30/01/2000", "id_number": "SPT-2024-00456"},
    {"name": "YUKI TANAKA", "dob": "04/06/1997", "id_number": "SPT-2024-00523"},
]

def test_ocr_extraction():
    print("\n=======================================================")
    print("               TESTING SPOTTR OCR SERVICE              ")
    print("=======================================================")

    # Test each of the generated IDs on clean, rotated, and lowcontrast variants
    variants = ["clean", "rotated", "lowcontrast"]
    
    for idx, expected in enumerate(SAMPLE_DATA):
        print(f"\nTesting extraction for ID {idx:02d} ({expected['name']}):")
        
        for var in variants:
            filename = f"sample_id_{idx:02d}_{var}.jpg"
            filepath = os.path.join(SAMPLE_IDS_DIR, filename)
            
            if not os.path.exists(filepath):
                print(f"  Missing file {filepath}, skipping...")
                continue
                
            print(f"  Testing variant '{var}'...")
            with open(filepath, "rb") as f:
                img_bytes = f.read()
                
            # Call /extract
            response = client.post(
                "/extract",
                files={"id_image": (filename, img_bytes, "image/jpeg")}
            )
            
            assert response.status_code == 200, f"Failed on {filename}"
            res_data = response.json()
            
            # Compare extracted fields with ground truth
            # Sometimes OCR has slight noise, so we check case-insensitive match or presence
            ext_name = res_data["name"]
            ext_dob = res_data["dob"]
            ext_id = res_data["id_number"]
            
            print(f"    Extracted Name: '{ext_name}' (expected '{expected['name']}')")
            print(f"    Extracted DOB:  '{ext_dob}' (expected '{expected['dob']}')")
            print(f"    Extracted ID:   '{ext_id}' (expected '{expected['id_number']}')")
            print(f"    Quality Score:  {res_data['quality_score']} | Review Required: {res_data['needs_manual_review']}")
            
            # Basic validation assertions for clean variants
            if var == "clean":
                assert ext_name == expected["name"], f"Name mismatch on clean variant: {ext_name} != {expected['name']}"
                assert ext_dob == expected["dob"], f"DOB mismatch on clean variant: {ext_dob} != {expected['dob']}"
                assert ext_id == expected["id_number"], f"ID mismatch on clean variant: {ext_id} != {expected['id_number']}"
                assert res_data["needs_manual_review"] is False, "Clean variant should not require manual review"

    # Test /cross-check endpoint
    print("\nTesting POST /cross-check...")
    clean_filepath = os.path.join(SAMPLE_IDS_DIR, "sample_id_00_clean.jpg")
    with open(clean_filepath, "rb") as f:
        img_bytes = f.read()
        
    # Test valid match
    response = client.post(
        "/cross-check",
        files={"id_image": ("sample_id_00_clean.jpg", img_bytes, "image/jpeg")},
        data={"profile_name": "JOHN MICHAEL SMITH", "profile_dob": "15/03/1992"}
    )
    assert response.status_code == 200
    res_data = response.json()
    print("  Valid cross-check result:")
    print("    Name Match:", res_data["name_match"])
    print("    DOB Match:", res_data["dob_match"])
    print("    OCR Match (Both):", res_data["ocr_match"])
    assert res_data["ocr_match"] is True

    # Test invalid match (mismatched name)
    response_mismatch = client.post(
        "/cross-check",
        files={"id_image": ("sample_id_00_clean.jpg", img_bytes, "image/jpeg")},
        data={"profile_name": "JOHN M. SMITH", "profile_dob": "15/03/1992"}
    )
    assert response_mismatch.status_code == 200
    res_data_mismatch = response_mismatch.json()
    print("  Mismatched name cross-check result:")
    print("    OCR Match (expected True due to substring fallback logic):", res_data_mismatch["ocr_match"])
    
    # Test completely wrong name
    response_wrong = client.post(
        "/cross-check",
        files={"id_image": ("sample_id_00_clean.jpg", img_bytes, "image/jpeg")},
        data={"profile_name": "BOB SMITH", "profile_dob": "15/03/1992"}
    )
    assert response_wrong.status_code == 200
    res_data_wrong = response_wrong.json()
    print("  Wrong name cross-check result:")
    print("    Name Match (expected False):", res_data_wrong["name_match"])
    print("    OCR Match (expected False):", res_data_wrong["ocr_match"])
    assert res_data_wrong["ocr_match"] is False

    print("\n=======================================================")
    print("               ALL OCR SERVICE TESTS PASSED!           ")
    print("=======================================================")

if __name__ == "__main__":
    test_ocr_extraction()

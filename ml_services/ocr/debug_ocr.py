import os
import easyocr

reader = easyocr.Reader(['en'], gpu=False)
img_path = os.path.join(os.path.dirname(__file__), "sample_ids", "sample_id_00_clean.jpg")
results = reader.readtext(img_path)

print("Raw OCR Detections:")
for idx, (bbox, text, conf) in enumerate(results):
    print(f"[{idx}] BBox: {bbox} | Text: '{text}' | Conf: {conf:.4f}")

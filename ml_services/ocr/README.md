# Spottr OCR Microservice

> **STATUS: PRETRAINED — No custom training was performed.**
> EasyOCR is used as a pretrained, off-the-shelf text recognition tool.

## Overview

This microservice extracts identity fields (Name, Date of Birth, ID Number) from uploaded ID card images. It uses a color-first extraction path with fallback image preprocessing (deskewing, adaptive binarization, and contrast boosting via CLAHE) to guarantee robustness on rotated or low-contrast document scans.

**⚠️ SAMPLE DATA ONLY** — This service is designed to run exclusively on test templates/mock user data. It must never process or store real personal documents.

## Files

| File | Purpose |
|------|---------|
| `app.py` | FastAPI microservice with `/extract` and `/cross-check` endpoints |
| `generate_sample_ids.py` | Generates synthetic test ID cards using Pillow's text renderer (clean, rotated, and low-contrast variants) |
| `test_ocr.py` | Integration tests verifying field extraction accuracy on all variants |
| `requirements.txt` | Python dependencies |

## API Endpoints

### `POST /extract`
Upload an ID image. Returns extracted fields, confidence scores, and manual review flags.
```
Request: multipart/form-data with field `id_image` (JPEG/PNG)
Response:
{
  "name": "JOHN MICHAEL SMITH",
  "dob": "15/03/1992",
  "id_number": "SPT-2024-00142",
  "name_confidence": 0.985,
  "dob_confidence": 0.999,
  "id_number_confidence": 0.883,
  "needs_manual_review": false,
  "quality_score": 1.0,
  "flags": [],
  "inference_time_ms": 124.5,
  "raw_detections": [...]
}
```

### `POST /cross-check`
Upload an ID image and cross-check extracted text against stated profile registration details. Both Name and DOB must match to approve verification.
```
Request: multipart/form-data
  - `id_image` (File)
  - `profile_name` (Form field)
  - `profile_dob` (Form field)
Response:
{
  "ocr_match": true,
  "name_match": true,
  "dob_match": true,
  "extracted_name": "JOHN MICHAEL SMITH",
  "extracted_dob": "15/03/1992",
  "extracted_id_number": "SPT-2024-00142",
  "profile_name": "JOHN MICHAEL SMITH",
  "profile_dob": "15/03/1992",
  "needs_manual_review": false,
  "quality_score": 1.0,
  "flags": []
}
```

## Running the Service

```bash
# Navigate to the service folder
cd ml_services/ocr
pip install -r requirements.txt
python app.py
# Service starts on http://localhost:8003
```

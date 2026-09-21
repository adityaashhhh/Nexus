# Spottr Face Verification Microservice

> **STATUS: PRETRAINED — No custom training was performed.**
> Both ArcFace (InsightFace) and FaceNet models are used as pretrained, off-the-shelf tools.
> They were evaluated and compared on the LFW dataset — see `bias_report.md` for full results.

## Overview

This microservice provides face detection, embedding extraction, cosine-similarity verification, and blink-based liveness checking via a FastAPI HTTP interface. It supports both ID-card matching (government documents verification sandbox) and profile-picture matching (Hinge-style verification).

**⚠️ SAMPLE DATA ONLY** — This service is built and testable end-to-end but is gated to sample/test data. It must never be connected to live user biometric data.

## Files

| File | Purpose |
|------|---------|
| `app.py` | FastAPI microservice with endpoints for ID verification and profile verification |
| `eval_face_verification.py` | Benchmark script comparing FaceNet vs InsightFace on LFW with demographic bias audit |
| `bias_report.md` | Auto-generated comparison report details |
| `roc_comparison.png` | ROC curve plot comparing both models |
| `requirements.txt` | Python dependencies |
| `test_service.py` | Integration tests for ID verification endpoints |
| `test_profile_verification.py` | Integration tests for Hinge-style profile verification |
| `face_landmarker.task` | MediaPipe FaceLandmarker model (auto-downloaded on first run) |

## API Endpoints

### `POST /verify/id`
Upload an ID photo. Returns a 512-dimensional face embedding.
```
Request: multipart/form-data with field `id_photo` (JPEG/PNG)
Response: { "id_embedding": [...], "inference_time_ms": 55.2 }
```

### `POST /verify/selfie`
Upload multiple sequential selfie frames. Returns a face embedding and liveness check result.
```
Request: multipart/form-data with field `selfie_frames` (multiple JPEG/PNG files)
Response: { "selfie_embedding": [...], "liveness_passed": true/false, "ear_history": [...], "processed_frames": 5 }
```

### `POST /verify/compare`
Compare two embeddings (from `/verify/id` and `/verify/selfie`) and return a verification decision.
```
Request: JSON { "id_embedding": [...], "selfie_embedding": [...] }
Response: { "verified": true/false, "similarity_score": 0.78, "threshold": 0.23 }
```

### `POST /verify/profile`
Compare sequential selfie frames against one or more profile pictures (Hinge-style).
```
Request: multipart/form-data
  - `profile_photos`: List of files (profile pictures)
  - `selfie_frames`: List of files (selfie frames for blink detection)
Response:
{
  "verified": true/false,
  "liveness_passed": true/false,
  "max_similarity_score": 0.78,
  "similarity_scores": [0.09, 0.78],
  "threshold": 0.23,
  "processed_profile_photos": 2,
  "processed_selfie_frames": 5
}
```

## Running

```bash
# From the project root
cd ml_services/face
pip install -r requirements.txt
python app.py
# Service starts on http://localhost:8002
```

## Model Selection Rationale

InsightFace (`buffalo_sc` / MobileFaceNet) was selected over FaceNet because:
- **Higher accuracy**: 99.40% vs 97.10% on LFW
- **Lower latency**: 55 ms vs 298 ms per face on CPU
- **Better fairness**: Lower FNMR across all demographic subgroups
- **Lower EER**: 1.00% vs 7.60%

See `bias_report.md` for the full comparison table and demographic audit.

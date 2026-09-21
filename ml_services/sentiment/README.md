# Spottr Sentiment & Vibe Analysis Microservice

> **STATUS: FINE-TUNED — Pretrained model was fine-tuned on Yelp Review dataset.**
> A DistilBERT-base-uncased model was fine-tuned on the Yelp review dataset to map star ratings to three sentiment classes.

## Overview

This microservice provides endpoints to analyze review text sentiment and extract aspect-level vibe tags ('quiet', 'good_wifi', 'work_friendly', 'good_for_groups', 'outdoor_seating'). It uses a sentence-splitting approach to run targeted aspect sentiment classification when keyword matches are detected.

## Files

| File | Purpose |
|------|---------|
| `app.py` | FastAPI service with `/analyze` endpoint |
| `train_sentiment.py` | Fine-tuning script for DistilBERT-base-uncased on Yelp reviews |
| `calibrate_vibe.py` | Calibration script comparing 3 different vibe weighting formulas |
| `test_sentiment.py` | Integration tests verifying classification and aspect parsing |
| `training_report.md` | Model training evaluation metrics and logs |
| `vibe_calibration_report.md` | Ground truth validation report comparing vibe schemes |
| `requirements.txt` | Python dependencies |

## API Endpoints

### `POST /analyze`
Analyzes full review sentiment and extracts aspect-based tags.
```
Request: JSON { "text": "This place has great wifi but it is way too loud." }
Response:
{
  "sentiment_score": 0.125,
  "label": "Neutral",
  "probabilities": { "Negative": 0.32, "Neutral": 0.45, "Positive": 0.23 },
  "aspects": {
    "good_wifi": {
      "mentioned": true,
      "sentiment": 0.78,
      "vote": "positive",
      "sentence": "This place has great wifi"
    },
    "quiet": {
      "mentioned": true,
      "sentiment": -0.65,
      "vote": "negative",
      "sentence": "it is way too loud"
    },
    ...
  },
  "latency_ms": 42.1
}
```

## Running the Service

```bash
# From the service folder
cd ml_services/sentiment
pip install -r requirements.txt
python app.py
# Service starts on http://localhost:8001
```

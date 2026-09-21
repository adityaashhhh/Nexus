import os
import re
import time
from typing import List, Dict, Any, Optional
import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification

app = FastAPI(
    title="Spottr Sentiment & Vibe Analysis Service",
    description="Microservice for full-review sentiment score calculation and per-sentence aspect tag extraction.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model and tokenizer
tokenizer = None
model = None
device = "cpu"

MODEL_DIR = os.path.dirname(__file__)
FINE_TUNED_PATH = os.path.join(MODEL_DIR, "fine_tuned_distilbert")
FALLBACK_MODEL = "distilbert-base-uncased"

# Tag keyword definitions for aspect extraction
TAG_KEYWORDS = {
    "quiet": ["quiet", "peaceful", "silent", "calm", "noisy", "loud", "rowdy", "noise", "sound"],
    "good_wifi": ["wifi", "internet", "connection", "wlan", "web", "speed", "online", "network"],
    "work_friendly": ["work", "laptop", "study", "plug", "outlet", "coding", "focus", "desk"],
    "good_for_groups": ["group", "groups", "friends", "crowd", "team", "meeting", "spacious", "space"],
    "outdoor_seating": ["outdoor", "patio", "terrace", "garden", "outside", "sun", "seating", "deck"]
}


@app.on_event("startup")
def startup_event():
    global tokenizer, model, device
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading sentiment model on startup ({device.upper()})...")
    
    # Try to load custom fine-tuned model first, fallback to base model if not saved yet
    if os.path.exists(FINE_TUNED_PATH) and os.path.exists(os.path.join(FINE_TUNED_PATH, "config.json")):
        print(f"Loading custom fine-tuned model from {FINE_TUNED_PATH}...")
        try:
            tokenizer = AutoTokenizer.from_pretrained(FINE_TUNED_PATH)
            model = AutoModelForSequenceClassification.from_pretrained(FINE_TUNED_PATH).to(device)
            print("Successfully loaded fine-tuned model.")
        except Exception as e:
            print(f"Failed to load fine-tuned model: {e}. Falling back to default...")
            load_fallback()
    else:
        print(f"Fine-tuned model not found at {FINE_TUNED_PATH}. Loading fallback model...")
        load_fallback()


def load_fallback():
    global tokenizer, model
    try:
        tokenizer = AutoTokenizer.from_pretrained(FALLBACK_MODEL)
        model = AutoModelForSequenceClassification.from_pretrained(
            FALLBACK_MODEL,
            num_labels=3,
            id2label={0: "Negative", 1: "Neutral", 2: "Positive"},
            label2id={"Negative": 0, "Neutral": 1, "Positive": 2}
        ).to(device)
        print(f"Successfully loaded fallback model: {FALLBACK_MODEL}")
    except Exception as e:
        print(f"Critical: Failed to load fallback model: {e}")


class ReviewPayload(BaseModel):
    text: str


def get_sentiment(text: str) -> Dict[str, Any]:
    """
    Computes sentiment prediction on a block of text.
    Returns:
      - sentiment_score: float scaled from -1.0 (Negative) to 1.0 (Positive)
      - label: str ("Positive", "Neutral", "Negative")
      - probabilities: dict of probabilities per class
    """
    # Clean text
    clean_text = text.lower().strip()
    clean_text = re.sub(r'<[^>]*>', '', clean_text)
    clean_text = re.sub(r'http\S+|www\.\S+', '', clean_text)
    
    inputs = tokenizer(clean_text, return_tensors="pt", truncation=True, max_length=256).to(device)
    
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
        
    # Map predictions
    # Index 0: Negative, 1: Neutral, 2: Positive
    label_idx = int(np.argmax(probs))
    labels = ["Negative", "Neutral", "Positive"]
    
    # Calculate a continuous score between -1.0 and 1.0
    # Formula: Positive Probability - Negative Probability
    sentiment_score = float(probs[2] - probs[0])
    
    return {
        "score": sentiment_score,
        "label": labels[label_idx],
        "probabilities": {
            "Negative": float(probs[0]),
            "Neutral": float(probs[1]),
            "Positive": float(probs[2])
        }
    }


def split_sentences(text: str) -> List[str]:
    """Splits a block of review text into individual sentences."""
    # Split using punctuation . ! ? with surrounding spaces
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]


def extract_aspects(text: str) -> Dict[str, Any]:
    """
    Scans each sentence in the review for aspect mentions.
    For each mention, computes sentence-level sentiment to get positive/negative votes.
    """
    sentences = split_sentences(text)
    aspects = {}
    
    for aspect_tag, keywords in TAG_KEYWORDS.items():
        aspects[aspect_tag] = {
            "mentioned": False,
            "sentiment": 0.0,
            "vote": "neutral",
            "sentence": None
        }
        
        # Check all sentences for a keyword match
        for sentence in sentences:
            sentence_lower = sentence.lower()
            # Simple keyword search
            matched = any(re.search(rf"\b{kw}\b", sentence_lower) for kw in keywords)
            
            if matched:
                # Isolate sentence, run sentiment prediction on it
                sent_result = get_sentiment(sentence)
                
                # Determine vote
                if sent_result["label"] == "Positive":
                    vote = "positive"
                elif sent_result["label"] == "Negative":
                    vote = "negative"
                else:
                    vote = "neutral"
                    
                aspects[aspect_tag] = {
                    "mentioned": True,
                    "sentiment": sent_result["score"],
                    "vote": vote,
                    "sentence": sentence
                }
                # Use the first matching sentence for this aspect
                break
                
    return aspects


@app.post("/analyze")
def analyze_review(payload: ReviewPayload):
    """
    Analyzes full review sentiment and extracts per-sentence aspect tags.
    """
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
        
    try:
        start_time = time.time()
        
        # 1. Full Review Sentiment
        review_sentiment = get_sentiment(payload.text)
        
        # 2. Aspect-Based Extraction
        aspect_results = extract_aspects(payload.text)
        
        latency_ms = (time.time() - start_time) * 1000
        
        return {
            "sentiment_score": review_sentiment["score"],
            "label": review_sentiment["label"],
            "probabilities": review_sentiment["probabilities"],
            "aspects": aspect_results,
            "latency_ms": round(latency_ms, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sentiment analysis failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)

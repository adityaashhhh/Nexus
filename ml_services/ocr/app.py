import os
import re
import time
from typing import List, Optional
import cv2
import numpy as np
import easyocr
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="Spottr OCR Service",
    description="Microservice for extracting identity fields (Name, DOB, ID Number) from sample ID card images.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global EasyOCR reader
reader = None

# Confidence threshold: below this, we flag for manual review
CONFIDENCE_THRESHOLD = 0.4

# Regex patterns for field extraction
DOB_PATTERNS = [
    r'\b(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})\b',         # DD/MM/YYYY or MM/DD/YYYY
    r'\b(\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})\b',             # YYYY/MM/DD
    r'\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b',  # 15 March 1992
]

ID_NUMBER_PATTERNS = [
    r'\b(SPT-\d{4}-\d{4,6})\b',           # Spottr format: SPT-YYYY-NNNNN
    r'\b([A-Z]{2,4}-\d{4}-\d{4,8})\b',    # Generic: XX-YYYY-NNNNNN
    r'\b(\d{4}\s?\d{4}\s?\d{4})\b',       # 12-digit numeric
]


@app.on_event("startup")
def startup_event():
    global reader
    print("Loading EasyOCR reader (English)...")
    reader = easyocr.Reader(['en'], gpu=False)
    print("EasyOCR loaded successfully.")


def preprocess_image(img: np.ndarray) -> np.ndarray:
    """
    Applies preprocessing steps to improve OCR accuracy:
    1. Convert to grayscale
    2. Deskew (correct rotation)
    3. Contrast boost (CLAHE)
    4. Binarization threshold
    """
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()

    gray = deskew(gray)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    binary = cv2.adaptiveThreshold(
        enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )

    return binary


def deskew(gray: np.ndarray) -> np.ndarray:
    """
    Detects and corrects rotation using Hough line transform.
    """
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLines(edges, 1, np.pi / 180, 100)

    if lines is not None:
        angles = []
        for line in lines[:20]:
            rho, theta = line[0]
            angle = (theta * 180 / np.pi) - 90
            if abs(angle) < 15:
                angles.append(angle)

        if angles:
            median_angle = np.median(angles)
            if abs(median_angle) > 0.5:
                h, w = gray.shape
                M = cv2.getRotationMatrix2D((w // 2, h // 2), median_angle, 1.0)
                gray = cv2.warpAffine(gray, M, (w, h),
                                      flags=cv2.INTER_CUBIC,
                                      borderValue=255)

    return gray


def extract_fields(ocr_results: list) -> dict:
    """
    Maps OCR text output to structured fields (Name, DOB, ID Number)
    using regex patterns and positional/contextual rules.
    """
    all_text_lines = []
    for bbox, text, conf in ocr_results:
        all_text_lines.append({
            "text": text.strip(),
            "confidence": conf,
            "y_center": (bbox[0][1] + bbox[2][1]) / 2
        })

    # Sort by vertical position (top to bottom)
    all_text_lines.sort(key=lambda x: x["y_center"])

    full_text = " ".join([line["text"] for line in all_text_lines])

    extracted = {
        "name": None,
        "dob": None,
        "id_number": None,
        "name_confidence": 0.0,
        "dob_confidence": 0.0,
        "id_number_confidence": 0.0,
        "raw_text": full_text,
        "all_detections": [{"text": l["text"], "confidence": round(l["confidence"], 3)} for l in all_text_lines]
    }

    # --- Extract DOB ---
    for line in all_text_lines:
        for pattern in DOB_PATTERNS:
            match = re.search(pattern, line["text"], re.IGNORECASE)
            if match:
                extracted["dob"] = match.group(1)
                extracted["dob_confidence"] = line["confidence"]
                break
        if extracted["dob"]:
            break

    # --- Extract ID Number ---
    for line in all_text_lines:
        for pattern in ID_NUMBER_PATTERNS:
            match = re.search(pattern, line["text"])
            if match:
                extracted["id_number"] = match.group(1)
                extracted["id_number_confidence"] = line["confidence"]
                break
        if extracted["id_number"]:
            break

    # --- Extract Name ---
    skip_labels = {"NAME", "DATE OF BIRTH", "ID NUMBER", "SPOTTR VERIFICATION ID",
                   "SAMPLE", "TEST USE ONLY", "PHOTO", "SAMPLE / TEST USE ONLY",
                   "SPOTTR", "VERIFICATION", "ID"}

    name_label_idx = None
    for i, line in enumerate(all_text_lines):
        upper_text = line["text"].upper().strip()
        if upper_text == "NAME":
            name_label_idx = i
            break

    if name_label_idx is not None and name_label_idx + 1 < len(all_text_lines):
        # Take the next line after the NAME label
        candidate = all_text_lines[name_label_idx + 1]
        extracted["name"] = candidate["text"].upper()
        extracted["name_confidence"] = candidate["confidence"]
    else:
        # Fallback: find the first all-caps line that looks like a name
        for line in all_text_lines:
            text = line["text"].strip()
            if (text.upper() in skip_labels or
                    len(text) < 3 or
                    any(c.isdigit() for c in text) or
                    "/" in text or "-" in text):
                continue
            alpha_ratio = sum(c.isalpha() or c.isspace() for c in text) / max(len(text), 1)
            if alpha_ratio > 0.8:
                extracted["name"] = text.upper()
                extracted["name_confidence"] = line["confidence"]
                break

    return extracted


def assess_quality(extracted: dict) -> dict:
    """
    Assesses extraction quality and flags low-confidence results for manual review.
    """
    flags = []
    fields_found = 0

    for field in ["name", "dob", "id_number"]:
        conf_key = f"{field}_confidence"
        if extracted[field] is None:
            flags.append(f"MISSING: {field} could not be extracted")
        elif extracted[conf_key] < CONFIDENCE_THRESHOLD:
            flags.append(f"LOW_CONFIDENCE: {field} = '{extracted[field]}' (conf={extracted[conf_key]:.2f} < {CONFIDENCE_THRESHOLD})")
        else:
            fields_found += 1

    needs_manual_review = len(flags) > 0
    quality_score = fields_found / 3.0

    return {
        "needs_manual_review": needs_manual_review,
        "quality_score": round(quality_score, 2),
        "flags": flags
    }


def perform_ocr(img: np.ndarray) -> dict:
    """
    Runs OCR on the color image first.
    If any field is missing or has low confidence, runs on preprocessed binary image
    as a fallback and merges the best results.
    """
    # 1. Run OCR on raw color image
    results_color = reader.readtext(img)
    extracted = extract_fields(results_color)
    
    # 2. Check if we need fallback preprocessing
    needs_fallback = (
        extracted["name"] is None or extracted["name_confidence"] < CONFIDENCE_THRESHOLD or
        extracted["dob"] is None or extracted["dob_confidence"] < CONFIDENCE_THRESHOLD or
        extracted["id_number"] is None or extracted["id_number_confidence"] < CONFIDENCE_THRESHOLD
    )
    
    if needs_fallback:
        print("Initial OCR has low confidence or missing fields. Running fallback preprocessing...")
        preprocessed = preprocess_image(img)
        results_binary = reader.readtext(preprocessed)
        extracted_binary = extract_fields(results_binary)
        
        # Merge best fields
        for field in ["name", "dob", "id_number"]:
            conf_key = f"{field}_confidence"
            if extracted_binary[field] is not None:
                # If the field was missing in color OCR, or the binary OCR has higher confidence
                if extracted[field] is None or extracted_binary[conf_key] > extracted[conf_key]:
                    extracted[field] = extracted_binary[field]
                    extracted[conf_key] = extracted_binary[conf_key]
                    
    return extracted


@app.post("/extract")
async def extract_id_fields(id_image: UploadFile = File(...)):
    """
    Upload an ID card image. Returns extracted Name, DOB, ID Number,
    confidence scores, and manual review flags.

    SAMPLE DATA ONLY — not connected to live user accounts.
    """
    try:
        contents = await id_image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file.")

        start = time.time()

        # Perform intelligent OCR with fallback
        extracted = perform_ocr(img)

        # Assess quality
        quality = assess_quality(extracted)

        latency = (time.time() - start) * 1000

        return {
            "name": extracted["name"],
            "dob": extracted["dob"],
            "id_number": extracted["id_number"],
            "name_confidence": round(extracted["name_confidence"], 3),
            "dob_confidence": round(extracted["dob_confidence"], 3),
            "id_number_confidence": round(extracted["id_number_confidence"], 3),
            "needs_manual_review": quality["needs_manual_review"],
            "quality_score": quality["quality_score"],
            "flags": quality["flags"],
            "inference_time_ms": round(latency, 1),
            "raw_detections": extracted["all_detections"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {str(e)}")


@app.post("/cross-check")
async def cross_check(
    id_image: UploadFile = File(...),
    profile_name: str = Form(""),
    profile_dob: str = Form("")
):
    """
    Extracts fields from the ID image and compares them against stated profile data.
    Both name AND DOB must match for an 'approved' result (per spec section 4.6).

    SAMPLE DATA ONLY — not connected to live user accounts.
    """
    try:
        contents = await id_image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file.")

        # Run OCR
        extracted = perform_ocr(img)
        quality = assess_quality(extracted)

        # Name comparison (case-insensitive, ignore extra whitespace, allow substring matching)
        name_match = False
        if extracted["name"] and profile_name:
            ocr_name = " ".join(extracted["name"].upper().split())
            stated_name = " ".join(profile_name.upper().split())
            name_match = (ocr_name == stated_name) or (stated_name in ocr_name) or (ocr_name in stated_name)

        # DOB comparison
        dob_match = False
        if extracted["dob"] and profile_dob:
            normalize = lambda s: re.sub(r'[/\-\.\s]', '', s)
            dob_match = normalize(extracted["dob"]) == normalize(profile_dob)

        ocr_match = name_match and dob_match

        return {
            "ocr_match": ocr_match,
            "name_match": name_match,
            "dob_match": dob_match,
            "extracted_name": extracted["name"],
            "extracted_dob": extracted["dob"],
            "extracted_id_number": extracted["id_number"],
            "profile_name": profile_name,
            "profile_dob": profile_dob,
            "needs_manual_review": quality["needs_manual_review"],
            "quality_score": quality["quality_score"],
            "flags": quality["flags"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cross-check failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port)

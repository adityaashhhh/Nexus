"""
generate_sample_ids.py
Generates synthetic sample ID card images for testing the OCR pipeline.
Uses Pillow to render real TrueType fonts (Arial) for clean OCR recognition.
These are FAKE IDs with FICTIONAL data — never use real personal documents.
"""
import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "sample_ids")
os.makedirs(OUTPUT_DIR, exist_ok=True)

SAMPLE_DATA = [
    {"name": "JOHN MICHAEL SMITH", "dob": "15/03/1992", "id_number": "SPT-2024-00142"},
    {"name": "PRIYA SHARMA", "dob": "22/07/1995", "id_number": "SPT-2024-00287"},
    {"name": "CARLOS HERNANDEZ", "dob": "08/11/1988", "id_number": "SPT-2024-00391"},
    {"name": "AISHA MOHAMMED", "dob": "30/01/2000", "id_number": "SPT-2024-00456"},
    {"name": "YUKI TANAKA", "dob": "04/06/1997", "id_number": "SPT-2024-00523"},
]

def draw_id_card(data: dict) -> np.ndarray:
    """
    Draws a synthetic ID card using PIL for high-quality font rendering.
    """
    width, height = 640, 400
    # Create PIL Image
    img = Image.new("RGB", (width, height), (245, 245, 245))
    draw = ImageDraw.Draw(img)

    # Use standard Windows Arial font, fallback to default if not found
    try:
        font_header = ImageFont.truetype("arial.ttf", 22)
        font_label = ImageFont.truetype("arial.ttf", 14)
        font_field = ImageFont.truetype("arial.ttf", 20)
        font_footer = ImageFont.truetype("arial.ttf", 16)
    except IOError:
        print("Arial font not found, falling back to default PIL font.")
        font_header = font_label = font_field = font_footer = ImageFont.load_default()

    # Draw header bar
    draw.rectangle([(5, 5), (width - 5, 65)], fill=(45, 85, 160))
    draw.text((120, 20), "SPOTTR VERIFICATION ID", fill=(255, 255, 255), font=font_header)

    # Outer border
    draw.rectangle([(5, 5), (width - 5, height - 5)], outline=(50, 50, 50), width=2)

    # Photo placeholder
    photo_x, photo_y = 30, 90
    photo_w, photo_h = 150, 180
    draw.rectangle([(photo_x, photo_y), (photo_x + photo_w, photo_y + photo_h)], fill=(180, 180, 180))
    draw.text((photo_x + 40, photo_y + 80), "PHOTO", fill=(100, 100, 100), font=font_label)

    # Field columns positioning
    text_x = 210
    
    # Name field
    draw.text((text_x, 95), "NAME", fill=(120, 120, 120), font=font_label)
    draw.text((text_x, 120), data["name"], fill=(30, 30, 30), font=font_field)

    # DOB field
    draw.text((text_x, 175), "DATE OF BIRTH", fill=(120, 120, 120), font=font_label)
    draw.text((text_x, 200), data["dob"], fill=(30, 30, 30), font=font_field)

    # ID Number field
    draw.text((text_x, 255), "ID NUMBER", fill=(120, 120, 120), font=font_label)
    draw.text((text_x, 280), data["id_number"], fill=(30, 30, 30), font=font_field)

    # Footer notice
    draw.text((180, 355), "SAMPLE / TEST USE ONLY", fill=(200, 0, 0), font=font_footer)

    # Convert back to OpenCV BGR format
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

def generate_variants(card, index):
    """
    Generate clean + degraded variants for robustness testing:
    - Clean original
    - Slightly rotated (simulating a tilted scan)
    - Low contrast (simulating a faded photocopy)
    """
    prefix = f"sample_id_{index:02d}"
    cards = {}

    # 1. Clean
    cards[f"{prefix}_clean.jpg"] = card.copy()

    # 2. Rotated ~3 degrees
    h, w = card.shape[:2]
    M = cv2.getRotationMatrix2D((w // 2, h // 2), 3.0, 1.0)
    rotated = cv2.warpAffine(card, M, (w, h), borderValue=(255, 255, 255))
    cards[f"{prefix}_rotated.jpg"] = rotated

    # 3. Low contrast
    low_contrast = cv2.convertScaleAbs(card, alpha=0.6, beta=60)
    cards[f"{prefix}_lowcontrast.jpg"] = low_contrast

    return cards

def main():
    print("Generating synthetic sample ID cards using PIL...")
    metadata = []

    for i, data in enumerate(SAMPLE_DATA):
        card = draw_id_card(data)
        variants = generate_variants(card, i)

        for filename, img in variants.items():
            path = os.path.join(OUTPUT_DIR, filename)
            cv2.imwrite(path, img)
            print(f"  Saved: {path}")

        metadata.append(data)

    # Write ground truth file
    gt_path = os.path.join(OUTPUT_DIR, "ground_truth.txt")
    with open(gt_path, "w") as f:
        f.write("index\tname\tdob\tid_number\n")
        for i, d in enumerate(metadata):
            f.write(f"{i}\t{d['name']}\t{d['dob']}\t{d['id_number']}\n")

    print(f"\nGenerated {len(SAMPLE_DATA)} IDs x 3 variants = {len(SAMPLE_DATA) * 3} images")
    print(f"Ground truth written to {gt_path}")

if __name__ == "__main__":
    main()

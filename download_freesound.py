"""
download_freesound.py
=====================
Downloads dog emotion sounds from Freesound.org API v2.
Saves .wav files into Outputs/Raw_Emotion_Data/{Alert|Bored|Playful}/

Usage:
    python download_freesound.py --api-key YOUR_API_KEY
    # or set environment variable:
    set FREESOUND_API_KEY=YOUR_API_KEY
    python download_freesound.py

Requirements:
    pip install requests librosa soundfile
"""

import os
import sys
import time
import argparse
import tempfile
import requests
from pathlib import Path

try:
    import librosa
    import soundfile as sf
    HAS_LIBROSA = True
except ImportError:
    HAS_LIBROSA = False

# ---------------------------------------------------------------------------
# Emotion → search queries mapping
# Multiple queries per emotion to maximize variety
# ---------------------------------------------------------------------------
EMOTION_QUERIES = {
    "Alert": [
        "alert dog bark",
        "guard dog barking",
        "dog warning growl",
        "dog alarm bark",
        "aggressive dog bark",
        "territorial dog bark",
        "watchdog bark",
        "dog intruder bark",
    ],
    "Bored": [
        "dog sigh",
        "dog yawn",
        "bored dog whine",
        "lonely dog cry",
        "dog whimpering alone",
        "sad dog whine",
        "dog soft moan",
        "restless dog whine",
    ],
    "Playful": [
        "playful dog bark",
        "excited dog barking",
        "puppy playing bark",
        "dog play growl",
        "happy dog bark",
        "puppy excited yelp",
        "dog fetch bark",
        "energetic dog bark",
    ],
}

BASE_URL = "https://freesound.org/apiv2"
OUTPUT_DIR = Path("Outputs/Raw_Emotion_Data")

# Defaults
DEFAULT_MAX_PER_EMOTION = 100
DEFAULT_MAX_DURATION = 10.0   # seconds
DEFAULT_MIN_DURATION = 0.3    # seconds
RESULTS_PER_PAGE = 15
REQUEST_DELAY = 0.6           # seconds between API calls (rate limiting)


def search_sounds(query: str, api_key: str, page_size: int = RESULTS_PER_PAGE) -> list:
    """Search Freesound for sounds matching a query string."""
    params = {
        "query": query,
        "token": api_key,
        "fields": "id,name,duration,previews,tags,type,avg_rating",
        "filter": f"duration:[{DEFAULT_MIN_DURATION} TO {DEFAULT_MAX_DURATION}]",
        "page_size": page_size,
        "sort": "rating_desc",
    }
    resp = requests.get(f"{BASE_URL}/search/text/", params=params, timeout=30)
    resp.raise_for_status()
    return resp.json().get("results", [])


def download_preview(sound: dict, output_path: Path) -> bool:
    """
    Download the HQ MP3 preview of a sound.
    Preview URLs are publicly accessible (no OAuth2 needed).
    """
    preview_url = sound.get("previews", {}).get("preview-hq-mp3")
    if not preview_url:
        return False

    resp = requests.get(preview_url, stream=True, timeout=60)
    resp.raise_for_status()

    with open(output_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
    return True


def convert_mp3_to_wav(mp3_path: Path, wav_path: Path) -> bool:
    """Convert an MP3 file to WAV using librosa + soundfile."""
    if not HAS_LIBROSA:
        return False
    try:
        y, sr = librosa.load(str(mp3_path), sr=None, mono=True)
        sf.write(str(wav_path), y, sr, subtype="PCM_16")
        return True
    except Exception as e:
        print(f"      Conversion error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Download dog emotion sounds from Freesound.org"
    )
    parser.add_argument(
        "--api-key",
        type=str,
        default=os.environ.get("FREESOUND_API_KEY"),
        help="Freesound API key (or set FREESOUND_API_KEY env var)",
    )
    parser.add_argument(
        "--max-per-emotion",
        type=int,
        default=DEFAULT_MAX_PER_EMOTION,
        help=f"Max clips to download per emotion (default: {DEFAULT_MAX_PER_EMOTION})",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(OUTPUT_DIR),
        help=f"Output directory (default: {OUTPUT_DIR})",
    )
    parser.add_argument(
        "--emotions",
        nargs="+",
        default=list(EMOTION_QUERIES.keys()),
        help="Which emotions to download (default: all)",
    )
    args = parser.parse_args()

    # ---- Validate ----
    if not args.api_key:
        print("ERROR: No API key provided.")
        print("  Use --api-key YOUR_KEY  or  set FREESOUND_API_KEY=YOUR_KEY")
        sys.exit(1)

    if not HAS_LIBROSA:
        print("WARNING: librosa/soundfile not installed. Files will be saved as .mp3")
        print("  Install with: pip install librosa soundfile")

    output_dir = Path(args.output_dir)
    total_downloaded = 0

    for emotion in args.emotions:
        if emotion not in EMOTION_QUERIES:
            print(f"WARNING: Unknown emotion '{emotion}', skipping.")
            continue

        queries = EMOTION_QUERIES[emotion]
        emotion_dir = output_dir / emotion
        emotion_dir.mkdir(parents=True, exist_ok=True)

        downloaded = 0
        seen_ids = set()

        # Count existing files to avoid re-downloading
        existing = list(emotion_dir.glob("freesound_*.*"))
        for f in existing:
            # Extract ID from filename: freesound_alert_12345.wav
            parts = f.stem.split("_")
            if len(parts) >= 3 and parts[-1].isdigit():
                seen_ids.add(int(parts[-1]))
                downloaded += 1

        print(f"\n{'='*60}")
        print(f"  Emotion: {emotion}")
        print(f"  Output:  {emotion_dir.resolve()}")
        print(f"  Existing: {len(existing)} files")
        print(f"  Target:  {args.max_per_emotion} clips")
        print(f"{'='*60}")

        if downloaded >= args.max_per_emotion:
            print(f"  Already have {downloaded} clips, skipping.")
            continue

        for query in queries:
            if downloaded >= args.max_per_emotion:
                break

            print(f"\n  Searching: \"{query}\"")
            try:
                results = search_sounds(query, args.api_key)
                time.sleep(REQUEST_DELAY)
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 401:
                    print("  ERROR: Invalid API key. Check your key and try again.")
                    sys.exit(1)
                print(f"  Search error: {e}")
                continue
            except Exception as e:
                print(f"  Search error: {e}")
                continue

            if not results:
                print(f"    No results found.")
                continue

            print(f"    Found {len(results)} results")

            for sound in results:
                if downloaded >= args.max_per_emotion:
                    break
                if sound["id"] in seen_ids:
                    continue

                seen_ids.add(sound["id"])
                sound_id = sound["id"]
                duration = sound.get("duration", 0)

                # Download as MP3 preview first
                mp3_filename = f"freesound_{emotion.lower()}_{sound_id}.mp3"
                wav_filename = f"freesound_{emotion.lower()}_{sound_id}.wav"
                wav_path = emotion_dir / wav_filename

                if wav_path.exists():
                    downloaded += 1
                    continue

                # Download to temp mp3, then convert
                mp3_temp = emotion_dir / mp3_filename

                try:
                    success = download_preview(sound, mp3_temp)
                    if not success:
                        print(f"    Skipped (no preview): {sound['name']}")
                        continue

                    # Convert MP3 → WAV
                    if HAS_LIBROSA:
                        converted = convert_mp3_to_wav(mp3_temp, wav_path)
                        if converted:
                            mp3_temp.unlink(missing_ok=True)  # Remove temp mp3
                            downloaded += 1
                            print(f"    [{downloaded:3d}] {wav_filename}  ({duration:.1f}s)")
                        else:
                            # Keep mp3 if conversion fails
                            downloaded += 1
                            print(f"    [{downloaded:3d}] {mp3_filename}  ({duration:.1f}s) [mp3 — conversion failed]")
                    else:
                        # No librosa → keep as mp3
                        downloaded += 1
                        print(f"    [{downloaded:3d}] {mp3_filename}  ({duration:.1f}s) [mp3]")

                    time.sleep(REQUEST_DELAY)

                except Exception as e:
                    print(f"    Error downloading {sound_id}: {e}")
                    mp3_temp.unlink(missing_ok=True)

        print(f"\n  ✓ {emotion}: {downloaded} clips saved to {emotion_dir.resolve()}")
        total_downloaded += downloaded

    # ---- Summary ----
    print(f"\n{'='*60}")
    print(f"  DOWNLOAD COMPLETE")
    print(f"  Total clips: {total_downloaded}")
    print(f"  Output dir:  {output_dir.resolve()}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()

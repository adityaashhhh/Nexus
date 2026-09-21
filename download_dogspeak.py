"""
download_dogspeak.py
====================
Downloads dog bark audio from the DogSpeak dataset (ArlingtonCL2/DogSpeak_Dataset)
on Hugging Face.

Uses huggingface_hub to download files directly (bypasses the `datasets` library
which fails due to non-standard metadata format in this dataset).

Auto-sorts clips into Alert / Bored / Playful using acoustic feature analysis.

Usage:
    python download_dogspeak.py
    python download_dogspeak.py --max-clips 300

Requirements:
    pip install huggingface_hub librosa soundfile numpy pandas
"""

import os
import sys
import argparse
import random
import numpy as np
from pathlib import Path

OUTPUT_DIR = Path("Outputs/Raw_Emotion_Data")
DATASET_REPO = "ArlingtonCL2/DogSpeak_Dataset"
DEFAULT_MAX_CLIPS = 300


# ===================================================================
#  ACOUSTIC AUTO-SORT ENGINE
# ===================================================================

def extract_features(y: np.ndarray, sr: int) -> dict:
    """Extract acoustic features from an audio clip for emotion classification."""
    import librosa

    if len(y) < sr * 0.1:
        return None

    features = {}

    # RMS Energy
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
    features["rms_mean"] = float(np.mean(rms))
    features["rms_std"] = float(np.std(rms))
    features["rms_max"] = float(np.max(rms))

    # Spectral Centroid (brightness)
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=512)[0]
    features["centroid_mean"] = float(np.mean(centroid))
    features["centroid_std"] = float(np.std(centroid))

    # Zero Crossing Rate (noisiness)
    zcr = librosa.feature.zero_crossing_rate(y, frame_length=2048, hop_length=512)[0]
    features["zcr_mean"] = float(np.mean(zcr))

    # Spectral Bandwidth
    bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr, hop_length=512)[0]
    features["bandwidth_mean"] = float(np.mean(bandwidth))

    # Spectral Rolloff
    rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, hop_length=512)[0]
    features["rolloff_mean"] = float(np.mean(rolloff))

    # MFCCs (first 5)
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=5, hop_length=512)
    for i in range(5):
        features[f"mfcc_{i}_mean"] = float(np.mean(mfccs[i]))

    # Onset rate
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512)
    onsets = librosa.onset.onset_detect(y=y, sr=sr, hop_length=512, onset_envelope=onset_env)
    duration = len(y) / sr
    features["onset_rate"] = len(onsets) / max(duration, 0.1)
    features["onset_strength_mean"] = float(np.mean(onset_env))
    features["onset_strength_std"] = float(np.std(onset_env))

    # Pitch (F0)
    try:
        f0, voiced_flag, _ = librosa.pyin(y, fmin=50, fmax=4000, sr=sr, hop_length=512)
        voiced_f0 = f0[~np.isnan(f0)] if f0 is not None else np.array([])
        if len(voiced_f0) > 2:
            features["pitch_mean"] = float(np.mean(voiced_f0))
            features["pitch_std"] = float(np.std(voiced_f0))
            features["pitch_range"] = float(np.max(voiced_f0) - np.min(voiced_f0))
            features["voiced_fraction"] = float(len(voiced_f0) / len(f0))
        else:
            features["pitch_mean"] = 0.0
            features["pitch_std"] = 0.0
            features["pitch_range"] = 0.0
            features["voiced_fraction"] = 0.0
    except Exception:
        features["pitch_mean"] = 0.0
        features["pitch_std"] = 0.0
        features["pitch_range"] = 0.0
        features["voiced_fraction"] = 0.0

    features["duration"] = duration
    return features


def classify_emotion(features: dict) -> str:
    """
    Rule-based emotion classifier using acoustic features.
    - ALERT:    Loud, harsh, rapid steady onsets, lower pitch
    - BORED:    Quiet, soft, few onsets, drawn-out, flat pitch
    - PLAYFUL:  Variable pitch, bright, energetic, irregular onsets
    """
    scores = {"Alert": 0.0, "Bored": 0.0, "Playful": 0.0}

    rms = features["rms_mean"]
    centroid = features["centroid_mean"]
    zcr = features["zcr_mean"]
    bandwidth = features["bandwidth_mean"]
    onset_rate = features["onset_rate"]
    onset_std = features["onset_strength_std"]
    pitch_mean = features["pitch_mean"]
    pitch_std = features["pitch_std"]
    pitch_range = features["pitch_range"]
    duration = features["duration"]
    voiced = features["voiced_fraction"]

    # ---- ALERT ----
    if rms > 0.08:
        scores["Alert"] += 2.0
    elif rms > 0.04:
        scores["Alert"] += 1.0
    if centroid > 3000:
        scores["Alert"] += 1.5
    elif centroid > 2000:
        scores["Alert"] += 0.5
    if zcr > 0.1:
        scores["Alert"] += 1.0
    if onset_rate > 2.0 and onset_std < np.mean([onset_std, 1.0]):
        scores["Alert"] += 1.5
    if 0 < pitch_mean < 500 and pitch_std < 100:
        scores["Alert"] += 1.0
    if features["rolloff_mean"] > 4000:
        scores["Alert"] += 0.5

    # ---- BORED ----
    if rms < 0.03:
        scores["Bored"] += 2.0
    elif rms < 0.06:
        scores["Bored"] += 1.0
    if centroid < 2000:
        scores["Bored"] += 1.5
    elif centroid < 2500:
        scores["Bored"] += 0.5
    if zcr < 0.05:
        scores["Bored"] += 1.0
    if onset_rate < 1.5:
        scores["Bored"] += 1.5
    if duration > 2.0:
        scores["Bored"] += 0.5
    if pitch_std < 50 and pitch_mean > 0:
        scores["Bored"] += 1.0
    if voiced > 0.6:
        scores["Bored"] += 0.5

    # ---- PLAYFUL ----
    if pitch_std > 100:
        scores["Playful"] += 2.0
    elif pitch_std > 50:
        scores["Playful"] += 1.0
    if pitch_range > 200:
        scores["Playful"] += 1.5
    if onset_rate > 3.0:
        scores["Playful"] += 1.0
    if onset_std > 1.0:
        scores["Playful"] += 1.0
    if bandwidth > 2500:
        scores["Playful"] += 0.5
    if rms > 0.05 and pitch_mean > 400:
        scores["Playful"] += 1.5
    if centroid > 2500 and pitch_std > 80:
        scores["Playful"] += 1.0

    return max(scores, key=scores.get)


# ===================================================================
#  DOWNLOAD VIA huggingface_hub (bypasses broken `datasets` loader)
# ===================================================================

def download_and_sort(max_clips: int):
    """
    Download DogSpeak .wav files using huggingface_hub and auto-sort
    into emotion folders using acoustic analysis.
    """
    try:
        from huggingface_hub import HfApi, hf_hub_download
    except ImportError:
        print("ERROR: 'huggingface_hub' not installed.")
        print("  Install with: pip install huggingface_hub")
        sys.exit(1)

    try:
        import librosa
        import soundfile as sf
    except ImportError:
        print("ERROR: 'librosa' and 'soundfile' are required.")
        print("  Install with: pip install librosa soundfile")
        sys.exit(1)

    # Create output folders
    for emotion in ["Alert", "Bored", "Playful"]:
        (OUTPUT_DIR / emotion).mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"  DogSpeak Downloader (via huggingface_hub)")
    print(f"  Repo:    {DATASET_REPO}")
    print(f"  Target:  {max_clips} clips")
    print(f"  Output:  {OUTPUT_DIR.resolve()}")
    print(f"{'='*60}\n")

    # Step 1: List all .wav files in the repo
    print("  Listing files in repository...")
    api = HfApi()

    try:
        all_files = api.list_repo_files(
            repo_id=DATASET_REPO,
            repo_type="dataset",
        )
    except Exception as e:
        print(f"  ERROR listing repo files: {e}")
        print(f"  Try: pip install --upgrade huggingface_hub")
        print(f"  Or:  huggingface-cli login")
        sys.exit(1)

    wav_files = [f for f in all_files if f.lower().endswith(".wav")]
    print(f"  Found {len(wav_files)} .wav files in repo")

    if not wav_files:
        print("  ERROR: No .wav files found in repository.")
        sys.exit(1)

    # Shuffle and take a sample
    random.shuffle(wav_files)
    wav_files = wav_files[:max_clips * 2]  # Download extra in case some fail

    # Step 2: Download and classify each file
    counts = {"Alert": 0, "Bored": 0, "Playful": 0}
    skipped = 0
    errors = 0
    total = 0

    print(f"  Downloading and auto-sorting by acoustic features...\n")

    for idx, wav_path in enumerate(wav_files):
        if total >= max_clips:
            break

        try:
            # Download the file to HF cache
            local_path = hf_hub_download(
                repo_id=DATASET_REPO,
                filename=wav_path,
                repo_type="dataset",
            )

            # Load audio
            y, sr = librosa.load(local_path, sr=None, mono=True)
            duration = len(y) / sr

            # Skip very short or very long clips
            if duration < 0.3 or duration > 15.0:
                skipped += 1
                continue

            # Extract features and classify
            features = extract_features(y, sr)
            if features is None:
                skipped += 1
                continue

            emotion = classify_emotion(features)

            # Build output filename
            # wav_path might be like "dog_1/bark_001.wav"
            safe_name = wav_path.replace("/", "_").replace("\\", "_")
            filename = f"dogspeak_{emotion.lower()}_{counts[emotion]:04d}_{safe_name}"
            filepath = OUTPUT_DIR / emotion / filename

            if filepath.exists():
                counts[emotion] += 1
                total += 1
                continue

            # Save to output directory
            sf.write(str(filepath), y, sr, subtype="PCM_16")
            counts[emotion] += 1
            total += 1

            if total % 10 == 0 or total <= 5:
                conf_note = ""
                if emotion == "Alert":
                    conf_note = f"rms={features['rms_mean']:.3f} centroid={features['centroid_mean']:.0f}"
                elif emotion == "Bored":
                    conf_note = f"rms={features['rms_mean']:.3f} onsets={features['onset_rate']:.1f}/s"
                else:
                    conf_note = f"pitch_std={features['pitch_std']:.0f} onset_rate={features['onset_rate']:.1f}/s"
                print(f"    [{total:4d}/{max_clips}] {emotion:8s} | {filename[:60]}")
                print(f"             ({duration:.1f}s) [{conf_note}]")

        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"    Error on {wav_path}: {e}")

    # ---- Summary ----
    print(f"\n  {'='*55}")
    print(f"  AUTO-SORT COMPLETE")
    print(f"  {'='*55}")
    for emotion, count in counts.items():
        total_folder = len(list((OUTPUT_DIR / emotion).glob("dogspeak_*.wav")))
        bar = "█" * min(count // 3, 30)
        print(f"    {emotion:10s}: {count:4d} clips  {bar}")
    print(f"    Skipped:     {skipped}")
    print(f"    Errors:      {errors}")
    print(f"    Output:      {OUTPUT_DIR.resolve()}")
    print(f"  {'='*55}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Download & auto-sort DogSpeak clips into emotion folders"
    )
    parser.add_argument(
        "--max-clips", type=int, default=DEFAULT_MAX_CLIPS,
        help=f"Max clips to download (default: {DEFAULT_MAX_CLIPS})",
    )
    args = parser.parse_args()

    download_and_sort(max_clips=args.max_clips)


if __name__ == "__main__":
    main()

"""
download_barkopedia.py
======================
Downloads dog vocalization audio from the Barkopedia datasets
(ArlingtonCL2) on Hugging Face.

Uses huggingface_hub to directly download .wav files (bypasses the
`datasets` library which has compatibility issues with this repo).

Auto-sorts clips into Alert/Bored/Playful using acoustic feature analysis.

Usage:
    python download_barkopedia.py
    python download_barkopedia.py --max-clips 200

Requirements:
    pip install huggingface_hub librosa soundfile numpy
"""

import os
import sys
import argparse
import random
import numpy as np
from pathlib import Path

OUTPUT_DIR = Path("Outputs/Raw_Emotion_Data")
DEFAULT_MAX_CLIPS = 200

# Repos to try in priority order
REPOS = [
    "ArlingtonCL2/Barkopedia-Dog-Emotion-Classification",
    "ArlingtonCL2/Barkopedia-Dog-Emotion",
    "ArlingtonCL2/Barkopedia-Dog-Vocal-Detection",
    "ArlingtonCL2/Barkopedia",
]


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
#  DOWNLOAD VIA huggingface_hub (reliable direct file download)
# ===================================================================

def find_working_repo() -> str:
    """Try each Barkopedia repo and return the first one that has .wav files."""
    from huggingface_hub import HfApi

    api = HfApi()

    for repo_id in REPOS:
        print(f"  Trying: {repo_id} ...")
        try:
            all_files = api.list_repo_files(repo_id=repo_id, repo_type="dataset")
            wav_files = [f for f in all_files if f.lower().endswith((".wav", ".flac", ".mp3", ".ogg"))]
            if wav_files:
                print(f"    ✓ Found {len(wav_files)} audio files")
                return repo_id
            else:
                print(f"    No audio files found ({len(all_files)} total files)")
        except Exception as e:
            print(f"    Not available: {e}")

    return None


def download_and_sort(max_clips: int, repo_override: str = None):
    """Download audio files from Barkopedia and auto-sort into emotion folders."""
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
    print(f"  Barkopedia Downloader (via huggingface_hub)")
    print(f"  Target:  {max_clips} clips")
    print(f"  Output:  {OUTPUT_DIR.resolve()}")
    print(f"{'='*60}\n")

    # Find a repo with audio files
    if repo_override:
        repo_id = repo_override
        print(f"  Using specified repo: {repo_id}")
    else:
        repo_id = find_working_repo()

    if not repo_id:
        print("\n  ERROR: No Barkopedia repo with audio files found.")
        print("  Possible fixes:")
        print("    1. pip install --upgrade huggingface_hub")
        print("    2. huggingface-cli login")
        sys.exit(1)

    # List audio files
    api = HfApi()
    all_files = api.list_repo_files(repo_id=repo_id, repo_type="dataset")
    audio_files = [f for f in all_files if f.lower().endswith((".wav", ".flac", ".mp3", ".ogg"))]

    print(f"\n  ✓ Repo: {repo_id}")
    print(f"    Audio files available: {len(audio_files)}")

    if not audio_files:
        print("  ERROR: No audio files found in repository.")
        sys.exit(1)

    # Shuffle and limit
    random.shuffle(audio_files)
    audio_files = audio_files[:max_clips * 2]  # Extra in case some fail

    # Download and classify
    counts = {"Alert": 0, "Bored": 0, "Playful": 0}
    skipped = 0
    errors = 0
    total = 0

    print(f"  Downloading and auto-sorting by acoustic features...\n")

    for idx, audio_path in enumerate(audio_files):
        if total >= max_clips:
            break

        try:
            # Download to HF cache
            local_path = hf_hub_download(
                repo_id=repo_id,
                filename=audio_path,
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
            safe_name = audio_path.replace("/", "_").replace("\\", "_")
            # Ensure .wav extension
            base_name = os.path.splitext(safe_name)[0]
            filename = f"barkopedia_{emotion.lower()}_{counts[emotion]:04d}_{base_name}.wav"
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
                print(f"    Error on {audio_path}: {e}")

    # ---- Summary ----
    print(f"\n  {'='*55}")
    print(f"  AUTO-SORT COMPLETE")
    print(f"  {'='*55}")
    for emotion, count in counts.items():
        bar = "█" * min(count // 2, 30)
        print(f"    {emotion:10s}: {count:4d} clips  {bar}")
    print(f"    Skipped:     {skipped}")
    print(f"    Errors:      {errors}")
    print(f"    Output:      {OUTPUT_DIR.resolve()}")
    print(f"  {'='*55}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Download Barkopedia dog vocalization data from Hugging Face"
    )
    parser.add_argument(
        "--max-clips", type=int, default=DEFAULT_MAX_CLIPS,
        help=f"Max clips to download (default: {DEFAULT_MAX_CLIPS})",
    )
    parser.add_argument(
        "--repo", type=str, default=None,
        help="Specific HuggingFace repo to use (e.g., ArlingtonCL2/Barkopedia-Dog-Vocal-Detection)",
    )
    args = parser.parse_args()

    download_and_sort(max_clips=args.max_clips, repo_override=args.repo)


if __name__ == "__main__":
    main()

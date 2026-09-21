# 🐕 Scenario Trigger Detection System — Complete Project Context

> **Purpose of this document**: This is a complete context handoff document. Copy-paste this ENTIRE document into a new AI chat so that AI has full context of what we've built, what we need to build next, and all the technical decisions already made. After pasting, you can ask the AI to implement any part of this system.

---

## PART 1: WHAT WE HAVE ALREADY BUILT

### 1.1 Project Overview

We are building a **pet camera app** that listens to a dog's audio and tells the owner what's happening at home. 

**What's done so far:**
- A **Dog Emotion Classifier** that listens to dog sounds and classifies them into 3 emotions:
  - `High_Arousal` — dog is excited, anxious, alert (loud barking, aggressive sounds)
  - `Low_Arousal` — dog is bored, sad, tired (soft whining, sighing)
  - `Playful` — dog is playing, happy (variable pitch barking, energetic)
- **Accuracy**: 80%
- **Model**: WavLM (audio transformer, pretrained) + acoustic features → RandomForest ensemble
- **Audio format**: 16kHz mono WAV, processed in 3-second chunks

### 1.2 Existing Codebase Structure

```
project/
├── download_barkopedia.py      # Downloads dog audio from HuggingFace (Barkopedia dataset)
├── download_dogspeak.py        # Downloads dog audio from HuggingFace (DogSpeak dataset)
├── download_freesound.py       # Downloads dog audio from Freesound.org API
├── Outputs/
│   └── Raw_Emotion_Data/
│       ├── Alert/              # Dog sounds classified as alert/high arousal
│       ├── Bored/              # Dog sounds classified as bored/low arousal
│       └── Playful/            # Dog sounds classified as playful
├── backend/                    # Node.js + Express + MongoDB REST API (for the app)
├── frontend/                   # Web frontend with dark UI
├── README.md
└── SCALABILITY.md
```

### 1.3 Existing Feature Extraction Code (Used in Dog Emotion Classifier)

This is the exact feature extraction function used in our existing pipeline. The new system must be compatible with this:

```python
import numpy as np
import librosa

def extract_features(y: np.ndarray, sr: int) -> dict:
    """Extract acoustic features from an audio clip for emotion classification."""
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

    # Pitch (F0) using pYIN
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
```

### 1.4 Existing Rule-Based Emotion Classifier

This was the initial rule-based classifier used for auto-sorting downloaded audio. The actual production model uses WavLM + RandomForest, but these rules show our acoustic understanding:

```python
def classify_emotion(features: dict) -> str:
    """
    Rule-based emotion classifier:
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

    # ALERT scoring
    if rms > 0.08: scores["Alert"] += 2.0
    elif rms > 0.04: scores["Alert"] += 1.0
    if centroid > 3000: scores["Alert"] += 1.5
    elif centroid > 2000: scores["Alert"] += 0.5
    if zcr > 0.1: scores["Alert"] += 1.0
    if onset_rate > 2.0 and onset_std < np.mean([onset_std, 1.0]): scores["Alert"] += 1.5
    if 0 < pitch_mean < 500 and pitch_std < 100: scores["Alert"] += 1.0
    if features["rolloff_mean"] > 4000: scores["Alert"] += 0.5

    # BORED scoring
    if rms < 0.03: scores["Bored"] += 2.0
    elif rms < 0.06: scores["Bored"] += 1.0
    if centroid < 2000: scores["Bored"] += 1.5
    elif centroid < 2500: scores["Bored"] += 0.5
    if zcr < 0.05: scores["Bored"] += 1.0
    if onset_rate < 1.5: scores["Bored"] += 1.5
    if duration > 2.0: scores["Bored"] += 0.5
    if pitch_std < 50 and pitch_mean > 0: scores["Bored"] += 1.0
    if voiced > 0.6: scores["Bored"] += 0.5

    # PLAYFUL scoring
    if pitch_std > 100: scores["Playful"] += 2.0
    elif pitch_std > 50: scores["Playful"] += 1.0
    if pitch_range > 200: scores["Playful"] += 1.5
    if onset_rate > 3.0: scores["Playful"] += 1.0
    if onset_std > 1.0: scores["Playful"] += 1.0
    if bandwidth > 2500: scores["Playful"] += 0.5
    if rms > 0.05 and pitch_mean > 400: scores["Playful"] += 1.5
    if centroid > 2500 and pitch_std > 80: scores["Playful"] += 1.0

    return max(scores, key=scores.get)
```

### 1.5 Data Sources Already Set Up

| Source | What it provides | Status |
|--------|-----------------|--------|
| Barkopedia (HuggingFace) | Dog bark audio, auto-sorted into Alert/Bored/Playful | ✅ Download script ready |
| DogSpeak (HuggingFace) | Dog bark audio, auto-sorted into Alert/Bored/Playful | ✅ Download script ready |
| Freesound.org API | Dog emotion sounds (Alert/Bored/Playful search queries) | ✅ Download script ready |

---

## PART 2: WHAT WE NEED TO BUILD NOW — SCENARIO TRIGGER DETECTION SYSTEM

### 2.1 The Goal

We need to go beyond just detecting dog emotions. We need to detect **5 real-world scenarios** (situations) by combining:
- **Dog emotion output** (from our existing WavLM + RandomForest model)
- **Environmental sound detection** (NEW — we need to build this)

Think of it as: Dog AI tells us "the dog is anxious" + Environment AI tells us "a door slammed" → System concludes "Owner just left and dog has separation anxiety!"

### 2.2 System Architecture

```
🎤 Microphone (16kHz mono, continuous)
         ↓
   3-second audio chunks (48,000 samples each)
         ↓
    ┌────┴────────────┐
    ↓                 ↓
🐕 DOG EMOTION AI    🌍 ENVIRONMENT AI
(Existing model)     (New — YAMNet based)
WavLM + RandomForest  Fine-tuned YAMNet-Lite
    ↓                 ↓
"High_Arousal"       "doorbell" (conf: 0.85)
    ↓                 ↓
    └────┬────────────┘
         ↓
  🧠 SCENARIO FUSION ENGINE
  (State machines with time windows)
  (Combines both outputs over 30-120 seconds)
         ↓
  Which of the 5 scenarios is happening?
         ↓
  🚨 Alert / Notification to owner's phone
```

### 2.3 The 5 Scenarios — Detailed Specs

---

#### SCENARIO 1: "Owner Left" (Separation Anxiety)

**What happens**: Owner leaves the house (door closes), dog is alone, starts whining/crying that escalates over time.

**Detection logic — ALL conditions must be true:**
1. Door slam/close detected by environment AI within last 120 seconds
2. No human speech detected for ≥ 60 seconds after door event
3. Dog emotion = `High_Arousal` for ≥ 5 consecutive 3-second chunks (15 seconds total)
4. Whine-like spectral signature: `pitch_mean` between 300-800 Hz, `bandwidth_mean` < 1500
5. RMS energy is escalating (getting louder over 60-second window)

**Audio feature signatures:**
| Feature | Pattern | Threshold |
|---------|---------|-----------|
| Dog Emotion | `High_Arousal` sustained | ≥5 consecutive chunks |
| Vocalization | Whining → transitioning to barking | pitch 300-800Hz, narrow bandwidth |
| Temporal | Escalation — gets louder over time | Δrms > +0.02 over 20 chunks |
| Silence gaps | Burst-pause-burst pattern | silence ratio 0.3-0.7 per 60s |
| Env: Door | Door slam/close sound | YAMNet confidence > 0.4 |
| Env: Speech | Human speech absent | No speech for 60s+ |
| Onset pattern | Repetitive, rhythmic whining | onset_strength_std < 0.8 |

**False positives to handle:**
- TV door sounds → Check for `television`/`music` in env channel, require door+footsteps sequence
- Dog playing alone → If any `Playful` emotion in last 30s, suppress this scenario
- Thunder/fireworks anxiety → Route to Scenario 4 instead if `thunder`/`fireworks` detected

**State machine code:**
```python
from collections import deque
import numpy as np

class OwnerLeftDetector:
    DOOR_LOOKBACK_S = 120
    SILENCE_REQUIRED_S = 60
    MIN_DISTRESS_CHUNKS = 5
    RMS_ESCALATION_DELTA = 0.02

    def __init__(self):
        self.door_event_time = None
        self.speech_last_seen = None
        self.distress_streak = 0
        self.rms_history = deque(maxlen=40)  # 40 × 3s = 120s

    def update(self, chunk_result: dict, timestamp: float) -> bool:
        if chunk_result['env_class'] in ('door_slam', 'door_close', 'door_knock'):
            if chunk_result['env_confidence'] > 0.4:
                self.door_event_time = timestamp

        if chunk_result['env_class'] == 'speech':
            self.speech_last_seen = timestamp

        if chunk_result['dog_emotion'] == 'High_Arousal':
            self.distress_streak += 1
        else:
            self.distress_streak = 0

        self.rms_history.append(chunk_result['rms_mean'])

        door_recent = (self.door_event_time is not None and
                       timestamp - self.door_event_time < self.DOOR_LOOKBACK_S)
        no_speech = (self.speech_last_seen is None or
                     timestamp - self.speech_last_seen > self.SILENCE_REQUIRED_S)
        sustained_distress = self.distress_streak >= self.MIN_DISTRESS_CHUNKS

        escalating = False
        if len(self.rms_history) >= 20:
            first_half = np.mean(list(self.rms_history)[:10])
            second_half = np.mean(list(self.rms_history)[-10:])
            escalating = (second_half - first_half) > self.RMS_ESCALATION_DELTA

        return door_recent and no_speech and sustained_distress and escalating
```

---

#### SCENARIO 2: "Stranger Detected" (Intruder Alert Barking)

**What happens**: Unknown person approaches the house. Doorbell rings or knock happens. Dog immediately starts aggressive territorial barking.

**Detection logic — scoring system (threshold = 7.0 points):**
| Condition | Points |
|-----------|--------|
| Doorbell/knock detected in env channel | +3.0 |
| Approaching footsteps (RMS increasing) | +2.0 |
| Dog emotion = `High_Arousal` | +2.0 |
| Bark onset_rate > 3/s (rapid barking) | +1.5 |
| No `Playful` emotion in last 30s | +1.0 |
| Unknown speech detected | +1.5 |
| Bark is regular/rhythmic (low onset_std) | +1.0 |

**Audio feature signatures:**
| Feature | Pattern | Threshold |
|---------|---------|-----------|
| Dog Emotion | `High_Arousal` — sudden onset | Immediate, no warm-up |
| Bark type | Loud, low-frequency, rapid | rms > 0.08, pitch 80-400Hz, onset_rate > 3/s |
| Bark regularity | Metronome-like rhythm | onset_strength_std < 0.5 |
| Env: Doorbell | Doorbell or knock | YAMNet conf > 0.5 |
| Env: Footsteps | Approaching (RMS increasing) | footsteps with increasing energy |
| Spectral | Harsh, broadband | centroid > 2500, zcr > 0.10 |
| Growl | Low-frequency component | Energy in 80-300Hz band |

**False positives:**
- Family member arriving → Owner voice recognition (advanced) or app toggle
- TV doorbell → Check for sustained `television` in background
- Dog barking at other dogs outside → Route to Scenario 3 if external bark detected

**State machine code:**
```python
class StrangerDetector:
    TRIGGER_THRESHOLD = 7.0

    def __init__(self):
        self.event_buffer = deque(maxlen=10)  # last 10 chunks (30s)

    def update(self, chunk_result: dict, timestamp: float) -> tuple:
        self.event_buffer.append((timestamp, chunk_result))
        score = 0.0

        for t, cr in self.event_buffer:
            if cr['env_class'] in ('doorbell', 'door_knock') and cr['env_confidence'] > 0.5:
                score += 3.0
                break

        cr = chunk_result
        if cr['dog_emotion'] == 'High_Arousal': score += 2.0
        if cr.get('onset_rate', 0) > 3.0: score += 1.5
        if cr.get('onset_strength_std', 999) < 0.5: score += 1.0
        if cr['env_class'] == 'speech' and cr['env_confidence'] > 0.3: score += 1.5

        recent_playful = any(cr2['dog_emotion'] == 'Playful' for _, cr2 in self.event_buffer)
        if not recent_playful: score += 1.0

        footstep_rms = [cr2['rms_mean'] for _, cr2 in self.event_buffer if cr2['env_class'] == 'footsteps']
        if len(footstep_rms) >= 2 and footstep_rms[-1] > footstep_rms[0]: score += 2.0

        return score >= self.TRIGGER_THRESHOLD, score
```

---

#### SCENARIO 3: "Other Dog Vocalization" (External Dog Triggers Response)

**What happens**: A nearby dog (neighbor's dog, street dog) barks. Our dog hears it and barks back. There's a "call-and-response" pattern between two dogs.

**Detection logic — 3 out of 4 conditions must be true:**
1. Dual bark sources detected (two distinct pitches in audio — pitch bimodality)
2. Dog emotion = `High_Arousal` or `Playful`
3. YAMNet detects `dog`/`animal`/`bark` in environmental channel
4. Near-far energy ratio > 2.5 (our dog is louder than external dog)

**Key technique — dual source detection:**
Since one mic captures both dogs, we detect two sources by:
- Splitting audio into 250ms sub-frames
- Extracting pitch per sub-frame
- Checking if pitches cluster into 2 groups separated by >100Hz
- Checking for alternating energy pattern (call-and-response)

```python
def detect_dual_bark_sources(y, sr):
    import librosa
    frame_len = int(sr * 0.25)
    frames = [y[i:i+frame_len] for i in range(0, len(y)-frame_len, frame_len)]

    pitches, energies = [], []
    for frame in frames:
        rms = float(np.sqrt(np.mean(frame**2)))
        energies.append(rms)
        f0, _, _ = librosa.pyin(frame, fmin=50, fmax=2000, sr=sr)
        voiced = f0[~np.isnan(f0)] if f0 is not None else np.array([])
        pitches.append(float(np.median(voiced)) if len(voiced) > 0 else 0.0)

    voiced_pitches = [p for p in pitches if p > 50]
    is_bimodal = False
    if len(voiced_pitches) >= 4:
        from scipy.cluster.vq import kmeans
        centroids, _ = kmeans(np.array(voiced_pitches), 2)
        if abs(centroids[0] - centroids[1]) > 100:
            is_bimodal = True

    energy_diff = np.diff(energies)
    sign_changes = np.sum(np.abs(np.diff(np.sign(energy_diff))) > 0)
    has_alternation = sign_changes >= 4

    high_e = [e for e in energies if e > np.median(energies)]
    low_e = [e for e in energies if e <= np.median(energies) and e > 0.005]
    ratio = np.mean(high_e) / np.mean(low_e) if low_e else 1.0

    return {'is_bimodal': is_bimodal, 'has_alternation': has_alternation, 'near_far_ratio': ratio}
```

**False positives:**
- TV with dog sounds → Check for `television` env class
- Squeaky toy → Toys have more tonal peaks (higher spectral flatness), add `toy_squeak` negative class
- Echo in room → Echo ratio < 2.0 vs real second source > 3.0

---

#### SCENARIO 4: "Siren / High-Frequency Sound" (Environmental Trigger → Howling)

**What happens**: Ambulance siren, fire alarm, or high-pitched sound plays. Dog responds by howling ("Awoooo").

**Detection logic — sequential:**
1. YAMNet detects `siren`, `alarm`, `emergency_vehicle`, or `whistle` (confidence > 0.5)
2. Within 2-10 seconds after siren onset, dog starts howling
3. Howl is confirmed by: voiced_fraction > 0.6, continuous vocalization > 1.5s, bandwidth < 1200, pitch_range > 200, harmonic-to-noise ratio > 8 dB

**Howl vs Bark distinction:**
```
Bark:  "BHOW! BHOW! BHOW!"  → Short, sharp, broadband, high onset_rate
Howl:  "Awooooooooo~"       → Long, sustained, narrow-band, rising pitch, high voiced_fraction
```

**Howl detection code:**
```python
def detect_howl(y, sr):
    import librosa
    features = {}

    f0, _, _ = librosa.pyin(y, fmin=50, fmax=2000, sr=sr, hop_length=256)
    voiced_f0 = f0[~np.isnan(f0)] if f0 is not None else np.array([])
    features['voiced_fraction'] = len(voiced_f0) / max(len(f0), 1)

    if len(voiced_f0) > 10:
        x = np.arange(len(voiced_f0))
        slope = np.polyfit(x, voiced_f0, 1)[0]
        features['pitch_slope'] = slope
        features['pitch_range'] = float(np.max(voiced_f0) - np.min(voiced_f0))
    else:
        features['pitch_slope'] = 0
        features['pitch_range'] = 0

    bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr, hop_length=256)[0]
    features['bandwidth_mean'] = float(np.mean(bandwidth))

    rms = librosa.feature.rms(y=y, frame_length=1024, hop_length=256)[0]
    is_voiced = rms > 0.02
    max_run, current_run = 0, 0
    for v in is_voiced:
        if v: current_run += 1; max_run = max(max_run, current_run)
        else: current_run = 0
    features['max_voiced_duration'] = max_run * 256 / sr

    harmonic, percussive = librosa.effects.hpss(y)
    hnr = np.mean(harmonic**2) / max(np.mean(percussive**2), 1e-10)
    features['hnr_ratio'] = float(10 * np.log10(max(hnr, 1e-10)))

    is_howl = (features['voiced_fraction'] > 0.6 and
               features['max_voiced_duration'] > 1.5 and
               features['bandwidth_mean'] < 1200 and
               features['pitch_range'] > 200 and
               features['hnr_ratio'] > 8)

    return is_howl, features
```

**False positives:**
- Music with high notes → Check for `music` env class
- Wind noise → Wind has flat spectrum, siren has up-down modulation
- Microwave beep → Too short (<0.5s) vs siren (>2s)

---

#### SCENARIO 5: "Attention Seeking" (Repetitive Whining / Scratching)

**What happens**: Dog wants owner's attention. Repeatedly whines ("eee-eee-eee") or scratches at door. No external trigger — dog is just bored/needy.

**Detection logic — ALL conditions:**
1. Dog emotion = `Low_Arousal` for ≥ 80% of last 60 seconds (16+ out of 20 chunks)
2. No environmental trigger detected (no siren, doorbell, other dog, speech)
3. Repetitive pattern detected via autocorrelation (peak > 0.3 in 0.5-5s lag range)
4. Either whine signature (pitch > 500Hz, rms < 0.06) OR scratch signature (spectral_flatness > 0.3, onset_rate > 2/s)

**Repetition detection code:**
```python
def detect_repetitive_pattern(onset_envelope, sr, hop_length=512):
    onset_norm = (onset_envelope - np.mean(onset_envelope)) / (np.std(onset_envelope) + 1e-8)
    autocorr = np.correlate(onset_norm, onset_norm, mode='full')
    autocorr = autocorr[len(autocorr)//2:]
    autocorr = autocorr / autocorr[0]

    time_per_frame = hop_length / sr
    min_lag = int(0.5 / time_per_frame)
    max_lag = int(5.0 / time_per_frame)

    search_region = autocorr[min_lag:max_lag]
    if len(search_region) == 0:
        return False, 0.0, 0.0

    peak_idx = np.argmax(search_region) + min_lag
    peak_value = autocorr[peak_idx]
    repetition_period = peak_idx * time_per_frame

    return peak_value > 0.3, peak_value, repetition_period
```

**Scoring:**
```
score = (low_arousal_ratio × 3) + (3.0 if no_triggers) + (2.0 if repetitive) + (2.0 if whine_or_scratch)
Trigger if score ≥ 7.0
```

**False positives:**
- Snoring → Very low RMS (<0.01), nighttime suppression
- HVAC/fan hum → High spectral_flatness (>0.6), no pitch — add `machinery` negative class
- Separation anxiety (Scenario 1) → Differentiate: attention seeking has no door event, no escalation

---

## PART 3: ENVIRONMENT SOUND DETECTOR (NEW MODEL TO BUILD)

### 3.1 Architecture Choice: Fine-tuned YAMNet

**YAMNet** = Google's pre-trained audio classifier (MobileNet v1 backbone, trained on AudioSet with 521 classes)

**Why YAMNet:**
- Only **3.7 MB** as TFLite (fits on Raspberry Pi)
- **~45ms inference** per 3s chunk on Pi 4
- Already knows 521 sound types — we just fine-tune the last layers for our 12 classes
- Native TFLite export for edge deployment

### 3.2 Target Classes (12 classes)

```python
ENV_CLASSES = [
    'door_slam',         # Scenarios 1, 2
    'doorbell',          # Scenario 2
    'footsteps',         # Scenarios 1, 2
    'speech',            # Scenarios 1, 2, 5
    'dog_bark_external', # Scenario 3
    'siren',             # Scenario 4
    'car_horn',          # Scenario 4
    'alarm',             # Scenario 4
    'scratching',        # Scenario 5
    'music_television',  # False positive suppressor
    'silence',           # Baseline
    'background_noise',  # Baseline
]
```

### 3.3 Fine-tuning Code

```python
import tensorflow as tf
import tensorflow_hub as hub

yamnet_model = hub.load('https://tfhub.dev/google/yamnet/1')

# Build fine-tuning model
inputs = tf.keras.Input(shape=(48000,), dtype=tf.float32)  # 3s × 16kHz

class YAMNetEmbedding(tf.keras.layers.Layer):
    def __init__(self, yamnet):
        super().__init__()
        self.yamnet = yamnet
    def call(self, waveform):
        scores, embeddings, log_mel = self.yamnet(waveform)
        return tf.reduce_mean(embeddings, axis=0, keepdims=True)

yamnet_embed = YAMNetEmbedding(yamnet_model)
x = yamnet_embed(inputs)
x = tf.keras.layers.Dense(256, activation='relu')(x)
x = tf.keras.layers.Dropout(0.3)(x)
x = tf.keras.layers.Dense(128, activation='relu')(x)
x = tf.keras.layers.Dropout(0.2)(x)
outputs = tf.keras.layers.Dense(12, activation='softmax')(x)

model = tf.keras.Model(inputs, outputs)
model.compile(optimizer=tf.keras.optimizers.Adam(1e-4),
              loss='categorical_crossentropy', metrics=['accuracy'])

# After training → convert to TFLite with INT8 quantization
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()
with open('env_detector.tflite', 'wb') as f:
    f.write(tflite_model)
```

### 3.4 Datasets for Training Environment Detector

| Dataset | What it provides | Download URL | License | Size |
|---------|-----------------|--------------|---------|------|
| **ESC-50** | 50 environmental sound classes (door, siren, dog, etc.) — 40 clips each | https://github.com/karolpiczak/ESC-50 | CC BY-NC 3.0 | ~600 MB |
| **UrbanSound8K** | 8,732 urban sound clips (siren, car_horn, etc.) | https://zenodo.org/record/1203745 | CC BY-NC 4.0 | ~5.6 GB |
| **FSD50K** | 51,197 clips across 200 classes (scratch, tap, door, etc.) | https://zenodo.org/record/4060432 | CC BY 4.0 | ~28 GB |
| **AudioSet** | Google's massive dataset — thousands per class | https://research.google.com/audioset/ | CC BY 4.0 | Streaming |
| **SONYC-UST** | Urban sound tagging (sirens, horns, engines) | https://zenodo.org/record/3966543 | CC BY 4.0 | ~3 GB |
| **LibriSpeech** | Speech detection — clean speech recordings | https://www.openslr.org/12/ | CC BY 4.0 | ~350 MB |
| **Barkopedia** | Dog barks (re-use as "external dog bark" training data) | HuggingFace: ArlingtonCL2/Barkopedia-* | Varies | ~500 MB |
| **DogSpeak** | Dog barks (same as above) | HuggingFace: ArlingtonCL2/DogSpeak_Dataset | Varies | ~300 MB |

### 3.5 Minimum Data Requirements Per Class

| Class | Minimum | Recommended | Best Sources |
|-------|---------|-------------|-------------|
| door_slam | 100 | 300 | ESC-50 (40) + FSD50K (100+) + AudioSet (150+) |
| doorbell | 100 | 250 | ESC-50 (40) + AudioSet (200+) |
| footsteps | 150 | 400 | FSD50K (200+) + AudioSet (200+) |
| speech | 200 | 500 | LibriSpeech (unlimited) + AudioSet |
| dog_bark_external | 150 | 400 | Existing Barkopedia/DogSpeak data + ESC-50 |
| siren | 100 | 300 | UrbanSound8K (929) + ESC-50 (40) + AudioSet |
| car_horn | 80 | 200 | UrbanSound8K (429) + ESC-50 (40) |
| alarm | 100 | 250 | ESC-50 (40) + AudioSet (200+) |
| scratching | 50 + augmentation | 200 | FSD50K + custom recording (ESSENTIAL) |
| music_television | 150 | 400 | FSD50K + AudioSet |
| silence | 100 | 200 | Record from target environment |
| background_noise | 100 | 200 | Record ambient in deployment room |

**Data augmentation** to reach recommended counts (can 5× your data):
- Time stretching (0.8×, 1.2×)
- Pitch shifting (±2 semitones)
- Adding background noise at SNR 10-20 dB
- Random gain (±6 dB)
- Mix environmental sound + dog bark at various ratios

---

## PART 4: COMPLETE REAL-TIME PIPELINE CODE

```python
"""
scenario_trigger_pipeline.py — Complete real-time pipeline
Combines: Dog Emotion AI + Environment AI + 5 Scenario Detectors
"""
import numpy as np
import time
from collections import deque
from dataclasses import dataclass

@dataclass
class ChunkResult:
    timestamp: float
    dog_emotion: str            # 'High_Arousal', 'Low_Arousal', 'Playful'
    dog_confidence: float
    env_class: str              # One of ENV_CLASSES
    env_confidence: float
    rms_mean: float
    pitch_mean: float
    pitch_std: float
    onset_rate: float
    onset_strength_std: float
    bandwidth_mean: float
    spectral_flatness: float
    voiced_fraction: float
    is_repetitive: bool = False
    near_far_ratio: float = 1.0
    is_howl: bool = False


class ScenarioTriggerSystem:
    def __init__(self, dog_model, env_model_path: str):
        self.dog_model = dog_model
        # self.env_interpreter = tflite.Interpreter(model_path=env_model_path)
        # self.env_interpreter.allocate_tensors()

        self.detectors = {
            'owner_left': OwnerLeftDetector(),
            'stranger': StrangerDetector(),
            'other_dog': OtherDogDetector(),
            'siren_howl': SirenHowlDetector(),
            'attention_seeking': AttentionSeekingDetector(),
        }
        self.inference_times = deque(maxlen=100)

    def process_chunk(self, audio: np.ndarray, sr: int = 16000) -> dict:
        t_start = time.monotonic()
        timestamp = time.time()

        # Step 1: Extract acoustic features
        features = self._extract_features(audio, sr)

        # Step 2: Dog emotion (existing model)
        dog_emotion, dog_conf = self._classify_dog_emotion(audio, sr)

        # Step 3: Environment sound (new model)
        env_class, env_conf = self._classify_env_sound(audio, sr)

        # Step 4: Special detections
        is_howl, _ = detect_howl(audio, sr)
        is_repetitive, _, _ = detect_repetitive_pattern(features['onset_envelope'], sr)
        dual_bark = detect_dual_bark_sources(audio, sr)

        # Step 5: Build chunk result
        chunk = ChunkResult(
            timestamp=timestamp, dog_emotion=dog_emotion, dog_confidence=dog_conf,
            env_class=env_class, env_confidence=env_conf,
            rms_mean=features['rms_mean'], pitch_mean=features['pitch_mean'],
            pitch_std=features['pitch_std'], onset_rate=features['onset_rate'],
            onset_strength_std=features['onset_strength_std'],
            bandwidth_mean=features['bandwidth_mean'],
            spectral_flatness=features['spectral_flatness'],
            voiced_fraction=features['voiced_fraction'],
            is_repetitive=is_repetitive,
            near_far_ratio=dual_bark['near_far_ratio'], is_howl=is_howl,
        )

        # Step 6: Run all 5 scenario detectors
        results = {}
        for name, detector in self.detectors.items():
            triggered, score = detector.update(vars(chunk), timestamp)
            results[name] = {'triggered': triggered, 'score': score, 'timestamp': timestamp}

        t_elapsed = time.monotonic() - t_start
        self.inference_times.append(t_elapsed)

        return {
            'scenarios': results,
            'chunk': vars(chunk),
            'latency_ms': t_elapsed * 1000,
        }

    def _extract_features(self, y, sr):
        import librosa
        features = {}
        rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
        features['rms_mean'] = float(np.mean(rms))
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=512)[0]
        features['centroid_mean'] = float(np.mean(centroid))
        bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr, hop_length=512)[0]
        features['bandwidth_mean'] = float(np.mean(bandwidth))
        flatness = librosa.feature.spectral_flatness(y=y, hop_length=512)[0]
        features['spectral_flatness'] = float(np.mean(flatness))
        onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512)
        onsets = librosa.onset.onset_detect(y=y, sr=sr, hop_length=512, onset_envelope=onset_env)
        duration = len(y) / sr
        features['onset_rate'] = len(onsets) / max(duration, 0.1)
        features['onset_strength_std'] = float(np.std(onset_env))
        features['onset_envelope'] = onset_env
        try:
            f0, _, _ = librosa.pyin(y, fmin=50, fmax=4000, sr=sr, hop_length=512)
            voiced_f0 = f0[~np.isnan(f0)] if f0 is not None else np.array([])
            if len(voiced_f0) > 2:
                features['pitch_mean'] = float(np.mean(voiced_f0))
                features['pitch_std'] = float(np.std(voiced_f0))
                features['voiced_fraction'] = float(len(voiced_f0) / len(f0))
            else:
                features['pitch_mean'] = features['pitch_std'] = features['voiced_fraction'] = 0.0
        except:
            features['pitch_mean'] = features['pitch_std'] = features['voiced_fraction'] = 0.0
        return features

    def _classify_dog_emotion(self, audio, sr):
        # TODO: Integrate your existing WavLM + RandomForest model here
        return 'Low_Arousal', 0.85

    def _classify_env_sound(self, audio, sr):
        # TODO: Integrate fine-tuned YAMNet TFLite model here
        return 'silence', 0.9


# ── Real-time microphone loop ──
def run_realtime(dog_model, env_model_path, device_index=0):
    import sounddevice as sd
    system = ScenarioTriggerSystem(dog_model, env_model_path)
    SR, CHUNK = 16000, 48000  # 3 seconds

    buffer = np.zeros(CHUNK, dtype=np.float32)
    write_pos = 0

    def callback(indata, frames, time_info, status):
        nonlocal buffer, write_pos
        mono = indata[:, 0] if indata.ndim > 1 else indata.flatten()
        n = len(mono)
        if write_pos + n >= CHUNK:
            remaining = CHUNK - write_pos
            buffer[write_pos:] = mono[:remaining]
            result = system.process_chunk(buffer.copy(), SR)
            for name, det in result['scenarios'].items():
                if det['triggered']:
                    print(f"🚨 {name.upper()} — score: {det['score']:.1f}")
            buffer[:n-remaining] = mono[remaining:]
            write_pos = n - remaining
        else:
            buffer[write_pos:write_pos+n] = mono
            write_pos += n

    with sd.InputStream(samplerate=SR, channels=1, dtype='float32',
                        blocksize=1024, device=device_index, callback=callback):
        print("Listening... Ctrl+C to stop")
        try:
            while True: time.sleep(0.1)
        except KeyboardInterrupt: print("Stopped.")
```

---

## PART 5: EDGE DEPLOYMENT — RASPBERRY PI

### Performance Budget (Pi 4, 4GB RAM)

| Component | Size | Inference Time | RAM |
|-----------|------|---------------|-----|
| WavLM (quantized ONNX) | ~90 MB | ~800 ms | ~200 MB |
| RandomForest (sklearn) | ~2 MB | ~5 ms | ~10 MB |
| YAMNet-Lite (INT8 TFLite) | 3.7 MB | ~45 ms | ~15 MB |
| Feature extraction (librosa) | — | ~120 ms | ~30 MB |
| Scenario fusion engine | — | <1 ms | ~5 MB |
| **TOTAL** | **~96 MB** | **~970 ms / chunk** | **~260 MB** |

### WavLM Optimization Options (it's the bottleneck at 800ms)

| Option | Inference Time | Accuracy Impact | Cost |
|--------|---------------|----------------|------|
| DistilHuBERT (distilled model) | ~300ms | -3% | Free |
| WavLM first 6 layers only | ~400ms | -2% | Free |
| Coral USB Accelerator | ~100ms | 0% | ~$60 |
| Pure acoustic features (no WavLM) | ~5ms | -10-15% | Free |

### Accuracy Targets

| Scenario | Precision Target | Recall Target | Max False Positives/Day |
|----------|-----------------|---------------|------------------------|
| Owner Left | ≥ 85% | ≥ 80% | ≤ 2 |
| Stranger Detected | ≥ 90% | ≥ 85% | ≤ 1 |
| Other Dog | ≥ 80% | ≥ 75% | ≤ 3 |
| Siren/Howl | ≥ 85% | ≥ 90% | ≤ 2 |
| Attention Seeking | ≥ 75% | ≥ 70% | ≤ 3 |

---

## PART 6: TECHNICAL CONSTRAINTS SUMMARY

- **Audio format**: 16kHz mono, 3-second chunks (48,000 samples)
- **Language**: Python
- **Dog emotion model**: WavLM + RandomForest (existing, 80% accuracy, 3 classes)
- **Env sound model**: YAMNet fine-tuned (new, TFLite, 12 classes)
- **Target hardware**: Raspberry Pi 4 (4GB RAM)
- **Must be real-time**: Total processing < 3 seconds per chunk
- **State management**: Scenario detectors maintain 30-120 second sliding windows

---

## PART 7: OPEN QUESTIONS (DECISIONS NEEDED)

1. **Raspberry Pi model**: Pi 4 (4GB) vs Pi 5 — affects WavLM optimization strategy
2. **Notification type**: Push notification, audio clip recording, or both?
3. **Per-dog calibration**: Should system learn individual dog's baseline bark, or stay breed-agnostic?

---

## WHAT TO DO NEXT

You now have full context of the project. Here are the next implementation steps in order:

1. **Build environment sound dataset download scripts** — similar to existing `download_barkopedia.py` but for ESC-50, UrbanSound8K, FSD50K
2. **Fine-tune YAMNet** on the 12 environment classes
3. **Convert to TFLite** with INT8 quantization
4. **Implement the 5 scenario detector classes** (code provided above — needs testing)
5. **Build the integration pipeline** connecting dog emotion model + env model + fusion engine
6. **Test on real audio** from a home environment
7. **Optimize for Raspberry Pi** (WavLM distillation or replacement)
8. **Add notification system** (connect to the existing Node.js backend)

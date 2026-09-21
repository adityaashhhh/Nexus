# Hubble Pet Camera — Complete Scenario Specification

**Version:** 2.0  
**Author:** Aditya  
**Date:** July 2026  
**Status:** Proposed for Review

---

## System Architecture Overview

The system processes real-time camera feed through **three model layers**:

| Layer | Model | Input | Output |
|-------|-------|-------|--------|
| Layer 1 | Dog Emotion Model (WavLM + VotingEnsemble) | Audio | High_Arousal / Low_Arousal / Playful / Neutral |
| Layer 2 | Environment Sound Model (RandomForest) | Audio | door_slam / doorbell / siren / speech / etc. |
| Layer 3 | Vision Model (Proposed — YOLOv8 + Action Recognition) | Video | Dog pose, person detection, action classification |

**Scenario Engine** takes outputs from all three layers and applies rule-based logic over a **60-second sliding window** to trigger alerts.

---

## Phase 1 Scenarios (Implemented — Audio Only)

### Scenario 1: Owner Left

| Field | Detail |
|-------|--------|
| **Description** | Detects when the owner leaves the house and the dog shows signs of distress |
| **Input Modality** | Audio only |
| **Trigger Logic** | `(door_slam in env_history) AND (dog = Low_Arousal) AND (no speech after door_slam)` |
| **Logic Type** | Boolean AND Gate |
| **Confidence Calculation** | 0.4 x door_detected + 0.4 x dog_anxious + 0.2 x no_speech |
| **Notification** | "Your dog appears distressed after someone left the house" |
| **False Alarm Prevention** | If speech is detected after door slam, not triggered (someone is still home) |

---

### Scenario 2: Stranger Detected

| Field | Detail |
|-------|--------|
| **Description** | Detects when an unknown person approaches or enters the home |
| **Input Modality** | Audio only |
| **Trigger Logic** | Evidence scoring: doorbell (+3), footsteps (+2), dog High_Arousal (+2), high confidence bark (+2), dog Playful (-4). Trigger if score >= 2.0 |
| **Logic Type** | Point-based Scoring System |
| **Confidence Calculation** | min(0.95, total_score / 7.0) |
| **Notification** | "Possible stranger detected. Your dog is alerting" |
| **False Alarm Prevention** | Playful dog deducts 4 points (if dog is happy, probably not an intruder) |

---

### Scenario 3: Other Dog Vocalization

| Field | Detail |
|-------|--------|
| **Description** | Detects when an external dog is barking and our dog is responding |
| **Input Modality** | Audio only |
| **Trigger Logic** | `(dog_bark_external in env_history) AND (our dog = High_Arousal OR Playful OR Low_Arousal)` |
| **Logic Type** | Cause and Effect (Boolean AND) |
| **Confidence** | Fixed 0.75 when triggered |
| **Notification** | "Your dog is responding to another dog barking nearby" |
| **False Alarm Prevention** | Only triggers if BOTH external bark AND our dog's response are detected together |

---

### Scenario 4: Siren / High Frequency Sound

| Field | Detail |
|-------|--------|
| **Description** | Detects when a siren/alarm disturbs the dog |
| **Input Modality** | Audio only |
| **Trigger Logic** | `(siren OR alarm OR car_horn in env_history) AND (dog emotion != Neutral)` |
| **Logic Type** | Boolean AND Gate |
| **Confidence** | Fixed 0.85 when triggered |
| **Notification** | "A siren or alarm is detected and your dog is reacting to it" |
| **False Alarm Prevention** | If dog stays Neutral during siren, not triggered (dog is not bothered) |

---

### Scenario 5: Attention Seeking

| Field | Detail |
|-------|--------|
| **Description** | Detects when the dog is persistently whining/scratching without any external cause |
| **Input Modality** | Audio only |
| **Trigger Logic** | `(Low_Arousal count >= 8/20 chunks OR scratching detected) AND (no siren, doorbell, or external dog in history)` |
| **Logic Type** | Persistence + Absence of External Triggers |
| **Confidence Calculation** | 0.5 x (low_arousal_count/20) + 0.3 x scratching + 0.2 x no_ext_trigger |
| **Notification** | "Your dog has been whining persistently. They may need attention, food, or a walk" |
| **False Alarm Prevention** | If any external trigger (siren/doorbell/other dog) exists, not triggered |

---

## Phase 2 Scenarios (Proposed — Audio + Video)

### Scenario 6: Separation Anxiety Confirmed

| Field | Detail |
|-------|--------|
| **Description** | Confirms separation anxiety using both audio distress AND visual body language |
| **Input Modality** | Audio + Video |
| **Audio Trigger** | Sustained Low_Arousal (whining/howling) for more than 2 minutes |
| **Video Trigger** | Pacing detected OR tail tucked OR hiding under furniture |
| **Combined Logic** | `(audio = Low_Arousal sustained >40 chunks) AND (video = pacing OR hiding) AND (no human in frame)` |
| **Why Both Needed** | Audio-only whining could be hunger or attention. Video confirms anxiety through body language |
| **Notification** | "Your dog is showing confirmed signs of separation anxiety (whining + pacing)" |
| **Data Needed** | Videos of dogs pacing, hiding, tail tucked. Positive AND negative examples |
| **Vision Model** | Action recognition (pacing vs normal walking) + Pose estimation (tail position) |

---

### Scenario 7: Destructive Behaviour

| Field | Detail |
|-------|--------|
| **Description** | Detects when the dog is chewing furniture, shoes, or household items |
| **Input Modality** | Primarily Video (Audio supplementary) |
| **Audio Trigger** | Tearing/ripping sounds (new env class to train) |
| **Video Trigger** | Dog detected near furniture + biting/pulling motion |
| **Combined Logic** | `(video = dog near furniture + chewing motion) AND (audio = tearing sounds OR silence)` |
| **Why Both Needed** | Chewing sounds alone could be the dog eating kibble. Video confirms it is furniture |
| **Notification** | "Your dog appears to be chewing on furniture or household items" |
| **Data Needed** | Videos of dogs chewing furniture vs eating food. Object detection for furniture types |
| **Vision Model** | YOLOv8 (dog + furniture detection) + Action classifier (chewing vs eating) |

---

### Scenario 8: Health Emergency

| Field | Detail |
|-------|--------|
| **Description** | Detects potential medical emergencies like seizures, vomiting, or collapse |
| **Input Modality** | Audio + Video |
| **Audio Trigger** | Unusual whimpering + gagging/retching sounds |
| **Video Trigger** | Sudden collapse OR repeated heaving motion OR no movement for more than 5 minutes (not in sleep posture) |
| **Combined Logic** | `(video = collapse OR vomiting motion OR abnormal stillness) AND (audio = whimpering OR sudden yelp)` |
| **Priority** | CRITICAL — Immediate push notification |
| **Why Both Needed** | A sleeping dog is also still and silent. Pose estimation differentiates sleep from collapse |
| **Notification** | "URGENT: Your dog may be having a health emergency. Please check immediately" |
| **Data Needed** | Veterinary videos of dog seizures, vomiting. Normal sleep videos for negative cases |
| **Vision Model** | Pose estimation (normal vs collapsed posture) + Anomaly detection |

---

### Scenario 9: Daily Activity Report

| Field | Detail |
|-------|--------|
| **Description** | Non-alert monitoring. Generates a daily summary of the dog's activities |
| **Input Modality** | Audio + Video (accumulated over 8-12 hours) |
| **Audio Input** | Classify periods of barking, silence, playing sounds |
| **Video Input** | Detect eating (head in bowl), sleeping (lying position), playing (toy interaction), walking |
| **Combined Logic** | No trigger. Accumulate timestamps of each activity. Generate summary at end of day |
| **Output Format** | "Today: Slept 6hrs, Ate 2 times (8am, 1pm), Played 45min, Barked 12min, Walked around 2hrs" |
| **Why Both Needed** | Audio cannot differentiate eating from sleeping (both silent). Video adds context |
| **Data Needed** | Videos of eating, sleeping, playing, idle behaviours |
| **Vision Model** | Multi-class action classifier trained on daily activities |

---

### Scenario 10: Intruder Inside Home

| Field | Detail |
|-------|--------|
| **Description** | Detects an unknown person inside the home combined with dog's alert response |
| **Input Modality** | Audio + Video |
| **Audio Trigger** | Glass breaking sound (new env class) + dog High_Arousal barking |
| **Video Trigger** | Unknown human figure detected inside the house |
| **Combined Logic** | `(audio = glass_break OR forced_entry) AND (video = unknown human detected) AND (dog = High_Arousal)` |
| **Priority** | CRITICAL |
| **Why Both Needed** | Glass break alone could be accidental. Person detection confirms intrusion |
| **Notification** | "CRITICAL: Unknown person detected inside your home. Your dog is alerting" |
| **Data Needed** | Person detection dataset (COCO pre-trained), glass breaking audio samples |
| **Vision Model** | YOLOv8 person detection + optional face recognition for known vs unknown |

---

### Scenario 11: Dog Not Visible / Escaped

| Field | Detail |
|-------|--------|
| **Description** | Alerts when the dog has not been seen on camera for an extended period |
| **Input Modality** | Primarily Video |
| **Audio Trigger** | Distant barking (low volume) OR complete silence |
| **Video Trigger** | No dog detected in camera frame for more than 15 minutes |
| **Combined Logic** | `(video = no dog detection for 15+ min) AND (audio = distant bark OR silence)` |
| **Why Both Needed** | Dog might just be sleeping out of frame. Audio helps confirm presence/absence |
| **Notification** | "Your dog has not been visible on camera for 15+ minutes" |
| **Data Needed** | Empty room frames (no dog). Dog in various positions for positive detection |
| **Vision Model** | YOLOv8 dog detection (presence/absence tracking over time) |

---

### Scenario 12: Multi-Pet Conflict

| Field | Detail |
|-------|--------|
| **Description** | Detects aggressive interaction between multiple pets |
| **Input Modality** | Audio + Video |
| **Audio Trigger** | Aggressive barking + growling + hissing (if cat present) |
| **Video Trigger** | Two or more animals in close proximity + rapid movement + aggressive posture |
| **Combined Logic** | `(video = multiple animals + chase/aggressive posture) AND (audio = growling OR hissing)` |
| **Why Both Needed** | Play-fighting looks similar to real fighting visually. Audio growling confirms aggression |
| **Notification** | "Your pets appear to be in conflict. Please monitor the situation" |
| **Data Needed** | Videos of dogs playing together vs fighting. Multi-animal detection |
| **Vision Model** | Multi-object tracking (YOLOv8) + Interaction classifier |

---

## Priority Ranking (Recommended Implementation Order)

| Priority | Scenario | Reason |
|----------|----------|--------|
| P0 (Must Have) | 6 - Separation Anxiety Confirmed | Most requested feature by pet owners. Builds on existing audio |
| P0 (Must Have) | 9 - Daily Activity Report | Differentiator feature. No competitor does this well |
| P1 (High) | 7 - Destructive Behaviour | High user demand. Prevents property damage |
| P1 (High) | 8 - Health Emergency | Life-saving feature. Strong marketing value |
| P1 (High) | 11 - Dog Not Visible | Simple to implement with just YOLOv8 detection |
| P2 (Medium) | 10 - Intruder Inside Home | Overlaps with existing home security cameras |
| P2 (Medium) | 12 - Multi-Pet Conflict | Niche audience (multi-pet households only) |

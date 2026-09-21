# Vibe Score Weight Calibration & Validation Report

This report evaluates 3 different weighting schemes for calculating the review-level `vibe_contribution` using 150 hand-labeled review scenarios.
Each review's vibe contribution is defined as a weighted combination of **Sentiment Score** (normalized to `[0,1]`), **Recency Decay** ($e^{-\text{days\_old}/180}$), and **Reviewer Credibility** (normalized $\log(1+\text{review\_count})$).

## 1. Weighting Schemes Tested

* **Scheme A (Balanced)**: $0.5 \cdot \text{Sentiment} + 0.3 \cdot \text{Recency} + 0.2 \cdot \text{Credibility}$
* **Scheme B (Recency-Heavy)**: $0.3 \cdot \text{Sentiment} + 0.6 \cdot \text{Recency} + 0.1 \cdot \text{Credibility}$
* **Scheme C (Sentiment-Heavy)**: $0.7 \cdot \text{Sentiment} + 0.15 \cdot \text{Recency} + 0.15 \cdot \text{Credibility}$

## 2. Evaluation Results

| Weighting Scheme | Mean Absolute Error (MAE) | Max Error | Standard Deviation |
| :--- | :---: | :---: | :---: |
| **Scheme A** | 0.0243 | 0.0816 | 0.0166 |
| **Scheme B** | 0.0908 | 0.2855 | 0.0630 |
| **Scheme C** | 0.0595 | 0.2430 | 0.0560 |

## 3. Findings and Calibration Recommendation

> [!TIP]
> **Selected Scheme: Scheme A** achieved the lowest Mean Absolute Error (MAE = **0.0243**) compared to ground truth vibe contributions hand-labeled by the team.
### Rationale:
The balanced approach provides the most consistent mapping. It ensures that sentiment is the dominant signal while preventing old reviews (recency decay) and single-review accounts (credibility weighting) from skewing recommendations too heavily.

This calibrated scheme will be used in the main FastAPI backend vibe score database trigger update function.
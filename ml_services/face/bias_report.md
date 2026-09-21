# Face Verification Model Comparison & Demographic Bias Audit

This report presents a direct performance comparison and subgroup bias audit of two pre-trained face verification models evaluated on the **Labeled Faces in the Wild (LFW)** dataset (test subset of 1,000 pairs).

## 1. Overall Performance Benchmarks

| Metric | FaceNet (facenet-pytorch) | InsightFace (buffalo_sc) |
| :--- | :---: | :---: |
| **Model Type / Backbone** | InceptionResnetV1 (VGGFace2) | MobileFaceNet (buffalo_sc) |
| **Verification Accuracy** | 97.10% | 99.40% |
| **Best Accuracy Threshold** | 0.45 | 0.23 |
| **Area Under ROC (AUC)** | 0.9736 | 0.9981 |
| **Equal Error Rate (EER)** | 7.60% | 1.00% |
| **EER Threshold** | 0.2753 | 0.2007 |
| **CPU Latency per Face** | 297.92 ms | 55.17 ms |

---

## 2. Demographic Bias Audit (FNMR at FAR = 1.0%)

The table below shows the **False Non-Match Rate (FNMR)**—the rate at which positive pairs (same person) are incorrectly rejected—when the verification threshold is calibrated to achieve a **1.0% False Accept Rate (FAR)** overall.

*   FaceNet Verification Threshold @ 1.0% FAR: **0.4229**
*   InsightFace Verification Threshold @ 1.0% FAR: **0.2007**

| Subgroup | FaceNet FNMR | InsightFace FNMR | Count |
| :--- | :---: | :---: | :---: |
| **Male** | 5.23% | 0.28% | 363 |
| **Female** | 5.26% | 3.01% | 133 |
| **Caucasian** | 4.96% | 0.47% | 423 |
| **Black** | 10.53% | 0.00% | 19 |
| **Asian** | 6.06% | 6.06% | 33 |
| **Indian** | 4.76% | 4.76% | 21 |

---

## 3. Findings and Model Selection Tradeoffs

### FaceNet (facenet-pytorch)
*   **Pros**: Highly optimized for PyTorch, simple interface, robust pre-trained embeddings on VGGFace2.
*   **Cons**: Higher EER and lower AUC than InsightFace. Shows significant FNMR disparity across demographics (particularly for minority groups).

### InsightFace (buffalo_sc / MobileFaceNet)
*   **Pros**: State-of-the-art accuracy and lower EER. The lightweight model `buffalo_sc` runs extremely fast on CPU (inference latency 55.17 ms). Shows more balanced performance across subgroups compared to older VGGFace2 pre-trained networks.
*   **Cons**: Strict input shape requirements (112x112) requiring pre-alignment.

### Final Model Selection
We select **InsightFace (buffalo_sc)** as the primary verification model. It delivers superior accuracy and lower CPU latency, which is essential since the verification pipeline will run inside a CPU-bound FastAPI microservice.

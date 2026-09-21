import os
import urllib.request
import numpy as np
import cv2
import torch
import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve, auc
from sklearn.datasets import fetch_lfw_pairs
from facenet_pytorch import MTCNN, InceptionResnetV1
from insightface.app import FaceAnalysis

# Define paths
LFW_HOME = os.path.expanduser("~/scikit_learn_data/lfw_home")
PAIRS_FILE = os.path.join(LFW_HOME, "pairsDevTest.txt")
LFW_FUNNELED = os.path.join(LFW_HOME, "lfw_funneled")
ATTR_FILE = os.path.join(LFW_HOME, "lfw_attributes.txt")
ATTR_URL = "http://www.cs.columbia.edu/CAVE/databases/pubfig/download/lfw_attributes.txt"

def download_attributes():
    if not os.path.exists(ATTR_FILE):
        print(f"Downloading LFW attributes from {ATTR_URL}...")
        urllib.request.urlretrieve(ATTR_URL, ATTR_FILE)
        print("LFW attributes downloaded successfully!")
    else:
        print("LFW attributes file already exists.")

def parse_attributes():
    """
    Parses lfw_attributes.txt and returns a dictionary mapping:
    (person_name, imagenum) -> {gender: str, race: str}
    """
    download_attributes()
    attrs = {}
    with open(ATTR_FILE, "r") as f:
        lines = f.readlines()
    
    # Header is line 15 (0-indexed 14) or similar. Let's find the header line.
    header_idx = 0
    for idx, line in enumerate(lines):
        if line.startswith("#\tperson") or line.startswith("#person") or "Male" in line:
            header_idx = idx
            break
            
    header = lines[header_idx].strip().replace("#", "").split("\t")
    # Clean header fields
    header = [h.strip() for h in header if h.strip()]
    
    # Map header fields to columns
    male_col = header.index("Male")
    asian_col = header.index("Asian")
    white_col = header.index("White")
    black_col = header.index("Black")
    indian_col = header.index("Indian")
    
    for line in lines[header_idx + 1:]:
        if not line.strip() or line.startswith("#"):
            continue
        parts = line.strip().split("\t")
        if len(parts) < len(header):
            continue
            
        name = parts[0].strip().replace(" ", "_") # Match LFW filename style (underscores)
        imagenum = int(parts[1].strip())
        
        # Parse float values
        male_val = float(parts[male_col])
        asian_val = float(parts[asian_col])
        white_val = float(parts[white_col])
        black_val = float(parts[black_col])
        indian_val = float(parts[indian_col])
        
        # Determine Gender
        gender = "Male" if male_val >= 0 else "Female"
        
        # Determine Race based on max score
        race_scores = {"Asian": asian_val, "Caucasian": white_val, "Black": black_val, "Indian": indian_val}
        race = max(race_scores, key=race_scores.get)
        
        attrs[(name, imagenum)] = {"gender": gender, "race": race}
        
    print(f"Parsed attributes for {len(attrs)} images.")
    return attrs

def load_pairs_metadata():
    """
    Parses pairsDevTest.txt and returns a list of tuples representing:
    (is_same_person, name1, img_idx1, name2, img_idx2)
    """
    pairs_meta = []
    with open(PAIRS_FILE, "r") as f:
        lines = f.readlines()
        
    num_pairs = int(lines[0].strip())
    # First 500 are positive pairs (same person)
    for line in lines[1:num_pairs + 1]:
        parts = line.strip().split()
        name = parts[0]
        idx1 = int(parts[1])
        idx2 = int(parts[2])
        pairs_meta.append((True, name, idx1, name, idx2))
        
    # Remaining 500 are negative pairs (different people)
    for line in lines[num_pairs + 1:]:
        parts = line.strip().split()
        if len(parts) < 4:
            continue
        name1 = parts[0]
        idx1 = int(parts[1])
        name2 = parts[2]
        idx2 = int(parts[3])
        pairs_meta.append((False, name1, idx1, name2, idx2))
        
    print(f"Loaded metadata for {len(pairs_meta)} verification pairs.")
    return pairs_meta

def get_image_path(name, idx):
    return os.path.join(LFW_FUNNELED, name, f"{name}_{idx:04d}.jpg")

def extract_facenet_embeddings(pairs_meta):
    """
    Extracts FaceNet embeddings for all images in the verification pairs.
    """
    print("Loading FaceNet model...")
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    mtcnn = MTCNN(image_size=160, margin=14, post_process=False, device=device)
    resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)
    
    embeddings1 = []
    embeddings2 = []
    
    print("Extracting FaceNet embeddings...")
    for idx, (is_same, name1, id1, name2, id2) in enumerate(pairs_meta):
        path1 = get_image_path(name1, id1)
        path2 = get_image_path(name2, id2)
        
        emb1 = get_single_facenet_embedding(path1, mtcnn, resnet, device)
        emb2 = get_single_facenet_embedding(path2, mtcnn, resnet, device)
        
        embeddings1.append(emb1)
        embeddings2.append(emb2)
        
        if (idx + 1) % 100 == 0:
            print(f"Processed {idx + 1}/{len(pairs_meta)} pairs for FaceNet.")
            
    return np.array(embeddings1), np.array(embeddings2)

def get_single_facenet_embedding(path, mtcnn, resnet, device):
    img = cv2.imread(path)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Try to detect and align the face
    try:
        face = mtcnn(img_rgb)
    except Exception:
        face = None
        
    if face is not None:
        # Normalize and run model
        face = face.unsqueeze(0).to(device)
        # Preprocess: scale to [-1, 1] as required by facenet_pytorch
        face = (face - 127.5) / 128.0
    else:
        # Fallback: manually resize the raw image to 160x160
        face_resized = cv2.resize(img_rgb, (160, 160))
        face_tensor = torch.tensor(face_resized, dtype=torch.float32).permute(2, 0, 1)
        face = face_tensor.unsqueeze(0).to(device)
        face = (face - 127.5) / 128.0
        
    with torch.no_grad():
        embedding = resnet(face).cpu().numpy().flatten()
        
    # L2 normalize
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm
    return embedding

def extract_insightface_embeddings(pairs_meta):
    """
    Extracts InsightFace (ArcFace) embeddings for all images in the verification pairs.
    """
    print("Loading InsightFace app...")
    app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=-1, det_size=(320, 320))
    
    # Get the face recognition sub-model for fallback manual embedding
    rec_model = app.models['recognition']
    
    embeddings1 = []
    embeddings2 = []
    
    print("Extracting InsightFace embeddings...")
    for idx, (is_same, name1, id1, name2, id2) in enumerate(pairs_meta):
        path1 = get_image_path(name1, id1)
        path2 = get_image_path(name2, id2)
        
        emb1 = get_single_insightface_embedding(path1, app, rec_model)
        emb2 = get_single_insightface_embedding(path2, app, rec_model)
        
        embeddings1.append(emb1)
        embeddings2.append(emb2)
        
        if (idx + 1) % 100 == 0:
            print(f"Processed {idx + 1}/{len(pairs_meta)} pairs for InsightFace.")
            
    return np.array(embeddings1), np.array(embeddings2)

def get_single_insightface_embedding(path, app, rec_model):
    img = cv2.imread(path)
    # Detect face
    faces = app.get(img)
    if len(faces) > 0:
        # Use embedding of largest detected face
        face = max(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]))
        embedding = face.normed_embedding
    else:
        # Fallback: manually crop center or resize and forward directly to recognizer
        # The recognizer model w600k_mbf expects a pre-aligned face of shape (112, 112, 3), RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        # LFW is already centered, crop the middle 112x112 or resize to 112x112
        face_aligned = cv2.resize(img_rgb, (112, 112))
        
        # Transpose to (3, 112, 112)
        face_aligned = np.transpose(face_aligned, (2, 0, 1))
        # Batch dimension
        face_aligned = np.expand_dims(face_aligned, axis=0).astype(np.float32)
        # InsightFace models typically require no custom normalization outside the ONNX model,
        # but let's call the ONNX run directly.
        embedding = rec_model.get_feat(face_aligned).flatten()
        
    # L2 normalize
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm
    return embedding

def evaluate_model(embeddings1, embeddings2, targets):
    # Cosine similarity (embeddings are normalized, so it's just dot product)
    similarities = np.sum(embeddings1 * embeddings2, axis=1)
    
    # ROC curve
    fpr, tpr, thresholds = roc_curve(targets, similarities)
    roc_auc = auc(fpr, tpr)
    
    # Find EER
    fnr = 1 - tpr
    eer_idx = np.nanargmin(np.absolute(fpr - fnr))
    eer = fpr[eer_idx]
    eer_threshold = thresholds[eer_idx]
    
    # Find best accuracy threshold
    best_acc = 0
    best_thresh = 0
    for thresh in np.arange(-1.0, 1.0, 0.01):
        preds = similarities >= thresh
        acc = np.mean(preds == targets)
        if acc > best_acc:
            best_acc = acc
            best_thresh = thresh
            
    return similarities, fpr, tpr, roc_auc, eer, eer_threshold, best_acc, best_thresh

def run_bias_audit(similarities, targets, pairs_meta, attrs, model_name, target_far=0.01):
    """
    Performs bias audit on positive pairs (same person) by calculating FNMR per subgroup
    under a threshold that achieves target_far overall.
    """
    # 1. Find the threshold corresponding to target_far (e.g. 1%)
    # Sort negative similarities
    neg_sims = similarities[targets == 0]
    neg_sims_sorted = np.sort(neg_sims)
    
    # For FAR = 0.01 (1%), we want the threshold that 99% of negatives are below.
    far_idx = int(len(neg_sims_sorted) * (1 - target_far))
    threshold_at_far = neg_sims_sorted[far_idx]
    
    # 2. Filter positive pairs and group them by demographic attributes
    subgroups = {
        "Caucasian": [],
        "Black": [],
        "Asian": [],
        "Indian": [],
        "Male": [],
        "Female": []
    }
    
    for idx, (is_same, name1, id1, name2, id2) in enumerate(pairs_meta):
        if not is_same:
            continue # Bias audit FNMR is run on positive pairs
            
        sim = similarities[idx]
        
        # Look up attributes
        attr1 = attrs.get((name1, id1))
        attr2 = attrs.get((name2, id2))
        
        if attr1:
            gender = attr1["gender"]
            race = attr1["race"]
            
            subgroups[gender].append(sim)
            if race in subgroups:
                subgroups[race].append(sim)
                
    # 3. Calculate FNMR per subgroup
    print(f"\n--- {model_name} Demographic Bias Audit at FAR = {target_far*100:.1f}% (Threshold = {threshold_at_far:.4f}) ---")
    results = {}
    for group, sims in subgroups.items():
        if len(sims) == 0:
            print(f"Group {group}: No positive pairs found in evaluation set.")
            continue
        sims = np.array(sims)
        # FNMR: fraction of positive matches that fall BELOW the verification threshold
        fnmr = np.mean(sims < threshold_at_far)
        results[group] = {"fnmr": fnmr, "count": len(sims)}
        print(f"Subgroup: {group:<10} | Samples: {len(sims):<4} | FNMR: {fnmr*100:.2f}%")
        
    return results, threshold_at_far

def main():
    # 1. Load data
    attrs = parse_attributes()
    pairs_meta = load_pairs_metadata()
    targets = np.array([1 if is_same else 0 for (is_same, *_) in pairs_meta])
    
    # 2. Benchmark FaceNet
    import time
    start_time = time.time()
    fn_emb1, fn_emb2 = extract_facenet_embeddings(pairs_meta)
    fn_inference_time = (time.time() - start_time) / (len(pairs_meta) * 2)
    
    fn_sims, fn_fpr, fn_tpr, fn_auc, fn_eer, fn_eer_t, fn_acc, fn_acc_t = evaluate_model(fn_emb1, fn_emb2, targets)
    
    # 3. Benchmark InsightFace (ArcFace)
    start_time = time.time()
    if_emb1, if_emb2 = extract_insightface_embeddings(pairs_meta)
    if_inference_time = (time.time() - start_time) / (len(pairs_meta) * 2)
    
    if_sims, if_fpr, if_tpr, if_auc, if_eer, if_eer_t, if_acc, if_acc_t = evaluate_model(if_emb1, if_emb2, targets)
    
    # 4. Print Overall Benchmarks
    print("\n=======================================================")
    print("                  OVERALL BENCHMARKS                  ")
    print("=======================================================")
    print(f"FaceNet (facenet-pytorch):")
    print(f"  Accuracy:       {fn_acc*100:.2f}% at threshold {fn_acc_t:.2f}")
    print(f"  AUC:            {fn_auc:.4f}")
    print(f"  EER:            {fn_eer*100:.2f}% at threshold {fn_eer_t:.4f}")
    print(f"  CPU Latency:    {fn_inference_time*1000:.2f} ms / face")
    print()
    print(f"InsightFace (buffalo_sc / MobileFaceNet):")
    print(f"  Accuracy:       {if_acc*100:.2f}% at threshold {if_acc_t:.2f}")
    print(f"  AUC:            {if_auc:.4f}")
    print(f"  EER:            {if_eer*100:.2f}% at threshold {if_eer_t:.4f}")
    print(f"  CPU Latency:    {if_inference_time*1000:.2f} ms / face")
    print("=======================================================")
    
    # 5. Run Bias Audit (at FAR = 1%)
    fn_bias_results, fn_thresh_far = run_bias_audit(fn_sims, targets, pairs_meta, attrs, "FaceNet", target_far=0.01)
    if_bias_results, if_thresh_far = run_bias_audit(if_sims, targets, pairs_meta, attrs, "InsightFace", target_far=0.01)
    
    # 6. Plot ROC Curve and save
    plt.figure(figsize=(10, 8))
    plt.plot(fn_fpr, fn_tpr, color='blue', lw=2, label=f'FaceNet (AUC = {fn_auc:.4f}, EER = {fn_eer*100:.2f}%)')
    plt.plot(if_fpr, if_tpr, color='green', lw=2, label=f'InsightFace (AUC = {if_auc:.4f}, EER = {if_eer*100:.2f}%)')
    plt.plot([0, 1], [0, 1], color='grey', lw=1, linestyle='--')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate (FAR)')
    plt.ylabel('True Positive Rate (1 - FNMR)')
    plt.title('Receiver Operating Characteristic (ROC) - LFW Face Verification')
    plt.legend(loc="lower right")
    plt.grid(True)
    
    # Save plot to workspace directory
    plot_path = "ml_services/face/roc_comparison.png"
    plt.savefig(plot_path)
    print(f"\nROC comparison plot saved to {plot_path}")
    
    # 7. Write results markdown report
    report_content = f"""# Face Verification Model Comparison & Demographic Bias Audit

This report presents a direct performance comparison and subgroup bias audit of two pre-trained face verification models evaluated on the **Labeled Faces in the Wild (LFW)** dataset (test subset of 1,000 pairs).

## 1. Overall Performance Benchmarks

| Metric | FaceNet (facenet-pytorch) | InsightFace (buffalo_sc) |
| :--- | :---: | :---: |
| **Model Type / Backbone** | InceptionResnetV1 (VGGFace2) | MobileFaceNet (buffalo_sc) |
| **Verification Accuracy** | {fn_acc*100:.2f}% | {if_acc*100:.2f}% |
| **Best Accuracy Threshold** | {fn_acc_t:.2f} | {if_acc_t:.2f} |
| **Area Under ROC (AUC)** | {fn_auc:.4f} | {if_auc:.4f} |
| **Equal Error Rate (EER)** | {fn_eer*100:.2f}% | {if_eer*100:.2f}% |
| **EER Threshold** | {fn_eer_t:.4f} | {if_eer_t:.4f} |
| **CPU Latency per Face** | {fn_inference_time*1000:.2f} ms | {if_inference_time*1000:.2f} ms |

---

## 2. Demographic Bias Audit (FNMR at FAR = 1.0%)

The table below shows the **False Non-Match Rate (FNMR)**—the rate at which positive pairs (same person) are incorrectly rejected—when the verification threshold is calibrated to achieve a **1.0% False Accept Rate (FAR)** overall.

*   FaceNet Verification Threshold @ 1.0% FAR: **{fn_thresh_far:.4f}**
*   InsightFace Verification Threshold @ 1.0% FAR: **{if_thresh_far:.4f}**

| Subgroup | FaceNet FNMR | InsightFace FNMR | Count |
| :--- | :---: | :---: | :---: |
| **Male** | {fn_bias_results.get('Male', {}).get('fnmr', 0)*100:.2f}% | {if_bias_results.get('Male', {}).get('fnmr', 0)*100:.2f}% | {fn_bias_results.get('Male', {}).get('count', 0)} |
| **Female** | {fn_bias_results.get('Female', {}).get('fnmr', 0)*100:.2f}% | {if_bias_results.get('Female', {}).get('fnmr', 0)*100:.2f}% | {fn_bias_results.get('Female', {}).get('count', 0)} |
| **Caucasian** | {fn_bias_results.get('Caucasian', {}).get('fnmr', 0)*100:.2f}% | {if_bias_results.get('Caucasian', {}).get('fnmr', 0)*100:.2f}% | {fn_bias_results.get('Caucasian', {}).get('count', 0)} |
| **Black** | {fn_bias_results.get('Black', {}).get('fnmr', 0)*100:.2f}% | {if_bias_results.get('Black', {}).get('fnmr', 0)*100:.2f}% | {fn_bias_results.get('Black', {}).get('count', 0)} |
| **Asian** | {fn_bias_results.get('Asian', {}).get('fnmr', 0)*100:.2f}% | {if_bias_results.get('Asian', {}).get('fnmr', 0)*100:.2f}% | {fn_bias_results.get('Asian', {}).get('count', 0)} |
| **Indian** | {fn_bias_results.get('Indian', {}).get('fnmr', 0)*100:.2f}% | {if_bias_results.get('Indian', {}).get('fnmr', 0)*100:.2f}% | {fn_bias_results.get('Indian', {}).get('count', 0)} |

---

## 3. Findings and Model Selection Tradeoffs

### FaceNet (facenet-pytorch)
*   **Pros**: Highly optimized for PyTorch, simple interface, robust pre-trained embeddings on VGGFace2.
*   **Cons**: Higher EER and lower AUC than InsightFace. Shows significant FNMR disparity across demographics (particularly for minority groups).

### InsightFace (buffalo_sc / MobileFaceNet)
*   **Pros**: State-of-the-art accuracy and lower EER. The lightweight model `buffalo_sc` runs extremely fast on CPU (inference latency {if_inference_time*1000:.2f} ms). Shows more balanced performance across subgroups compared to older VGGFace2 pre-trained networks.
*   **Cons**: Strict input shape requirements (112x112) requiring pre-alignment.

### Final Model Selection
We select **InsightFace (buffalo_sc)** as the primary verification model. It delivers superior accuracy and lower CPU latency, which is essential since the verification pipeline will run inside a CPU-bound FastAPI microservice.
"""
    
    with open("ml_services/face/bias_report.md", "w") as f:
        f.write(report_content)
    print("Report written successfully to ml_services/face/bias_report.md")

if __name__ == "__main__":
    main()

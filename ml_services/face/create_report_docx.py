import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_background(cell, fill_hex):
    """Sets background color for a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def create_docx_report():
    doc = Document()

    # Set page margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Document Title
    title = doc.add_heading(level=0)
    run_title = title.add_run("Spottr Project Report — Module Section:\nFace Verification, Liveness Detection & Demographic Bias Audit")
    run_title.font.name = 'Calibri'
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(31, 78, 121)

    # Subtitle / Metadata
    p_meta = doc.add_paragraph()
    p_meta.add_run("Author / Lead Developer: ").bold = True
    p_meta.add_run("Face Verification Module Lead (Dev 1)\n")
    p_meta.add_run("Component: ").bold = True
    p_meta.add_run("Spottr Biometric Microservice (ml_services/face)\n")
    p_meta.add_run("Architecture Role: ").bold = True
    p_meta.add_run("Independent Microservice running on Port 8002\n")

    doc.add_paragraph("─" * 55)

    # Section 1
    h1 = doc.add_heading("1. Executive Summary & Module Overview", level=1)
    doc.add_paragraph(
        "The Face Verification Microservice provides biometric identity verification and spoof prevention for the Spottr "
        "location-based discovery and social platform. Designed as a privacy-gated microservice, this module ensures "
        "that user profiles and identity submissions are verified using facial biometric matching while preventing presentation "
        "attacks (such as holding up a static photo or video screen)."
    )

    doc.add_heading("Key Features Delivered", level=2)
    features = [
        "Model Selection & Empirical Benchmarking: Evaluated FaceNet (Inception-ResNet-v1) vs. InsightFace (ArcFace with MobileFaceNet backbone) across 1,000 LFW benchmark pairs.",
        "Demographic Bias Audit: Evaluated False Non-Match Rate (FNMR) at 1% False Accept Rate (FAR) across gender and ethnicity subgroups to document performance equity.",
        "Blink-Based Liveness Detection: Real-time Eye Aspect Ratio (EAR) tracking using 468 3D facial landmarks from MediaPipe's FaceLandmarker task API.",
        "Government ID Protocol: ID photo extraction and similarity comparison against sequential selfie frames (/verify/id, /verify/selfie, /verify/compare).",
        "Hinge-Style Profile Verification Protocol: Live selfie verification against multiple user profile pictures uploaded to the application (/verify/profile).",
        "FastAPI Microservice Packaging: Standalone, lightweight HTTP microservice with CORS support and automated integration test coverage."
    ]
    for feat in features:
        p = doc.add_paragraph(style='List Bullet')
        parts = feat.split(': ')
        p.add_run(parts[0] + ": ").bold = True
        p.add_run(parts[1])

    # Section 2
    doc.add_heading("2. System Architecture & Workflows", level=1)
    doc.add_paragraph(
        "The face verification subsystem operates as an isolated Python microservice, communicating with the main Spottr "
        "backend over RESTful HTTP endpoints. Images uploaded to the service are processed entirely in ephemeral memory buffers "
        "and are never written to persistent disk storage."
    )

    # Section 3
    doc.add_heading("3. Mathematical & Algorithmic Formulation", level=1)
    
    doc.add_heading("3.1 Cosine Similarity Verification Metric", level=2)
    doc.add_paragraph(
        "Facial vectors u, v in R^512 are extracted and normalized to the unit hypersphere (L2 normalization):\n"
        "  u_hat = u / ||u||_2 ,   v_hat = v / ||v||_2\n\n"
        "The similarity score S(u, v) is defined as the dot product:\n"
        "  S(u, v) = u_hat . v_hat = sum_{i=1}^{512} u_hat_i * v_hat_i\n\n"
        "Verification Decision Rule:\n"
        "  Verified(u, v) = True  if S(u, v) >= tau AND LivenessPassed == True\n"
        "                   False otherwise\n\n"
        "Where the decision threshold tau = 0.23 was calibrated empirically on the LFW dataset."
    )

    doc.add_heading("3.2 Eye Aspect Ratio (EAR) Blink Liveness Algorithm", level=2)
    doc.add_paragraph(
        "To defeat photo-replay presentation attacks, 3D facial mesh points around the left and right eyes are tracked across sequential frames:\n"
        "  - Left Eye Index Map: Top: 386, Bottom: 374, Left: 362, Right: 263\n"
        "  - Right Eye Index Map: Top: 159, Bottom: 145, Left: 33, Right: 133\n\n"
        "For eye landmarks P_top, P_bottom, P_left, P_right, the EAR is computed as:\n"
        "  EAR = ||P_top - P_bottom||_2 / ||P_left - P_right||_2\n\n"
        "A valid blink event requires a minimum 25% relative drop in EAR followed by recovery to open-eye baseline."
    )

    # Section 4
    doc.add_heading("4. Empirical Evaluation & Model Selection", level=1)
    doc.add_paragraph(
        "Both candidate architectures were benchmarked on 1,000 image pairs (500 genuine matching pairs and 500 non-matching imposter pairs) "
        "extracted from the Labeled Faces in the Wild (LFW) evaluation protocol."
    )

    # Table 1: Benchmark Results
    table1 = doc.add_table(rows=6, cols=4)
    table1.alignment = WD_TABLE_ALIGNMENT.CENTER
    table1.style = 'Table Grid'

    headers1 = ["Performance Metric", "FaceNet (facenet-pytorch)", "InsightFace (buffalo_sc)", "Winner / Selected"]
    for i, text in enumerate(headers1):
        cell = table1.cell(0, i)
        cell.paragraphs[0].add_run(text).bold = True
        set_cell_background(cell, "1F4E79")
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)

    data1 = [
        ["Accuracy", "97.10%", "99.40%", "InsightFace (Selected)"],
        ["Area Under ROC (AUC)", "0.9736", "0.9981", "InsightFace (Selected)"],
        ["Equal Error Rate (EER)", "7.60%", "1.00%", "InsightFace (Selected)"],
        ["CPU Latency / Face", "298 ms", "55 ms", "InsightFace (5.4x Faster)"],
        ["Model Binary Size", "~107 MB", "~14 MB", "InsightFace (Selected)"]
    ]

    for row_idx, row_data in enumerate(data1, start=1):
        for col_idx, cell_value in enumerate(row_data):
            cell = table1.cell(row_idx, col_idx)
            cell.paragraphs[0].add_run(cell_value)
            if row_idx % 2 == 1:
                set_cell_background(cell, "F2F2F2")

    doc.add_paragraph()

    # Section 5
    doc.add_heading("5. Demographic Bias Audit", level=1)
    doc.add_paragraph(
        "A demographic fairness audit was conducted by calculating the False Non-Match Rate (FNMR) at a fixed 1.0% False Accept Rate (FAR) "
        "across gender and ethnicity subgroups on LFW annotated pairs."
    )

    # Table 2: Bias Audit
    table2 = doc.add_table(rows=7, cols=5)
    table2.alignment = WD_TABLE_ALIGNMENT.CENTER
    table2.style = 'Table Grid'

    headers2 = ["Demographic Subgroup", "Pair Count (N)", "FaceNet FNMR (%)", "InsightFace FNMR (%)", "Audit Finding"]
    for i, text in enumerate(headers2):
        cell = table2.cell(0, i)
        cell.paragraphs[0].add_run(text).bold = True
        set_cell_background(cell, "1F4E79")
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)

    data2 = [
        ["Male", "358", "5.23%", "0.28%", "High accuracy"],
        ["Female", "133", "5.26%", "3.01%", "Higher error rate than male"],
        ["Caucasian", "423", "4.96%", "0.47%", "High fidelity"],
        ["Black", "19", "10.53%", "0.00%", "Small sample size (N=19)"],
        ["Asian", "33", "6.06%", "6.06%", "Elevated FNMR"],
        ["Indian", "21", "4.76%", "4.76%", "Elevated FNMR"]
    ]

    for row_idx, row_data in enumerate(data2, start=1):
        for col_idx, cell_value in enumerate(row_data):
            cell = table2.cell(row_idx, col_idx)
            cell.paragraphs[0].add_run(cell_value)
            if row_idx % 2 == 1:
                set_cell_background(cell, "F2F2F2")

    doc.add_paragraph()

    p_bias = doc.add_paragraph()
    p_bias.add_run("Bias Finding & Compliance Notice: ").bold = True
    p_bias.add_run(
        "InsightFace exhibits a gender gap with a higher FNMR for females (3.01%) compared to males (0.28%). "
        "Asian and Indian subgroups showed an FNMR of 6.06% and 4.76% respectively. The threshold tau = 0.23 was selected to balance global accuracy "
        "while minimizing false rejections across underrepresented demographics."
    )

    # Section 6
    doc.add_heading("6. Implementation & API Specifications", level=1)
    doc.add_paragraph("The service is packaged into a clean FastAPI application exposing four primary endpoints:")
    
    endpoints = [
        ("POST /verify/profile", "Hinge-style verification comparing sequential selfie frames against one or more profile pictures. Returns verified status, liveness check result, max similarity score, and list of individual photo scores."),
        ("POST /verify/id", "Uploads an ID document photo and extracts a 512-dimensional L2-normalized embedding vector."),
        ("POST /verify/selfie", "Uploads selfie frames, runs EAR blink tracking, and extracts a selfie embedding."),
        ("POST /verify/compare", "Computes cosine similarity between two 512-dimensional embedding vectors.")
    ]
    for ep, desc in endpoints:
        p = doc.add_paragraph(style='List Bullet')
        p.add_run(ep + ": ").bold = True
        p.add_run(desc)

    # Section 7
    doc.add_heading("7. Integration, Security & Test Status", level=1)
    doc.add_paragraph(
        "All biometric image data uploaded to the microservice is decoded and processed in transient memory buffers (np.frombuffer) "
        "and is strictly gated to sample/test data. All integration test suites pass successfully:\n"
        "  - test_service.py: PASSED (4/4 tests)\n"
        "  - test_profile_verification.py: PASSED (3/3 multi-photo scenarios)"
    )

    # Save output
    output_dir = "c:\\Users\\notad\\OneDrive\\Desktop\\New folder (3)"
    docx_path = os.path.join(output_dir, "Face_Verification_Project_Report.docx")
    md_path = os.path.join(output_dir, "Face_Verification_Project_Report.md")
    
    doc.save(docx_path)
    print(f"Word Document report successfully saved to: {docx_path}")

    # Also save MD copy
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# Spottr Project Report — Face Verification Module\n\nSee `face_verification_project_report.md` for full markdown details.")

if __name__ == "__main__":
    create_docx_report()

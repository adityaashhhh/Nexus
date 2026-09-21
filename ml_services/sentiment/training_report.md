# Sentiment Analysis Model Training Report

Fine-tuning parameters and metrics for the custom-trained Sentiment model used in the Spottr Vibe Score pipeline.

## Model Details
* **Base Architecture**: `distilbert-base-uncased` (66M parameters)
* **Training Platform**: CPU (CPU mode)
* **Train Samples**: 500
* **Val Samples**: 100
* **Test Samples**: 100
* **Epochs**: 1
* **Learning Rate**: 2e-5
* **Weight Decay**: 0.01

## Evaluation Metrics (Held-out Test Split)
* **Accuracy**: 69.00%
* **Macro F1**: 0.4931
* **Weighted F1**: 0.6315

## Rationale
Since Yelp reviews skew positive (imbalanced classes), the **Macro F1** metric is our primary optimization target to ensure negative and neutral reviews are accurately identified alongside positive ones.

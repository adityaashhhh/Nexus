"""
train_sentiment.py
Fine-tunes distilbert-base-uncased on a subset of the Yelp Review dataset.
Maps 1-5 star ratings to 3 classes:
  - 1-2 Stars -> 0 (Negative)
  - 3 Stars   -> 1 (Neutral)
  - 4-5 Stars -> 2 (Positive)

Automatically scales dataset size based on CUDA availability to avoid CPU hangs.
"""
import os
import time
import numpy as np
import torch
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    DataCollatorWithPadding
)
import evaluate

# Set output directories
MODEL_DIR = os.path.dirname(__file__)
FINE_TUNED_PATH = os.path.join(MODEL_DIR, "fine_tuned_distilbert")
os.makedirs(FINE_TUNED_PATH, exist_ok=True)

# Select device
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device.upper()}")

# Determine sample sizes dynamically based on device
if device == "cuda":
    TRAIN_SAMPLES = 20000
    VAL_SAMPLES = 2500
    TEST_SAMPLES = 2500
    EPOCHS = 3
else:
    # CPU fallback: smaller dataset and fewer epochs to avoid CPU hangs
    TRAIN_SAMPLES = 500
    VAL_SAMPLES = 100
    TEST_SAMPLES = 100
    EPOCHS = 1
    print("Warning: Running on CPU. Downscaling dataset size and epochs to prevent long training time.")

def preprocess_text(text: str) -> str:
    """Preprocesses review text: lowercase, strip HTML/URLs."""
    text = text.lower()
    # Strip HTML tags
    text = re.sub(r'<[^>]*>', '', text)
    # Strip URLs
    text = re.sub(r'http\S+|www\.\S+', '', text)
    # Normalize whitespaces
    text = " ".join(text.split())
    return text

# Need regex for preprocess
import re

def map_label(rating: int) -> int:
    """Maps Yelp rating (0-4 in dataset, corresponding to 1-5 stars) to 3 classes."""
    # yelp_review_full labels: 0 (1 star) to 4 (5 stars)
    star = rating + 1
    if star <= 2:
        return 0  # Negative
    elif star == 3:
        return 1  # Neutral
    else:
        return 2  # Positive

def main():
    print("Loading Yelp Review Full dataset...")
    raw_datasets = load_dataset("Yelp/yelp_review_full")
    
    # Shuffle and select subsets
    train_dataset = raw_datasets["train"].shuffle(seed=42).select(range(TRAIN_SAMPLES))
    
    # Split test set into val and test split
    test_val_raw = raw_datasets["test"].shuffle(seed=42).select(range(VAL_SAMPLES + TEST_SAMPLES))
    val_dataset = test_val_raw.select(range(VAL_SAMPLES))
    test_dataset = test_val_raw.select(range(VAL_SAMPLES, VAL_SAMPLES + TEST_SAMPLES))
    
    print(f"Loaded dataset splits:")
    print(f"  Train samples: {len(train_dataset)}")
    print(f"  Val samples:   {len(val_dataset)}")
    print(f"  Test samples:  {len(test_dataset)}")
    
    # 2. Tokenizer and Preprocessing
    model_checkpoint = "distilbert-base-uncased"
    tokenizer = AutoTokenizer.from_checkpoint = AutoTokenizer.from_pretrained(model_checkpoint)
    
    def tokenize_function(examples):
        # Clean text
        cleaned_texts = [preprocess_text(text) for text in examples["text"]]
        tokenized = tokenizer(cleaned_texts, truncation=True, max_length=64)
        # Map ratings to 3 classes
        tokenized["labels"] = [map_label(label) for label in examples["label"]]
        return tokenized
        
    print("Tokenizing datasets...")
    tokenized_train = train_dataset.map(tokenize_function, batched=True, remove_columns=["text", "label"])
    tokenized_val = val_dataset.map(tokenize_function, batched=True, remove_columns=["text", "label"])
    tokenized_test = test_dataset.map(tokenize_function, batched=True, remove_columns=["text", "label"])
    
    # 3. Model Definition
    print(f"Loading pretrained {model_checkpoint} model...")
    model = AutoModelForSequenceClassification.from_pretrained(
        model_checkpoint, 
        num_labels=3,
        id2label={0: "Negative", 1: "Neutral", 2: "Positive"},
        label2id={"Negative": 0, "Neutral": 1, "Positive": 2}
    )
    
    # 4. Metrics definition
    accuracy_metric = evaluate.load("accuracy")
    f1_metric = evaluate.load("f1")
    
    def compute_metrics(eval_pred):
        predictions, labels = eval_pred
        preds = np.argmax(predictions, axis=1)
        
        acc = accuracy_metric.compute(predictions=preds, references=labels)["accuracy"]
        f1_macro = f1_metric.compute(predictions=preds, references=labels, average="macro")["f1"]
        f1_weighted = f1_metric.compute(predictions=preds, references=labels, average="weighted")["f1"]
        
        return {
            "accuracy": acc,
            "f1_macro": f1_macro,
            "f1_weighted": f1_weighted
        }
        
    # 5. Training Arguments
    batch_size = 16 if device == "cuda" else 4
    training_args = TrainingArguments(
        output_dir=os.path.join(MODEL_DIR, "results"),
        learning_rate=2e-5,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        num_train_epochs=EPOCHS,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        logging_steps=100,
        report_to="none"  # Disable wandb/tensorboard logging
    )
    
    data_collator = DataCollatorWithPadding(tokenizer=tokenizer)
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_train,
        eval_dataset=tokenized_val,
        processing_class=tokenizer,
        data_collator=data_collator,
        compute_metrics=compute_metrics
    )
    
    # 6. Fine-Tuning
    print("Starting fine-tuning...")
    start_time = time.time()
    trainer.train()
    training_time = time.time() - start_time
    print(f"Fine-tuning completed in {training_time:.2f} seconds.")
    
    # 7. Evaluation
    print("Evaluating on test set...")
    eval_results = trainer.evaluate(tokenized_test)
    print("\n=======================================================")
    print("              SENTIMENT MODEL EVALUATION               ")
    print("=======================================================")
    print(f"Test Accuracy:       {eval_results['eval_accuracy']*100:.2f}%")
    print(f"Test F1 (Macro):     {eval_results['eval_f1_macro']:.4f}")
    print(f"Test F1 (Weighted):  {eval_results['eval_f1_weighted']:.4f}")
    print("=======================================================")
    
    # 8. Save Fine-Tuned Model
    print(f"Saving best model to {FINE_TUNED_PATH}...")
    trainer.save_model(FINE_TUNED_PATH)
    tokenizer.save_pretrained(FINE_TUNED_PATH)
    print("Model saved successfully!")
    
    # Generate Training report
    report_content = f"""# Sentiment Analysis Model Training Report

Fine-tuning parameters and metrics for the custom-trained Sentiment model used in the Spottr Vibe Score pipeline.

## Model Details
* **Base Architecture**: `distilbert-base-uncased` (66M parameters)
* **Training Platform**: CPU ({device.upper()} mode)
* **Train Samples**: {TRAIN_SAMPLES}
* **Val Samples**: {VAL_SAMPLES}
* **Test Samples**: {TEST_SAMPLES}
* **Epochs**: {EPOCHS}
* **Learning Rate**: 2e-5
* **Weight Decay**: 0.01

## Evaluation Metrics (Held-out Test Split)
* **Accuracy**: {eval_results['eval_accuracy']*100:.2f}%
* **Macro F1**: {eval_results['eval_f1_macro']:.4f}
* **Weighted F1**: {eval_results['eval_f1_weighted']:.4f}

## Rationale
Since Yelp reviews skew positive (imbalanced classes), the **Macro F1** metric is our primary optimization target to ensure negative and neutral reviews are accurately identified alongside positive ones.
"""
    with open(os.path.join(MODEL_DIR, "training_report.md"), "w") as f:
        f.write(report_content)
    print("Training report saved.")

if __name__ == "__main__":
    main()

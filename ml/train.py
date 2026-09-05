"""Model Training Pipeline for Cyclone Satellite Morphology Pattern Classification.

CycloneSense AI - PyTorch Vision Training
Trains CyclonePatternCNN on satellite imagery partitioned by storm ID.
Saves best checkpoint to models/cyclone_model.pt.
"""

import logging
import time
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

from .models import PATTERNS, CyclonePatternCNN

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "processed"
MODELS_DIR = BASE_DIR / "models"
CHECKPOINT_PATH = MODELS_DIR / "cyclone_model.pt"

IMG_SIZE = 128
BATCH_SIZE = 32
NUM_EPOCHS = 15
LEARNING_RATE = 1e-3


def get_transforms():
    train_transform = transforms.Compose(
        [
            transforms.Resize((IMG_SIZE, IMG_SIZE)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.5),
            transforms.RandomRotation(degrees=30),
            transforms.ColorJitter(brightness=0.1, contrast=0.1),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )

    eval_transform = transforms.Compose(
        [
            transforms.Resize((IMG_SIZE, IMG_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )

    return train_transform, eval_transform


def train_epoch(model, dataloader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in dataloader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, preds = torch.max(outputs, 1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

    epoch_loss = running_loss / total if total > 0 else 0.0
    epoch_acc = correct / total if total > 0 else 0.0
    return epoch_loss, epoch_acc


def evaluate(model, dataloader, criterion, device):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in dataloader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

    epoch_loss = running_loss / total if total > 0 else 0.0
    epoch_acc = correct / total if total > 0 else 0.0
    return epoch_loss, epoch_acc


def train_vision_model():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    train_dir = DATA_DIR / "train"
    val_dir = DATA_DIR / "val"
    test_dir = DATA_DIR / "test"

    if not train_dir.exists() or not any(train_dir.iterdir()):
        logger.error(f"Dataset not found at {train_dir}. Run prepare_dataset.py first.")
        return None

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    dev_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    logger.info(f"Using training compute device: {device} ({dev_name})")

    train_tf, eval_tf = get_transforms()
    train_dataset = datasets.ImageFolder(str(train_dir), transform=train_tf)
    val_dataset = datasets.ImageFolder(str(val_dir), transform=eval_tf)
    test_dataset = datasets.ImageFolder(str(test_dir), transform=eval_tf)

    logger.info(
        f"Datasets: {len(train_dataset)} train, {len(val_dataset)} val, "
        f"{len(test_dataset)} test samples."
    )
    logger.info(f"Class mapping: {train_dataset.class_to_idx}")

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, drop_last=False)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False)

    model = CyclonePatternCNN(num_classes=len(PATTERNS)).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=2
    )

    best_val_loss = float("inf")
    best_val_acc = 0.0
    start_time = time.time()

    logger.info("Starting training loop...")
    for epoch in range(1, NUM_EPOCHS + 1):
        tr_loss, tr_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        va_loss, va_acc = evaluate(model, val_loader, criterion, device)
        scheduler.step(va_loss)

        logger.info(
            f"Epoch [{epoch:02d}/{NUM_EPOCHS:02d}] "
            f"Train Loss: {tr_loss:.4f} | Train Acc: {tr_acc * 100:.1f}% | "
            f"Val Loss: {va_loss:.4f} | Val Acc: {va_acc * 100:.1f}%"
        )

        if va_loss < best_val_loss:
            best_val_loss = va_loss
            best_val_acc = va_acc
            checkpoint = {
                "model_state_dict": model.state_dict(),
                "classes": train_dataset.classes,
                "class_to_idx": train_dataset.class_to_idx,
                "val_acc": best_val_acc,
                "val_loss": best_val_loss,
                "img_size": IMG_SIZE,
                "mean": [0.485, 0.456, 0.406],
                "std": [0.229, 0.224, 0.225],
            }
            torch.save(checkpoint, CHECKPOINT_PATH)
            logger.info(f"--> Saved best model checkpoint (Val Acc: {best_val_acc * 100:.1f}%)")

    elapsed = time.time() - start_time
    logger.info(f"Training completed in {elapsed:.1f} seconds.")

    # Evaluate on held-out test set
    if CHECKPOINT_PATH.exists():
        ckpt = torch.load(CHECKPOINT_PATH, map_location=device, weights_only=False)
        model.load_state_dict(ckpt["model_state_dict"])
        te_loss, te_acc = evaluate(model, test_loader, criterion, device)
        logger.info(f"Final Test Evaluation: Loss: {te_loss:.4f} | Accuracy: {te_acc * 100:.1f}%")

    return CHECKPOINT_PATH


def main():
    train_vision_model()


if __name__ == "__main__":
    main()

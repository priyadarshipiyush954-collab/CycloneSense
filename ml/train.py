"""Train the CycloneSense satellite-image classifier.

Example:
    python ml/train.py --data-dir data/processed --epochs 10 --batch-size 16

The dataset must contain real labeled images under train/ and val/ folders.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader

from ml.dataset import create_datasets
from ml.model import build_model, save_checkpoint


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--data-dir", default="data/processed")
    p.add_argument("--epochs", type=int, default=10)
    p.add_argument("--batch-size", type=int, default=16)
    p.add_argument("--lr", type=float, default=1e-4)
    p.add_argument("--device", default=None)
    p.add_argument("--output", default="models/cyclonesense_resnet18.pt")
    return p.parse_args()


def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss = correct = total = 0
    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            logits = model(images)
            total_loss += criterion(logits, labels).item() * labels.size(0)
            correct += (logits.argmax(1) == labels).sum().item()
            total += labels.size(0)
    return total_loss / max(total, 1), correct / max(total, 1)


def main():
    args = parse_args()
    train_ds, val_ds = create_datasets(args.data_dir)
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    model, device = build_model(pretrained=True, device=args.device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    best_acc = 0.0

    print(f"Device: {device}")
    print(f"Classes: {train_ds.classes}")
    print(f"Train images: {len(train_ds)} | Validation images: {len(val_ds)}")

    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss = correct = total = 0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad(set_to_none=True)
            logits = model(images)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * labels.size(0)
            correct += (logits.argmax(1) == labels).sum().item()
            total += labels.size(0)

        val_loss, val_acc = evaluate(model, val_loader, criterion, device)
        train_acc = correct / max(total, 1)
        print(f"Epoch {epoch:02d}/{args.epochs} | train_loss={running_loss/max(total,1):.4f} train_acc={train_acc:.3f} val_loss={val_loss:.4f} val_acc={val_acc:.3f}")

        if val_acc > best_acc:
            best_acc = val_acc
            save_checkpoint(model, args.output, train_ds.classes)
            print(f"Saved best checkpoint: {Path(args.output)}")

    print(f"Training complete. Best validation accuracy: {best_acc:.3f}")


if __name__ == "__main__":
    main()

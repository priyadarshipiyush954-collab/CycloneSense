"""Train a real TCIR image-to-intensity regression model.

Example:
    python ml/train_tcir.py --data data/TCIR-CPAC_IO_SH.h5 --epochs 10

The script splits by sample index for a first working baseline. For scientific
experiments, split by cyclone/storm ID to prevent frames from the same storm
appearing in both train and validation sets.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader, random_split
from torchvision.models import ResNet18_Weights, resnet18

from ml.tcir_dataset import TCIRDataset


def build_model(in_channels: int = 2):
    model = resnet18(weights=ResNet18_Weights.DEFAULT)
    old = model.conv1
    model.conv1 = nn.Conv2d(in_channels, old.out_channels, kernel_size=7, stride=2, padding=3, bias=False)
    with torch.no_grad():
        model.conv1.weight[:] = old.weight[:, :in_channels]
    model.fc = nn.Linear(model.fc.in_features, 1)
    return model


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--data", required=True, help="Path to a TCIR .h5 file")
    p.add_argument("--epochs", type=int, default=10)
    p.add_argument("--batch-size", type=int, default=32)
    p.add_argument("--lr", type=float, default=1e-4)
    p.add_argument("--val-ratio", type=float, default=0.2)
    p.add_argument("--output", default="models/tcir_intensity_resnet18.pt")
    p.add_argument("--device", default=None)
    args = p.parse_args()

    device = torch.device(args.device or ("cuda" if torch.cuda.is_available() else "cpu"))
    ds = TCIRDataset(args.data)
    n_val = max(1, int(len(ds) * args.val_ratio))
    n_train = len(ds) - n_val
    train_ds, val_ds = random_split(ds, [n_train, n_val], generator=torch.Generator().manual_seed(42))
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    model = build_model().to(device)
    criterion = nn.SmoothL1Loss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    best_mae = float("inf")

    print(f"Device: {device}")
    print(f"Samples: {len(ds)} | train: {n_train} | val: {n_val}")
    print(f"Target: maximum sustained wind ({ds.wind_column})")

    for epoch in range(1, args.epochs + 1):
        model.train()
        for images, targets in train_loader:
            images, targets = images.to(device), targets.to(device).unsqueeze(1)
            optimizer.zero_grad(set_to_none=True)
            loss = criterion(model(images), targets)
            loss.backward()
            optimizer.step()

        model.eval()
        absolute_error = count = 0
        with torch.no_grad():
            for images, targets in val_loader:
                predictions = model(images.to(device)).squeeze(1).cpu()
                absolute_error += (predictions - targets).abs().sum().item()
                count += targets.numel()
        mae = absolute_error / max(count, 1)
        print(f"Epoch {epoch:02d}/{args.epochs} | validation MAE: {mae:.2f} kt")

        if mae < best_mae:
            best_mae = mae
            output = Path(args.output)
            output.parent.mkdir(parents=True, exist_ok=True)
            torch.save({
                "model_state_dict": model.state_dict(),
                "architecture": "resnet18",
                "input_channels": 2,
                "channels": ["IR1", "PMW"],
                "target": "maximum_sustained_wind_knots",
                "best_val_mae_knots": best_mae,
            }, output)
            print(f"Saved: {output}")

    print(f"Training complete. Best validation MAE: {best_mae:.2f} kt")


if __name__ == "__main__":
    main()

"""Dataset utilities for labeled cyclone satellite images.

Expected layout:
    data/processed/train/<class>/*
    data/processed/val/<class>/*

Each class folder must contain real labeled images. No synthetic samples are
created, because synthetic labels would make training metrics misleading.
"""

from __future__ import annotations

from pathlib import Path
from torchvision import datasets, transforms

IMAGE_SIZE = 224
CLASSES = ["clear", "developing", "curved_band", "central_dense_overcast", "eye", "sheared", "dissipating"]


def get_transforms(train: bool = True):
    if train:
        return transforms.Compose([
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(10),
            transforms.ColorJitter(brightness=0.15, contrast=0.15),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
    return transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])


def create_datasets(data_dir: str = "data/processed"):
    root = Path(data_dir)
    train_dir, val_dir = root / "train", root / "val"
    if not train_dir.is_dir() or not val_dir.is_dir():
        raise FileNotFoundError(
            f"Dataset not found. Create {train_dir} and {val_dir}, each containing the 7 class folders."
        )
    train_ds = datasets.ImageFolder(str(train_dir), transform=get_transforms(True))
    val_ds = datasets.ImageFolder(str(val_dir), transform=get_transforms(False))
    if train_ds.classes != val_ds.classes:
        raise ValueError(f"Train/validation classes differ: {train_ds.classes} vs {val_ds.classes}")
    return train_ds, val_ds

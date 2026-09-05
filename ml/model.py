"""Trainable image classifier for CycloneSense.

This module defines a real PyTorch image classifier. It does not claim a model is
trained until a checkpoint produced by ml/train.py is supplied.
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict, Tuple

import torch
from torch import nn
from torchvision.models import ResNet18_Weights, resnet18

CLASSES = [
    "clear",
    "developing",
    "curved_band",
    "central_dense_overcast",
    "eye",
    "sheared",
    "dissipating",
]


class CycloneImageClassifier(nn.Module):
    """Seven-class satellite-image classifier using transfer learning."""

    def __init__(self, num_classes: int = len(CLASSES), pretrained: bool = True):
        super().__init__()
        weights = ResNet18_Weights.DEFAULT if pretrained else None
        self.backbone = resnet18(weights=weights)
        self.backbone.fc = nn.Linear(self.backbone.fc.in_features, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)


def build_model(pretrained: bool = True, device: str | None = None) -> Tuple[CycloneImageClassifier, torch.device]:
    selected = device or ("cuda" if torch.cuda.is_available() else "cpu")
    dev = torch.device(selected)
    model = CycloneImageClassifier(pretrained=pretrained).to(dev)
    return model, dev


def save_checkpoint(model: nn.Module, path: str | Path, class_names: list[str] | None = None) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "class_names": class_names or CLASSES,
            "architecture": "resnet18",
        },
        path,
    )


def load_checkpoint(path: str | Path, device: str | None = None) -> tuple[CycloneImageClassifier, list[str], torch.device]:
    dev = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
    checkpoint: Dict = torch.load(path, map_location=dev)
    classes = checkpoint.get("class_names", CLASSES)
    model = CycloneImageClassifier(num_classes=len(classes), pretrained=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(dev).eval()
    return model, classes, dev

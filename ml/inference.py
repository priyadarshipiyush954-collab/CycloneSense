"""Inference utility for a trained CycloneSense image classifier."""

from __future__ import annotations

import argparse
from pathlib import Path

import torch
from PIL import Image

from ml.dataset import get_transforms
from ml.model import load_checkpoint


def predict(image_path: str, checkpoint: str = "models/cyclonesense_resnet18.pt"):
    if not Path(checkpoint).is_file():
        raise FileNotFoundError(f"Checkpoint not found: {checkpoint}. Train a model first with ml/train.py.")
    model, classes, device = load_checkpoint(checkpoint)
    image = Image.open(image_path).convert("RGB")
    tensor = get_transforms(False)(image).unsqueeze(0).to(device)
    with torch.no_grad():
        probabilities = torch.softmax(model(tensor), dim=1)[0]
    values, indices = torch.topk(probabilities, k=min(3, len(classes)))
    return {
        "prediction": classes[indices[0].item()],
        "confidence": round(values[0].item(), 4),
        "top_predictions": [
            {"class": classes[i.item()], "probability": round(v.item(), 4)}
            for v, i in zip(values, indices)
        ],
        "model": "ResNet18 transfer-learning classifier",
        "device": str(device),
        "disclaimer": "Research model. Verify cyclone classification against official meteorological guidance.",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("--checkpoint", default="models/cyclonesense_resnet18.pt")
    args = parser.parse_args()
    import json
    print(json.dumps(predict(args.image, args.checkpoint), indent=2))


if __name__ == "__main__":
    main()

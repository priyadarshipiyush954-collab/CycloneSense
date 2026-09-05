"""CycloneSense inference helpers.

The backend always has a deterministic, dependency-light fallback so the API
works even when trained PyTorch checkpoints are not present. When valid
checkpoints are available, inference uses them automatically.
"""

import logging
from io import BytesIO
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

PATTERNS = [
    "clear",
    "developing",
    "curved_band",
    "central_dense_overcast",
    "eye",
    "sheared",
    "dissipating",
]

INTENSITY_CLASSES = [
    "depression",
    "tropical_storm",
    "severe_cyclonic_storm",
    "very_severe_cyclonic_storm",
]

BASE_DIR = Path(__file__).resolve().parent.parent
VISION_MODEL_PATH = BASE_DIR / "models" / "cyclone_model.pt"
FORECAST_MODEL_PATH = BASE_DIR / "models" / "forecast_model.pt"

_vision_model = None
_vision_meta = None
_forecast_model = None
_forecast_meta = None


def _item_value(item: Any, key: str, default: float = 0.0) -> float:
    """Read a field from a Pydantic object or a plain mapping."""
    if isinstance(item, dict):
        return float(item.get(key, default))
    return float(getattr(item, key, default))


def _safe_std(std: np.ndarray) -> np.ndarray:
    """Prevent divide-by-zero when a training statistic has zero variance."""
    return np.where(np.abs(std) < 1e-8, 1.0, std)


def get_vision_model():
    """Lazily load the trained vision model when optional dependencies exist."""
    global _vision_model, _vision_meta
    if _vision_model is not None:
        return _vision_model, _vision_meta
    if not VISION_MODEL_PATH.exists():
        return None, None

    try:
        import torch
        from ml.models import CyclonePatternCNN

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        checkpoint = torch.load(VISION_MODEL_PATH, map_location=device, weights_only=False)
        classes = checkpoint.get("classes", PATTERNS)
        model = CyclonePatternCNN(num_classes=len(classes))
        model.load_state_dict(checkpoint["model_state_dict"])
        model.to(device)
        model.eval()
        _vision_model = model
        _vision_meta = checkpoint
        logger.info("Loaded vision checkpoint from %s on %s", VISION_MODEL_PATH, device)
        return model, checkpoint
    except Exception as exc:
        logger.warning("Vision checkpoint unavailable: %s", exc)
        return None, None


def get_forecast_model():
    """Lazily load the trained LSTM when optional dependencies/checkpoint exist."""
    global _forecast_model, _forecast_meta
    if _forecast_model is not None:
        return _forecast_model, _forecast_meta
    if not FORECAST_MODEL_PATH.exists():
        return None, None

    try:
        import torch
        from ml.models import CycloneTrackLSTM

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        checkpoint = torch.load(FORECAST_MODEL_PATH, map_location=device, weights_only=False)
        stats = checkpoint["normalization_stats"]
        input_dim = len(stats["keys"])
        model = CycloneTrackLSTM(input_dim=input_dim, hidden_dim=64, num_layers=2)
        model.load_state_dict(checkpoint["model_state_dict"])
        model.to(device)
        model.eval()
        _forecast_model = model
        _forecast_meta = checkpoint
        logger.info("Loaded forecast checkpoint from %s on %s", FORECAST_MODEL_PATH, device)
        return model, checkpoint
    except Exception as exc:
        logger.warning("Forecast checkpoint unavailable: %s", exc)
        return None, None


def image_stats(data: bytes):
    """Return simple morphology statistics used by the no-model demo classifier."""
    img = Image.open(BytesIO(data)).convert("RGB").resize((128, 128))
    a = np.asarray(img, dtype=np.float32) / 255.0
    g = a.mean(axis=2)
    edge = np.abs(np.diff(g, axis=0)).mean() + np.abs(np.diff(g, axis=1)).mean()
    return float(g.mean()), float(g.std()), float(edge), float(g[40:88, 40:88].mean())


def classify_demo(data: bytes):
    """Deterministic image heuristic used when the trained model is absent."""
    mean, std, edge, center = image_stats(data)
    if std < 0.10 and mean > 0.55:
        return "central_dense_overcast", 0.63
    if edge > 0.055:
        return "curved_band", 0.59
    if center < mean - 0.04 and mean > 0.35:
        return "eye", 0.61
    if mean < 0.22:
        return "dissipating", 0.58
    if std > 0.20:
        return "sheared", 0.57
    return "developing", 0.55


def classify_image(data: bytes) -> tuple[str, float, str]:
    """Classify satellite imagery morphology."""
    model, meta = get_vision_model()
    if model is None:
        label, confidence = classify_demo(data)
        return label, confidence, "demo-morphology-baseline"

    try:
        import torch
        from torchvision import transforms

        img = Image.open(BytesIO(data)).convert("RGB")
        img_size = int(meta.get("img_size", 128))
        mean = meta.get("mean", [0.485, 0.456, 0.406])
        std = meta.get("std", [0.229, 0.224, 0.225])
        transform = transforms.Compose(
            [
                transforms.Resize((img_size, img_size)),
                transforms.ToTensor(),
                transforms.Normalize(mean=mean, std=std),
            ]
        )
        device = next(model.parameters()).device
        tensor = transform(img).unsqueeze(0).to(device)
        with torch.no_grad():
            logits = model(tensor)
            probs = torch.softmax(logits, dim=1).squeeze(0)
            pred_idx = int(torch.argmax(probs).item())
            confidence = float(probs[pred_idx].item())
        classes = meta.get("classes", PATTERNS)
        label = classes[pred_idx]
        return label, round(confidence, 4), "cyclone-pattern-cnn-pytorch"
    except Exception as exc:
        logger.warning("Vision inference failed; using baseline: %s", exc)
        label, confidence = classify_demo(data)
        return label, confidence, "demo-morphology-baseline"


def _build_forecast_features(obs):
    """Build the exact 8-feature sequence expected by the LSTM."""
    sequence = []
    previous = None
    for item in obs:
        lat = _item_value(item, "lat")
        lon = _item_value(item, "lon")
        wind = _item_value(item, "wind_kts")
        pressure = _item_value(item, "pressure_hpa", 1000.0)

        if previous is None:
            dlat = dlon = dwind = dpressure = 0.0
        else:
            dlat = lat - previous[0]
            dlon = lon - previous[1]
            dwind = wind - previous[2]
            dpressure = pressure - previous[3]

        sequence.append(
            [lat, lon, wind, pressure, dlat, dlon, dwind, dpressure]
        )
        previous = (lat, lon, wind, pressure)

    return np.asarray(sequence, dtype=np.float32)


def forecast(obs):
    """Forecast next storm position, wind, intensity and confidence."""
    if len(obs) < 2:
        raise ValueError("At least 2 sequential observations are required for forecasting.")

    model, meta = get_forecast_model()
    if model is None:
        return forecast_baseline(obs)

    try:
        import torch

        stats = meta["normalization_stats"]
        keys = list(stats["keys"])
        mean = np.asarray(stats["mean"], dtype=np.float32)
        std = _safe_std(np.asarray(stats["std"], dtype=np.float32))

        # Feature dictionaries keep this compatible with arbitrary key ordering
        # recorded during training while still using the documented 8 features.
        raw = _build_forecast_features(obs)
        feature_map = {
            key: raw[:, idx]
            for idx, key in enumerate(
                ["lat", "lon", "wind_kts", "pressure_hpa", "dlat", "dlon", "dwind", "dpressure"]
            )
        }
        sequence = np.column_stack([feature_map[key] for key in keys]).astype(np.float32)

        if len(sequence) < 4:
            sequence = np.vstack([np.repeat(sequence[[0]], 4 - len(sequence), axis=0), sequence])
        else:
            sequence = sequence[-4:]

        tensor = torch.tensor((sequence - mean) / std, dtype=torch.float32).unsqueeze(0)
        tensor = tensor.to(next(model.parameters()).device)

        with torch.no_grad():
            pos_pred, wind_pred, class_logits = model(tensor)
            probs = torch.softmax(class_logits, dim=1).squeeze(0)
            class_idx = int(torch.argmax(probs).item())
            class_confidence = float(probs[class_idx].item())

        next_lat = round(float(pos_pred[0, 0].item()), 2)
        next_lon = round(float(pos_pred[0, 1].item()), 2)
        predicted_wind = round(max(0.0, float(wind_pred[0].item())), 1)
        classes = meta.get("intensity_classes", INTENSITY_CLASSES)
        intensity = classes[class_idx]
        confidence = round(float(np.clip(class_confidence, 0.50, 0.98)), 2)

        return next_lat, next_lon, predicted_wind, intensity, confidence
    except Exception as exc:
        logger.warning("LSTM inference failed; using baseline: %s", exc)
        return forecast_baseline(obs)


def forecast_baseline(obs):
    """Constant-velocity baseline; deterministic and fully offline."""
    if len(obs) < 2:
        raise ValueError("At least 2 sequential observations are required for forecasting.")

    a, b = obs[-2], obs[-1]
    a_lat = _item_value(a, "lat")
    a_lon = _item_value(a, "lon")
    a_wind = _item_value(a, "wind_kts")
    b_lat = _item_value(b, "lat")
    b_lon = _item_value(b, "lon")
    b_wind = _item_value(b, "wind_kts")

    next_lat = round(b_lat + (b_lat - a_lat), 2)
    next_lon = round(b_lon + (b_lon - a_lon), 2)
    predicted_wind = round(max(0.0, b_wind + (b_wind - a_wind)), 1)

    if predicted_wind < 34:
        intensity = "depression"
    elif predicted_wind < 64:
        intensity = "tropical_storm"
    elif predicted_wind < 83:
        intensity = "severe_cyclonic_storm"
    else:
        intensity = "very_severe_cyclonic_storm"

    confidence = round(min(0.95, 0.55 + min(len(obs), 10) * 0.03), 2)
    return next_lat, next_lon, predicted_wind, intensity, confidence

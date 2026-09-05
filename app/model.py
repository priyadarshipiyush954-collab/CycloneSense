import logging
from io import BytesIO
from pathlib import Path

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

# Global model cache
_vision_model = None
_vision_meta = None
_forecast_model = None
_forecast_meta = None


def get_vision_model():
    """Lazily load PyTorch CyclonePatternCNN if trained checkpoint exists."""
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

        model = CyclonePatternCNN(num_classes=len(checkpoint.get("classes", PATTERNS)))
        model.load_state_dict(checkpoint["model_state_dict"])
        model.to(device)
        model.eval()

        _vision_model = model
        _vision_meta = checkpoint
        logger.info(
            "Loaded trained PyTorch CyclonePatternCNN from %s onto %s",
            VISION_MODEL_PATH,
            device,

        )
        return _vision_model, _vision_meta
    except Exception as exc:
        logger.warning(f"Could not load PyTorch vision model: {exc}. Falling back to baseline.")
        return None, None


def get_forecast_model():
    """Lazily load PyTorch CycloneTrackLSTM if trained checkpoint exists."""
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

        norm_stats = checkpoint["normalization_stats"]
        input_dim = len(norm_stats["keys"])

        model = CycloneTrackLSTM(input_dim=input_dim, hidden_dim=64, num_layers=2)
        model.load_state_dict(checkpoint["model_state_dict"])
        model.to(device)
        model.eval()

        _forecast_model = model
        _forecast_meta = checkpoint
        logger.info(
            "Loaded trained PyTorch CycloneTrackLSTM from %s onto %s",
            FORECAST_MODEL_PATH,
            device,

        )
        return _forecast_model, _forecast_meta
    except Exception as exc:
        logger.warning(f"Could not load PyTorch forecast model: {exc}. Falling back to baseline.")
        return None, None


def image_stats(data: bytes):
    img = Image.open(BytesIO(data)).convert("RGB").resize((128, 128))
    a = np.asarray(img, dtype=np.float32) / 255.0
    g = a.mean(axis=2)
    return (
        float(g.mean()),
        float(g.std()),
        float(np.abs(np.diff(g, axis=0)).mean() + np.abs(np.diff(g, axis=1)).mean()),
        float(g[40:88, 40:88].mean()),
    )


def classify_demo(data: bytes):
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
    """
    Classify satellite imagery morphology.
    Returns: (pattern_label, confidence, model_name)
    """
    model, meta = get_vision_model()
    if model is None:
        label, conf = classify_demo(data)
        return label, conf, "demo-morphology-baseline"

    try:
        import torch
        from torchvision import transforms

        device = next(model.parameters()).device
        img = Image.open(BytesIO(data)).convert("RGB")
        img_size = meta.get("img_size", 128)
        mean = meta.get("mean", [0.485, 0.456, 0.406])
        std = meta.get("std", [0.229, 0.224, 0.225])

        tf = transforms.Compose(
            [
                transforms.Resize((img_size, img_size)),
                transforms.ToTensor(),
                transforms.Normalize(mean=mean, std=std),
            ]
        )

        tf = transforms.Compose(
            [
                transforms.Resize((img_size, img_size)),
                transforms.ToTensor(),
                transforms.Normalize(mean=mean, std=std),
            ]
        )

        tensor = tf(img).unsqueeze(0).to(device)

        with torch.no_grad():
            logits = model(tensor)
            probs = torch.softmax(logits, dim=1).squeeze(0)
            pred_idx = torch.argmax(probs).item()
            conf = float(probs[pred_idx].item())

        classes = meta.get("classes", PATTERNS)
        label = classes[pred_idx]
        return label, round(conf, 4), "cyclone-pattern-cnn-pytorch"
    except Exception as exc:
        logger.warning(f"Inference error with PyTorch model: {exc}. Using baseline.")
        label, conf = classify_demo(data)
        return label, conf, "demo-morphology-baseline"


def forecast(obs):
    """
    Forecast next storm track position, wind speed, intensity class and confidence.
    Uses PyTorch LSTM if checkpoint is available; otherwise uses baseline kinematics.
    """
    if len(obs) < 2:
        raise ValueError("At least 2 sequential observations are required for forecasting.")

    model, meta = get_forecast_model()
    if model is None:
        return forecast_baseline(obs)

    try:
        import torch

        device = next(model.parameters()).device
        norm_stats = meta["normalization_stats"]
        keys = norm_stats["keys"]
        mean = np.array(norm_stats["mean"], dtype=np.float32)
        std = np.array(norm_stats["std"], dtype=np.float32)

        # Build feature vector sequence
        seq_features = []
        for i, o in enumerate(obs):
            lat = getattr(o, "lat", o.get("lat") if isinstance(o, dict) else 0.0)
            lon = getattr(o, "lon", o.get("lon") if isinstance(o, dict) else 0.0)
            wind = getattr(o, "wind_kts", o.get("wind_kts") if isinstance(o, dict) else 0.0)
            pres = getattr(
                o, "pressure_hpa", o.get("pressure_hpa") if isinstance(o, dict) else 1000.0
            )
            pres = getattr(
                o, "pressure_hpa", o.get("pressure_hpa") if isinstance(o, dict) else 1000.0
            )

            if i == 0:
                dlat, dlon, dwind, dpres = 0.0, 0.0, 0.0, 0.0
            else:
                prev = obs[i - 1]
                p_lat = getattr(prev, "lat", prev.get("lat") if isinstance(prev, dict) else 0.0)
                p_lon = getattr(prev, "lon", prev.get("lon") if isinstance(prev, dict) else 0.0)
                p_wind = getattr(
                    prev, "wind_kts", prev.get("wind_kts") if isinstance(prev, dict) else 0.0
                )
                p_pres = getattr(
                    prev,
                    "pressure_hpa",
                    prev.get("pressure_hpa") if isinstance(prev, dict) else 1000.0,
                )

                p_wind = getattr(
                    prev,
                    "wind_kts",
                    prev.get("wind_kts") if isinstance(prev, dict) else 0.0,
                )
                p_pres = getattr(
                    prev,
                    "pressure_hpa",
                    prev.get("pressure_hpa") if isinstance(prev, dict) else 1000.0,
                )
                dlat = lat - p_lat
                dlon = lon - p_lon
                dwind = wind - p_wind
                dpres = pres - p_pres

            feat_dict = {
                "lat": lat,
                "lon": lon,
                "wind_kts": wind,
                "pressure_hpa": pres,
                "dlat": dlat,
                "dlon": dlon,
                "dwind": dwind,
                "dpressure": dpres,
            }
            seq_features.append([feat_dict[k] for k in keys])

        # Take last 4 observations (or pad if fewer)
        if len(seq_features) < 4:
            # Repeat first observation to reach length 4
            pad = [seq_features[0]] * (4 - len(seq_features))
            seq_features = pad + seq_features
        else:
            seq_features = seq_features[-4:]

        arr = (np.array(seq_features, dtype=np.float32) - mean) / std
        tensor = torch.tensor(arr, dtype=torch.float32).unsqueeze(0).to(device)

        with torch.no_grad():
            pos_pred, wind_pred, class_logits = model(tensor)
            probs = torch.softmax(class_logits, dim=1).squeeze(0)
            cls_idx = torch.argmax(probs).item()
            cls_conf = float(probs[cls_idx].item())

        next_lat = round(float(pos_pred[0, 0].item()), 2)
        next_lon = round(float(pos_pred[0, 1].item()), 2)
        pred_wind = round(max(0.0, float(wind_pred[0].item())), 1)
        classes = meta.get("intensity_classes", INTENSITY_CLASSES)
        intensity_class = classes[cls_idx]
        confidence = round(min(0.98, max(0.50, cls_conf)), 2)

        return next_lat, next_lon, pred_wind, intensity_class, confidence
    except Exception as exc:
        logger.warning(f"Error during LSTM forecasting: {exc}. Falling back to baseline.")
        return forecast_baseline(obs)


def forecast_baseline(obs):
    """Forecast using constant-velocity kinematics when no trained model is available."""
    a, b = obs[-2], obs[-1]

    def value(item, key, default=0.0):
        if isinstance(item, dict):
            return item.get(key, default)
        return getattr(item, key, default)

    a_lat = value(a, "lat")
    a_lon = value(a, "lon")
    a_wind = value(a, "wind_kts")
    b_lat = value(b, "lat")
    b_lon = value(b, "lon")
    b_wind = value(b, "wind_kts")

    next_lat = round(b_lat + (b_lat - a_lat), 2)
    next_lon = round(b_lon + (b_lon - a_lon), 2)
    wind = round(max(0.0, b_wind + (b_wind - a_wind)), 1)

    if wind < 34:
        cls = "depression"
    elif wind < 64:
        cls = "tropical_storm"
    elif wind < 83:
        cls = "severe_cyclonic_storm"
    else:
        cls = "very_severe_cyclonic_storm"

    confidence = min(0.95, 0.55 + min(len(obs), 10) * 0.03)
    return next_lat, next_lon, wind, cls, confidence

from io import BytesIO

import numpy as np
from PIL import Image

PATTERNS = [
    "clear",
    "developing",
    "curved_band",
    "central_dense_overcast",
    "eye",
    "sheared",
    "dissipating",
]


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


def forecast(obs):
    a, b = obs[-2], obs[-1]
    next_lat = b.lat + (b.lat - a.lat)
    next_lon = b.lon + (b.lon - a.lon)
    wind = max(0.0, b.wind_kts + (b.wind_kts - a.wind_kts))

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

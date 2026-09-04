"""
Dataset Preparation & Preprocessing Pipeline
CycloneSense AI - Morphology Classification & Track Forecasting Datasets
Prepares:
1. Satellite morphology imagery (train/val/test split strictly by storm ID).
2. Time-series sequences for track and intensity forecasting.
"""

import csv
import json
import logging
import math
import os
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
PROCESSED_DIR = DATA_DIR / "processed"
TRACKS_FILE = PROCESSED_DIR / "cyclone_tracks.csv"

PATTERNS = [
    "clear",
    "developing",
    "curved_band",
    "central_dense_overcast",
    "eye",
    "sheared",
    "dissipating",
]

PATTERN_TO_IDX = {p: i for i, p in enumerate(PATTERNS)}

INTENSITY_CLASSES = [
    "depression",
    "tropical_storm",
    "severe_cyclonic_storm",
    "very_severe_cyclonic_storm",
]
INTENSITY_TO_IDX = {c: i for i, c in enumerate(INTENSITY_CLASSES)}


def synthesize_realistic_satellite_scene(
    pattern: str, size: int = 128, seed: int = 42
) -> Image.Image:
    """
    Synthesize physical infrared (IR) satellite imagery based on Dvorak
    morphology and thermal brightness temperatures.
    Channels:
      Red: Infrared Channel (Cold tops appear bright white/cyan)
      Green: Water Vapor / Mid-level moisture
      Blue: Visible / Texture depth
    """
    rng = random.Random(seed)
    np_rng = np.random.RandomState(seed)

    # Base background: warm ocean surface (IR warm = low brightness in enhanced IR)
    base = np.full((size, size, 3), [28, 35, 48], dtype=np.float32)
    # Add subtle ocean/atmospheric background noise
    base += np_rng.normal(0, 4, (size, size, 3))

    cx, cy = size / 2.0, size / 2.0
    y, x = np.ogrid[:size, :size]
    dist_from_center = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    angle = np.arctan2(y - cy, x - cx)

    if pattern == "clear":
        # Sparse small trade cumulus clouds
        num_clouds = rng.randint(4, 9)
        for _ in range(num_clouds):
            c_x = rng.uniform(10, size - 10)
            c_y = rng.uniform(10, size - 10)
            c_r = rng.uniform(5, 12)
            mask = np.exp(-(((x - c_x) ** 2 + (y - c_y) ** 2) / (2 * c_r**2)))
            base += mask[:, :, None] * np.array([120, 130, 140])

    elif pattern == "developing":
        # Disorganized convective clusters without clear center
        num_clusters = rng.randint(3, 6)
        for _ in range(num_clusters):
            c_x = cx + rng.uniform(-25, 25)
            c_y = cy + rng.uniform(-25, 25)
            c_r = rng.uniform(14, 26)
            mask = np.exp(-(((x - c_x) ** 2 + (y - c_y) ** 2) / (2 * c_r**2)))
            base += mask[:, :, None] * np.array([170, 185, 205])

    elif pattern == "curved_band":
        # Spiral logarithmic bands wrapping around center
        spiral_angle = angle + 0.08 * dist_from_center
        band_mask = np.cos(3 * spiral_angle) * np.exp(-((dist_from_center - 32) ** 2) / 600)
        band_mask = np.clip(band_mask, 0, 1)
        base += band_mask[:, :, None] * np.array([210, 220, 235])

        # Core cluster
        core = np.exp(-(dist_from_center**2) / 450)
        base += core[:, :, None] * np.array([190, 200, 215])

    elif pattern == "central_dense_overcast":
        # Cold, dense, symmetric overcast covering center (CDO)
        cdo_mask = np.exp(-(dist_from_center**2) / (2 * 28**2))
        base += cdo_mask[:, :, None] * np.array([235, 240, 250])
        outer_ring = np.exp(-((dist_from_center - 45) ** 2) / 250)
        base += outer_ring[:, :, None] * np.array([160, 175, 195])

    elif pattern == "eye":
        # High intensity: Cold intense eyewall surrounded by spiral arms, with dark warm eye
        eye_radius = rng.uniform(7, 12)
        eyewall_radius = eye_radius + 18

        # Eyewall ring
        eyewall = np.exp(-((dist_from_center - eyewall_radius) ** 2) / 110)
        # Inside the eye: warm brightness temperature (darker in IR display)
        eye_depression = 1.0 - np.exp(-(dist_from_center**2) / (2 * eye_radius**2))
        eyewall = eyewall * eye_depression

        base += eyewall[:, :, None] * np.array([250, 252, 255])

        # Dense spiral arms feeding the eyewall
        spiral = np.sin(2.5 * angle + 0.12 * dist_from_center)
        outer_bands = (spiral > 0.15) * np.exp(-((dist_from_center - 48) ** 2) / 500)
        base += outer_bands[:, :, None] * np.array([190, 205, 225])

    elif pattern == "sheared":
        # Strong vertical shear: convection blown to one side
        shear_angle = rng.uniform(0, 2 * math.pi)
        projected = (x - cx) * math.cos(shear_angle) + (y - cy) * math.sin(shear_angle)
        shear_mask = (projected > 0) * np.exp(-(dist_from_center**2) / (2 * 32**2))
        base += shear_mask[:, :, None] * np.array([185, 195, 215])

    elif pattern == "dissipating":
        # Weakening, fragmented ragged cloud patches with decaying core
        num_patches = rng.randint(5, 8)
        for _ in range(num_patches):
            p_x = cx + rng.uniform(-35, 35)
            p_y = cy + rng.uniform(-35, 35)
            p_r = rng.uniform(8, 16)
            mask = np.exp(-(((x - p_x) ** 2 + (y - p_y) ** 2) / (2 * p_r**2)))
            base += mask[:, :, None] * np.array([115, 125, 140])

    base = np.clip(base, 0, 255).astype(np.uint8)
    img = Image.fromarray(base)
    # Apply subtle realistic atmospheric smoothing
    img = img.filter(ImageFilter.GaussianBlur(radius=0.7))
    return img


def prepare_image_dataset(samples_per_class: int = 120):
    """
    Generate and partition morphology images strictly by storm IDs
    to prevent temporal or spatial leakage across train/val/test splits.
    """
    logger.info("Preparing satellite morphology classification dataset...")
    splits = {"train": 0.70, "val": 0.15, "test": 0.15}

    # Assign distinct virtual storm IDs to enforce strict grouping
    storm_ids = [
        f"STORM_AMPHAN_{i}" for i in range(15)
    ] + [
        f"STORM_FANI_{i}" for i in range(15)
    ] + [
        f"STORM_BIPARJOY_{i}" for i in range(15)
    ] + [
        f"STORM_TAUKTAE_{i}" for i in range(15)
    ] + [
        f"STORM_MOCHA_{i}" for i in range(15)
    ] + [
        f"STORM_REMAL_{i}" for i in range(15)
    ] + [
        f"STORM_DANA_{i}" for i in range(15)
    ]

    random.seed(42)
    shuffled_storms = list(storm_ids)
    random.shuffle(shuffled_storms)

    n_total = len(shuffled_storms)
    n_train = int(n_total * splits["train"])
    n_val = int(n_total * splits["val"])

    train_storms = set(shuffled_storms[:n_train])
    val_storms = set(shuffled_storms[n_train : n_train + n_val])
    test_storms = set(shuffled_storms[n_train + n_val :])

    logger.info(f"Storm split: {len(train_storms)} train, {len(val_storms)} val, {len(test_storms)} test.")

    counts = {"train": 0, "val": 0, "test": 0}

    for pattern in PATTERNS:
        for s in ("train", "val", "test"):
            (PROCESSED_DIR / s / pattern).mkdir(parents=True, exist_ok=True)

        for i in range(samples_per_class):
            assigned_storm = storm_ids[i % len(storm_ids)]
            if assigned_storm in train_storms:
                split_name = "train"
            elif assigned_storm in val_storms:
                split_name = "val"
            else:
                split_name = "test"

            img = synthesize_realistic_satellite_scene(
                pattern=pattern, size=128, seed=1000 * PATTERN_TO_IDX[pattern] + i
            )
            file_name = f"{assigned_storm}_{pattern}_{i:04d}.png"
            dest_path = PROCESSED_DIR / split_name / pattern / file_name
            img.save(dest_path, "PNG")
            counts[split_name] += 1

    logger.info(
        f"Morphology images generated: train={counts['train']}, val={counts['val']}, test={counts['test']} (Total={sum(counts.values())})"
    )


def prepare_sequential_track_dataset(seq_len: int = 4):
    """
    Read cleaned IBTrACS tracks, split by storm ID,
    generate sliding window sequences (X, y) and compute normalization statistics.
    """
    if not TRACKS_FILE.exists():
        logger.error(f"{TRACKS_FILE} does not exist! Please run download_real_data.py first.")
        return

    logger.info(f"Loading track records from {TRACKS_FILE}...")
    storms = {}
    with open(TRACKS_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sid = row["storm_id"]
            if sid not in storms:
                storms[sid] = []
            storms[sid].append({
                "lat": float(row["lat"]),
                "lon": float(row["lon"]),
                "wind_kts": float(row["wind_kts"]),
                "pressure_hpa": float(row["pressure_hpa"]),
                "dlat": float(row["dlat"]),
                "dlon": float(row["dlon"]),
                "dwind": float(row["dwind"]),
                "dpressure": float(row["dpressure"]),
                "intensity_class": INTENSITY_TO_IDX.get(row["intensity_class"], 0),
            })

    # Strict storm-ID partitioning
    all_sids = list(storms.keys())
    random.seed(123)
    random.shuffle(all_sids)

    n_storms = len(all_sids)
    n_train = int(n_storms * 0.70)
    n_val = int(n_storms * 0.15)

    train_sids = set(all_sids[:n_train])
    val_sids = set(all_sids[n_train : n_train + n_val])
    test_sids = set(all_sids[n_train + n_val :])

    logger.info(f"Storm track partitions: {len(train_sids)} train, {len(val_sids)} val, {len(test_sids)} test.")

    feature_keys = ["lat", "lon", "wind_kts", "pressure_hpa", "dlat", "dlon", "dwind", "dpressure"]

    # Compute normalization statistics ONLY on train set
    train_features = []
    for sid in train_sids:
        for pt in storms[sid]:
            train_features.append([pt[k] for k in feature_keys])

    train_arr = np.array(train_features, dtype=np.float32)
    feat_mean = train_arr.mean(axis=0)
    feat_std = train_arr.std(axis=0)
    # Avoid zero division
    feat_std[feat_std < 1e-4] = 1.0

    norm_stats = {
        "keys": feature_keys,
        "mean": feat_mean.tolist(),
        "std": feat_std.tolist(),
    }
    with open(PROCESSED_DIR / "normalization_stats.json", "w", encoding="utf-8") as nf:
        json.dump(norm_stats, nf, indent=2)

    def build_sequences(sid_set):
        X_list, y_pos_list, y_wind_list, y_cls_list = [], [], [], []
        for sid in sid_set:
            pts = storms[sid]
            if len(pts) <= seq_len:
                continue
            for t in range(len(pts) - seq_len):
                seq = pts[t : t + seq_len]
                target = pts[t + seq_len]

                feat_seq = np.array([[p[k] for k in feature_keys] for p in seq], dtype=np.float32)
                # Normalize features
                normed_seq = (feat_seq - feat_mean) / feat_std

                # Targets: predict next_lat, next_lon, next_wind, next_intensity_class
                X_list.append(normed_seq)
                y_pos_list.append([target["lat"], target["lon"]])
                y_wind_list.append(target["wind_kts"])
                y_cls_list.append(target["intensity_class"])

        return (
            np.array(X_list, dtype=np.float32),
            np.array(y_pos_list, dtype=np.float32),
            np.array(y_wind_list, dtype=np.float32),
            np.array(y_cls_list, dtype=np.int64),
        )

    X_train, y_pos_tr, y_wind_tr, y_cls_tr = build_sequences(train_sids)
    X_val, y_pos_va, y_wind_va, y_cls_va = build_sequences(val_sids)
    X_test, y_pos_te, y_wind_te, y_cls_te = build_sequences(test_sids)

    np.savez_compressed(
        PROCESSED_DIR / "forecast_train.npz",
        X=X_train,
        y_pos=y_pos_tr,
        y_wind=y_wind_tr,
        y_cls=y_cls_tr,
    )
    np.savez_compressed(
        PROCESSED_DIR / "forecast_val.npz",
        X=X_val,
        y_pos=y_pos_va,
        y_wind=y_wind_va,
        y_cls=y_cls_va,
    )
    np.savez_compressed(
        PROCESSED_DIR / "forecast_test.npz",
        X=X_test,
        y_pos=y_pos_te,
        y_wind=y_wind_te,
        y_cls=y_cls_te,
    )

    logger.info(
        f"Forecast sequences generated: train={len(X_train):,}, val={len(X_val):,}, test={len(X_test):,}"
    )


def main():
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    prepare_image_dataset(samples_per_class=120)
    if TRACKS_FILE.exists():
        prepare_sequential_track_dataset(seq_len=4)
    else:
        logger.warning("Tracks file not yet downloaded. Call ml/download_real_data.py first.")


if __name__ == "__main__":
    main()


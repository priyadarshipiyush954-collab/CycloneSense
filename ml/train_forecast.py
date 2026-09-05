"""
Temporal Sequence Training Pipeline for Cyclone Track and Intensity Forecasting
CycloneSense AI - PyTorch LSTM Multi-Task Training
Trains CycloneTrackLSTM on historical IBTrACS storm sequences.
Saves best checkpoint to models/forecast_model.pt.
"""

import json
import logging
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from .models import INTENSITY_CLASSES, CycloneTrackLSTM

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "processed"
MODELS_DIR = BASE_DIR / "models"
CHECKPOINT_PATH = MODELS_DIR / "forecast_model.pt"

BATCH_SIZE = 64
NUM_EPOCHS = 20
LEARNING_RATE = 2e-3


def haversine_distance_km(lat1, lon1, lat2, lon2):
    """Compute great circle distance between two points in km."""
    R = 6371.0  # Earth radius in km
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    delta_phi = np.radians(lat2 - lat1)
    delta_lambda = np.radians(lon2 - lon1)

    a = np.sin(delta_phi / 2.0) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(delta_lambda / 2.0) ** 2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return R * c


def evaluate_forecast(model, loader, device):
    model.eval()
    track_errors_km = []
    wind_errors_kts = []
    correct_cls = 0
    total = 0

    with torch.no_grad():
        for bx, by_pos, by_wind, by_cls in loader:
            bx = bx.to(device)
            by_pos = by_pos.to(device)
            by_wind = by_wind.to(device)
            by_cls = by_cls.to(device)

            pred_pos, pred_wind, pred_cls = model(bx)

            # Track distance error
            p_lat = pred_pos[:, 0].cpu().numpy()
            p_lon = pred_pos[:, 1].cpu().numpy()
            t_lat = by_pos[:, 0].cpu().numpy()
            t_lon = by_pos[:, 1].cpu().numpy()

            dist_km = haversine_distance_km(p_lat, p_lon, t_lat, t_lon)
            track_errors_km.extend(dist_km.tolist())

            # Wind speed error
            w_err = np.abs(pred_wind.cpu().numpy() - by_wind.cpu().numpy())
            wind_errors_kts.extend(w_err.tolist())

            # Intensity classification accuracy
            pred_lbl = pred_cls.argmax(dim=1)
            correct_cls += (pred_lbl == by_cls).sum().item()
            total += by_cls.size(0)

    mean_track_mae = float(np.mean(track_errors_km)) if track_errors_km else 0.0
    mean_wind_mae = float(np.mean(wind_errors_kts)) if wind_errors_kts else 0.0
    cls_acc = correct_cls / total if total > 0 else 0.0
    return mean_track_mae, mean_wind_mae, cls_acc


def train_forecast_model():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    tr_file = DATA_DIR / "forecast_train.npz"
    va_file = DATA_DIR / "forecast_val.npz"
    te_file = DATA_DIR / "forecast_test.npz"
    stats_file = DATA_DIR / "normalization_stats.json"

    if not tr_file.exists() or not stats_file.exists():
        logger.error("Forecast training data not found. Please run prepare_dataset.py first.")
        return None

    with open(stats_file, encoding="utf-8") as sf:
        norm_stats = json.load(sf)

    tr_data = np.load(tr_file)
    va_data = np.load(va_file)
    te_data = np.load(te_file)

    train_ds = TensorDataset(
        torch.tensor(tr_data["X"], dtype=torch.float32),
        torch.tensor(tr_data["y_pos"], dtype=torch.float32),
        torch.tensor(tr_data["y_wind"], dtype=torch.float32),
        torch.tensor(tr_data["y_cls"], dtype=torch.long),
    )
    val_ds = TensorDataset(
        torch.tensor(va_data["X"], dtype=torch.float32),
        torch.tensor(va_data["y_pos"], dtype=torch.float32),
        torch.tensor(va_data["y_wind"], dtype=torch.float32),
        torch.tensor(va_data["y_cls"], dtype=torch.long),
    )
    test_ds = TensorDataset(
        torch.tensor(te_data["X"], dtype=torch.float32),
        torch.tensor(te_data["y_pos"], dtype=torch.float32),
        torch.tensor(te_data["y_wind"], dtype=torch.float32),
        torch.tensor(te_data["y_cls"], dtype=torch.long),
    )

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using compute device: {device}")

    model = CycloneTrackLSTM(input_dim=len(norm_stats["keys"]), hidden_dim=64, num_layers=2).to(
        device
    )

    criterion_pos = nn.MSELoss()
    criterion_wind = nn.SmoothL1Loss()
    criterion_cls = nn.CrossEntropyLoss()

    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=2
    )

    best_track_mae = float("inf")
    start_time = time.time()

    logger.info("Starting LSTM forecast training loop...")
    for epoch in range(1, NUM_EPOCHS + 1):
        model.train()
        running_loss = 0.0
        count = 0

        for bx, by_pos, by_wind, by_cls in train_loader:
            bx = bx.to(device)
            by_pos = by_pos.to(device)
            by_wind = by_wind.to(device)
            by_cls = by_cls.to(device)

            optimizer.zero_grad()
            pred_pos, pred_wind, pred_cls = model(bx)

            loss_pos = criterion_pos(pred_pos, by_pos)
            loss_wind = criterion_wind(pred_wind, by_wind)
            loss_cls = criterion_cls(pred_cls, by_cls)

            total_loss = loss_pos + 0.1 * loss_wind + 0.5 * loss_cls
            total_loss.backward()
            optimizer.step()

            running_loss += total_loss.item() * bx.size(0)
            count += bx.size(0)

        epoch_loss = running_loss / count
        val_track_mae, val_wind_mae, val_cls_acc = evaluate_forecast(model, val_loader, device)
        scheduler.step(val_track_mae)

        logger.info(
            f"Epoch [{epoch:02d}/{NUM_EPOCHS:02d}] Loss: {epoch_loss:.4f} | "
            f"Val Track MAE: {val_track_mae:.1f} km | Val Wind MAE: {val_wind_mae:.1f} kts | "
            f"Val Class Acc: {val_cls_acc * 100:.1f}%"
        )

        if val_track_mae < best_track_mae:
            best_track_mae = val_track_mae
            checkpoint = {
                "model_state_dict": model.state_dict(),
                "normalization_stats": norm_stats,
                "val_track_mae_km": val_track_mae,
                "val_wind_mae_kts": val_wind_mae,
                "val_cls_acc": val_cls_acc,
                "intensity_classes": INTENSITY_CLASSES,
            }
            torch.save(checkpoint, CHECKPOINT_PATH)
            logger.info(f"--> Saved best forecast checkpoint (Track MAE: {best_track_mae:.1f} km)")

    elapsed = time.time() - start_time
    logger.info(f"Forecast model training completed in {elapsed:.1f} seconds.")

    # Evaluate on test set
    if CHECKPOINT_PATH.exists():
        ckpt = torch.load(CHECKPOINT_PATH, map_location=device, weights_only=False)
        model.load_state_dict(ckpt["model_state_dict"])
        te_track_mae, te_wind_mae, te_cls_acc = evaluate_forecast(model, test_loader, device)
        logger.info(
            f"Final Test Evaluation: Track MAE: {te_track_mae:.1f} km | "
            f"Wind MAE: {te_wind_mae:.1f} kts | Intensity Acc: {te_cls_acc * 100:.1f}%"
        )

    return CHECKPOINT_PATH


def main():
    train_forecast_model()


if __name__ == "__main__":
    main()

"""
Deep Learning Architectures for CycloneSense AI
1. CyclonePatternCNN: 7-class morphology classifier with Grad-CAM hooks.
2. CycloneTrackLSTM: Multi-task temporal sequence model for track + intensity forecasting.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

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


class ConvBlock(nn.Module):
    def __init__(self, in_channels: int, out_channels: int, stride: int = 1):
        super().__init__()
        self.conv1 = nn.Conv2d(
            in_channels, out_channels, kernel_size=3, stride=stride, padding=1, bias=False
        )
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.conv2 = nn.Conv2d(
            out_channels, out_channels, kernel_size=3, stride=1, padding=1, bias=False
        )
        self.bn2 = nn.BatchNorm2d(out_channels)

        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(out_channels),
            )
        else:
            self.shortcut = nn.Identity()

    def forward(self, x):
        residual = self.shortcut(x)
        out = F.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out = F.relu(out + residual)
        return out


class CyclonePatternCNN(nn.Module):
    """
    Convolutional Neural Network for Satellite Morphology Pattern Classification.
    Provides Grad-CAM support to visualize key meteorological cloud structures.
    """

    def __init__(self, num_classes: int = 7):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=5, stride=2, padding=2, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
        )
        self.layer1 = ConvBlock(32, 64, stride=2)
        self.layer2 = ConvBlock(64, 128, stride=2)
        self.layer3 = ConvBlock(128, 256, stride=2)
        self.layer4 = ConvBlock(256, 256, stride=1)

        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.classifier = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(256, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.2),
            nn.Linear(128, num_classes),
        )

        # Variables for Grad-CAM activations and gradients
        self.gradients = None
        self.activations = None

    def _save_gradient_hook(self, grad):
        self.gradients = grad

    def forward(self, x):
        h = self.stem(x)
        h = self.layer1(h)
        h = self.layer2(h)
        h = self.layer3(h)
        h = self.layer4(h)

        if x.requires_grad:
            self.activations = h
            h.register_hook(self._save_gradient_hook)

        p = self.pool(h)
        flat = torch.flatten(p, 1)
        logits = self.classifier(flat)
        return logits

    def generate_gradcam(self, x: torch.Tensor, class_idx: int = None) -> torch.Tensor:
        """
        Compute normalized 2D Grad-CAM heatmap for explainable AI.
        """
        self.eval()
        x = x.clone().detach().requires_grad_(True)
        logits = self.forward(x)

        if class_idx is None:
            class_idx = logits.argmax(dim=1).item()

        score = logits[0, class_idx]
        self.zero_grad()
        score.backward(retain_graph=True)

        if self.gradients is None or self.activations is None:
            return torch.zeros((x.shape[2], x.shape[3]))

        weights = torch.mean(self.gradients, dim=[2, 3], keepdim=True)
        cam = torch.sum(weights * self.activations, dim=1, keepdim=True)
        cam = F.relu(cam)
        cam = F.interpolate(
            cam, size=(x.shape[2], x.shape[3]), mode="bilinear", align_corners=False
        )
        cam = cam.squeeze().detach()

        max_val = cam.max()
        if max_val > 0:
            cam = cam / max_val
        return cam


class CycloneTrackLSTM(nn.Module):
    """
    Multi-task LSTM for Short-Term Cyclone Track & Intensity Forecasting.
    Predicts:
    1. next_lat, next_lon (Haversine displacement)
    2. predicted_wind_kts
    3. intensity_class (4 categories)
    """

    def __init__(self, input_dim: int = 8, hidden_dim: int = 64, num_layers: int = 2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.2 if num_layers > 1 else 0.0,
        )

        # Multi-task heads
        self.pos_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 2),  # next_lat, next_lon
        )

        self.wind_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),  # predicted_wind_kts
        )

        self.class_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, len(INTENSITY_CLASSES)),  # intensity category
        )

    def forward(self, x):
        # x shape: (batch_size, seq_len, input_dim)
        lstm_out, _ = self.lstm(x)
        last_hidden = lstm_out[:, -1, :]

        pos_pred = self.pos_head(last_hidden)
        wind_pred = self.wind_head(last_hidden).squeeze(-1)
        class_logits = self.class_head(last_hidden)

        return pos_pred, wind_pred, class_logits

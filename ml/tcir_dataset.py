"""PyTorch dataset adapter for the official TCIR HDF5 dataset.

TCIR stores samples as N x 201 x 201 x 4 arrays with channels:
IR1, water vapor, visible, and passive microwave.  Labels in ``info`` include
maximum sustained wind, pressure, size, and storm metadata.

This adapter deliberately keeps the original continuous intensity labels. It
is not pretending that TCIR provides the seven Dvorak morphology labels.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import h5py
import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset


class TCIRDataset(Dataset):
    """Lazy-loading TCIR HDF5 dataset for image-to-intensity regression."""

    def __init__(
        self,
        h5_path: str | Path,
        indices: Optional[np.ndarray] = None,
        channel_indices: tuple[int, ...] = (0, 3),
        image_size: int = 224,
    ) -> None:
        self.h5_path = str(h5_path)
        self.channel_indices = channel_indices
        self.image_size = image_size
        self._h5 = None

        self.info = pd.read_hdf(self.h5_path, key="info", mode="r")
        if indices is None:
            indices = np.arange(len(self.info))
        self.indices = np.asarray(indices, dtype=np.int64)

        # TCIR's primary target is maximum sustained wind in knots.
        self.wind_column = self._find_column(
            ["wind", "intensity", "wind_kts", "wind speed", "Vmax"]
        )
        if self.wind_column is None:
            raise ValueError(
                "Could not find a wind/intensity column in TCIR info. "
                f"Available columns: {list(self.info.columns)}"
            )

    def _find_column(self, candidates):
        normalized = {str(c).strip().lower(): c for c in self.info.columns}
        for candidate in candidates:
            if candidate.lower() in normalized:
                return normalized[candidate.lower()]
        for key, original in normalized.items():
            if "wind" in key or "intensity" in key:
                return original
        return None

    def _open(self):
        if self._h5 is None:
            self._h5 = h5py.File(self.h5_path, "r")
        return self._h5

    def __len__(self):
        return len(self.indices)

    def __getitem__(self, item):
        source_index = int(self.indices[item])
        matrix = self._open()["matrix"][source_index]
        image = np.asarray(matrix[..., list(self.channel_indices)], dtype=np.float32)

        # Replace TCIR missing values before normalization.
        image = np.nan_to_num(image, nan=0.0, posinf=0.0, neginf=0.0)
        image = torch.from_numpy(image).permute(2, 0, 1)
        image = torch.nn.functional.interpolate(
            image.unsqueeze(0), size=(self.image_size, self.image_size), mode="bilinear", align_corners=False
        ).squeeze(0)

        # Per-channel robust normalization keeps satellite dynamic range stable.
        mean = image.flatten(1).mean(dim=1, keepdim=True).unsqueeze(-1)
        std = image.flatten(1).std(dim=1, keepdim=True).unsqueeze(-1).clamp_min(1e-6)
        image = (image - mean) / std

        target = float(self.info.iloc[source_index][self.wind_column])
        return image, torch.tensor(target, dtype=torch.float32)

    def close(self):
        if self._h5 is not None:
            self._h5.close()
            self._h5 = None

    def __del__(self):
        try:
            self.close()
        except Exception:
            pass

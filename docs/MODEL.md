# Model plan
Baseline: deterministic morphology heuristic, included only to make the demo immediately runnable.
# CycloneSense AI Model Architecture & Training

Competition model:
1. EfficientNet/ResNet or compact ViT for satellite imagery.
2. MLP for environmental metadata.
3. Feature fusion.
4. Pattern classification head.
5. LSTM/Temporal Transformer for track and intensity.
## 1. Vision Morphology Model (`CyclonePatternCNN`)
A deep convolutional neural network designed for satellite remote sensing and infrared morphology classification.

Metrics: macro-F1, balanced accuracy, per-class recall; track MAE in km; wind MAE; intensity F1.
### Architecture
- **Input**: 3-channel satellite imagery $(3 \times 128 \times 128)$.
- **Backbone**:
  - Initial Strided Convolution $(5 \times 5, \text{stride}=2, \text{filters}=32)$ + BatchNorm + ReLU.
  - Residual Block 1: 32 -> 64 channels $(\text{stride}=2)$.
  - Residual Block 2: 64 -> 128 channels $(\text{stride}=2)$.
  - Residual Block 3: 128 -> 256 channels $(\text{stride}=2)$.
  - Residual Block 4: 256 -> 256 channels $(\text{stride}=1)$.
- **Classifier Head**:
  - Global Adaptive Average Pooling $(1 \times 1)$.
  - Linear $(256 \to 128)$ + Dropout $(0.3)$ + ReLU + Linear $(128 \to 7)$.
- **Explainability**:
  - Built-in **Grad-CAM** hook registering backward gradients on the final residual feature map to highlight eyewall and spiral band regions.
- **Artifact**: Saved to `models/cyclone_model.pt`.

Add Grad-CAM/attention maps for explainability.
---

## 2. Temporal Track & Intensity Forecaster (`CycloneTrackLSTM`)
A recurrent multi-task sequence network trained on historical cyclone best tracks.

### Architecture
- **Input**: Normalized sliding sequence of 4 consecutive historical observations $(B, 4, 8)$:
  `[lat, lon, wind_kts, pressure_hpa, dlat, dlon, dwind, dpressure]`.
- **Core**: 2-layer LSTM $(\text{hidden}=64, \text{dropout}=0.2)$.
- **Multi-Task Heads**:
  - **Track Position Head**: Linear $(64 \to 32) \to \text{Linear}(32 \to 2)$ predicting $(\text{next\_lat}, \text{next\_lon})$.
  - **Wind Speed Head**: Linear $(64 \to 32) \to \text{Linear}(32 \to 1)$ predicting future maximum sustained wind.
  - **Intensity Classification Head**: Linear $(64 \to 32) \to \text{Linear}(32 \to 4)$ predicting cyclone strength category.
- **Loss Function**:
  $$\mathcal{L} = \text{MSE}(\text{pos}) + 0.1 \cdot \text{SmoothL1}(\text{wind}) + 0.5 \cdot \text{CrossEntropy}(\text{class})$$
- **Artifact**: Saved to `models/forecast_model.pt`.

---

## 3. Training & Inference
- **Device Support**: Hardware accelerated on NVIDIA GPUs (CUDA) with automatic CPU fallback.
- **API Integration**: FastAPI backend dynamically loads trained weights on startup and runs real-time inference with cached memory state.

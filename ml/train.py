# Competition training entry point.
# Recommended production model: EfficientNet/ResNet/ViT image encoder +
# metadata MLP + fusion layer + LSTM/Temporal Transformer for forecasting.
# Dataset layout:
# data/train/<pattern>/*.png
# data/val/<pattern>/*.png
# Split by STORM ID to prevent temporal leakage.
print("Add your GPU training pipeline here; save checkpoint to models/cyclone_model.pt")

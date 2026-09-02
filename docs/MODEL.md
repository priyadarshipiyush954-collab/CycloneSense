# Model plan
Baseline: deterministic morphology heuristic, included only to make the demo immediately runnable.

Competition model:
1. EfficientNet/ResNet or compact ViT for satellite imagery.
2. MLP for environmental metadata.
3. Feature fusion.
4. Pattern classification head.
5. LSTM/Temporal Transformer for track and intensity.

Metrics: macro-F1, balanced accuracy, per-class recall; track MAE in km; wind MAE; intensity F1.

Add Grad-CAM/attention maps for explainability.

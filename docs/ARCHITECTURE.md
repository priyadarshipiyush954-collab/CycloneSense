# Architecture
Production flow: satellite sources → ingestion/normalization → image encoder + metadata encoder → fusion → pattern classifier + temporal forecast → FastAPI → web dashboard.

For multi-source fusion, keep satellite source/channel/timestamp explicit. Normalize storm-centered image windows into a common projection before training.

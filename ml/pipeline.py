"""
Master Pipeline Orchestrator for CycloneSense AI
Executes end-to-end:
1. Downloads real NOAA/IMD IBTrACS cyclone data.
2. Prepares computer vision and time-series datasets.
3. Trains PyTorch Satellite Morphology Vision Model (CyclonePatternCNN).
4. Trains PyTorch Temporal Track & Intensity Forecasting Model (CycloneTrackLSTM).
5. Verifies checkpoints and outputs summary metrics.
"""

import logging
import time

from .download_real_data import main as download_main
from .prepare_dataset import main as prepare_main
from .train import main as train_vision_main
from .train_forecast import main as train_forecast_main

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("Pipeline")


def run_full_pipeline():
    start_total = time.time()
    logger.info("=" * 60)
    logger.info("   CYCLONESENSE AI - REAL DATA & TRAINING PIPELINE")
    logger.info("=" * 60)

    logger.info("\n[STEP 1/4] Ingesting Real NOAA IBTrACS Cyclone Data...")
    download_main()

    logger.info("\n[STEP 2/4] Preparing Multi-Modal Datasets (Vision + Temporal)...")
    prepare_main()

    logger.info("\n[STEP 3/4] Training PyTorch Satellite Morphology Vision Model...")
    train_vision_main()

    logger.info("\n[STEP 4/4] Training PyTorch Track & Intensity Forecasting Model...")
    train_forecast_main()

    total_time = time.time() - start_total
    logger.info("=" * 60)
    logger.info(f"   PIPELINE COMPLETE! Total Time: {total_time:.1f}s")
    logger.info("=" * 60)


if __name__ == "__main__":
    run_full_pipeline()

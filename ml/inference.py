"""Standalone CLI inference utility for CycloneSense AI.

Usage:
    python ml/inference.py --pattern eye
    python ml/inference.py --track-forecast --cyclone-id ARB-2026-02
"""

import sys
import json
import argparse
from app.model import engine

def main():
    parser = argparse.ArgumentParser(description="CycloneSense CLI Inference")
    parser.add_argument("--pattern", default="eye", help="Test pattern classification ('eye', 'central_dense_overcast', etc.)")
    parser.add_argument("--track-forecast", action="store_true", help="Run 72h track & intensity projection")
    parser.add_argument("--cyclone-id", default="ARB-2026-02", help="Cyclone ID")
    args = parser.parse_args()

    if args.track_forecast:
        obs = [
            {"lat": 14.8, "lon": 72.1, "wind_kts": 45, "pressure_hpa": 992},
            {"lat": 15.9, "lon": 71.85, "wind_kts": 55, "pressure_hpa": 984},
            {"lat": 17.15, "lon": 71.5, "wind_kts": 70, "pressure_hpa": 970},
            {"lat": 18.42, "lon": 71.18, "wind_kts": 95, "pressure_hpa": 954},
        ]
        res = engine.predict_trajectory(args.cyclone_id, obs)
        print(json.dumps(res, indent=2))
    else:
        res = engine.classify_morphology(args.pattern)
        print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()

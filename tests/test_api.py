"""Unit tests for CycloneSense AI Python Engine & Model Predictions.

Can be run via:
    python3 -m unittest tests/test_api.py
or:
    pytest tests/test_api.py
"""

import unittest
from app.model import engine, planck_radiance_to_temp_kelvin, generate_synthetic_gradcam


class TestCycloneSenseEngine(unittest.TestCase):

    def test_planck_conversion(self):
        """Validates Planck radiance to Kelvin temperature calibration."""
        temp_k = planck_radiance_to_temp_kelvin(radiance_mw=1.2, wavelength_um=10.8)
        self.assertTrue(180.0 <= temp_k <= 225.0)

    def test_gradcam_generation(self):
        """Validates Grad-CAM matrix shape and normalized activation bounds [0.0, 1.0]."""
        grid = generate_synthetic_gradcam("eye", grid_size=12)
        self.assertEqual(len(grid), 12)
        self.assertEqual(len(grid[0]), 12)
        for row in grid:
            for val in row:
                self.assertTrue(0.0 <= val <= 1.0)

    def test_morphology_classifier(self):
        """Validates Dvorak morphological classification for 'eye' preset."""
        result = engine.classify_morphology("eye")
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["pattern_predicted"], "eye")
        self.assertGreater(result["confidence"], 0.90)
        self.assertLess(result["min_brightness_temp_kelvin"], 210.0)
        self.assertLess(result["estimated_central_pressure_hpa"], 960)

    def test_trajectory_predictor(self):
        """Validates 72-hour recurrent trajectory extrapolation and coastal landfall detection."""
        obs = [
            {"lat": 14.8, "lon": 72.1, "wind_kts": 45, "pressure_hpa": 992},
            {"lat": 15.9, "lon": 71.85, "wind_kts": 55, "pressure_hpa": 984},
            {"lat": 17.15, "lon": 71.5, "wind_kts": 70, "pressure_hpa": 970},
            {"lat": 18.42, "lon": 71.18, "wind_kts": 95, "pressure_hpa": 954},
        ]
        forecast = engine.predict_trajectory("ARB-2026-02", obs)
        self.assertEqual(forecast["status"], "success")
        self.assertEqual(len(forecast["prognostic_trajectory"]), 5)
        self.assertTrue(forecast["rapid_intensification_detected"])

        # Validate cone of uncertainty expands with time
        cones = [pt["cone_radius_km"] for pt in forecast["prognostic_trajectory"]]
        self.assertEqual(cones, sorted(cones))


if __name__ == "__main__":
    unittest.main()

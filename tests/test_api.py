from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.model import PATTERNS, forecast_baseline

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_patterns():
    response = client.get("/patterns")
    assert response.status_code == 200
    assert "patterns" in response.json()
    assert len(response.json()["patterns"]) == 7


def test_pattern_upload():
    buffer = BytesIO()
    Image.new("RGB", (64, 64), (160, 160, 160)).save(buffer, "PNG")
    buffer.seek(0)

    response = client.post(
        "/predict/pattern",
        files={"file": ("test_cyclone.png", buffer, "image/png")},
    )

    assert response.status_code == 200
    data = response.json()
    assert "pattern" in data
    assert data["pattern"] in PATTERNS
    assert "confidence" in data
    assert 0.0 <= data["confidence"] <= 1.0
    assert "model" in data


def test_invalid_file_type():
    buffer = BytesIO(b"not an image")
    response = client.post(
        "/predict/pattern",
        files={"file": ("test.txt", buffer, "text/plain")},
    )
    assert response.status_code == 400


def test_forecast_endpoint():
    payload = {
        "observations": [
            {"lat": 14.2, "lon": 72.1, "wind_kts": 45, "pressure_hpa": 995},
            {"lat": 14.7, "lon": 72.8, "wind_kts": 52, "pressure_hpa": 989},
            {"lat": 15.1, "lon": 73.5, "wind_kts": 58, "pressure_hpa": 984},
        ]
    }

    response = client.post("/predict/forecast", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert "next_lat" in res
    assert "next_lon" in res
    assert "predicted_wind_kts" in res
    assert "intensity_class" in res
    assert "confidence" in res
    assert 10.0 <= res["next_lat"] <= 20.0
    assert 60.0 <= res["next_lon"] <= 85.0
    assert res["predicted_wind_kts"] >= 0.0


def test_baseline_kinematics():
    obs = [
        {"lat": 14.2, "lon": 72.1, "wind_kts": 45, "pressure_hpa": 995},
        {"lat": 14.7, "lon": 72.8, "wind_kts": 52, "pressure_hpa": 989},
        {"lat": 15.1, "lon": 73.5, "wind_kts": 58, "pressure_hpa": 984},
    ]
    next_lat, next_lon, wind, cls, conf = forecast_baseline(obs)
    assert next_lat == 15.5
    assert next_lon == 74.2
    assert wind == 64.0
    assert cls == "severe_cyclonic_storm"

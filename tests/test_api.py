from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_pattern():
    buffer = BytesIO()
    Image.new("RGB", (64, 64), (160, 160, 160)).save(buffer, "PNG")
    buffer.seek(0)

    response = client.post(
        "/predict/pattern",
        files={"file": ("x.png", buffer, "image/png")},
    )

    assert response.status_code == 200
    assert "pattern" in response.json()


def test_forecast():
    payload = {
        "observations": [
            {"lat": 14.2, "lon": 72.1, "wind_kts": 45, "pressure_hpa": 995},
            {"lat": 14.7, "lon": 72.8, "wind_kts": 52, "pressure_hpa": 989},
            {"lat": 15.1, "lon": 73.5, "wind_kts": 58, "pressure_hpa": 984},
        ]
    }

    response = client.post("/predict/forecast", json=payload)

    assert response.status_code == 200
    assert response.json()["next_lat"] == 15.5

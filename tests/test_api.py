from io import BytesIO
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)

def test_health():
    r=client.get("/health"); assert r.status_code==200; assert r.json()["status"]=="ok"

def test_pattern():
    b=BytesIO(); Image.new("RGB",(64,64),(160,160,160)).save(b,"PNG"); b.seek(0)
    r=client.post("/predict/pattern",files={"file":("x.png",b,"image/png")})
    assert r.status_code==200 and "pattern" in r.json()

def test_forecast():
    p={"observations":[{"lat":14.2,"lon":72.1,"wind_kts":45,"pressure_hpa":995},{"lat":14.7,"lon":72.8,"wind_kts":52,"pressure_hpa":989},{"lat":15.1,"lon":73.5,"wind_kts":58,"pressure_hpa":984}]}
    r=client.post("/predict/forecast",json=p)
    assert r.status_code==200 and r.json()["next_lat"]==15.5

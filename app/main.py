from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import UnidentifiedImageError

from .model import PATTERNS, classify_demo, forecast
from .model import PATTERNS, classify_demo, classify_image, forecast
from .schemas import ForecastRequest, ForecastResponse

app = FastAPI(title="CycloneSense AI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "cyclonesense-api"}


@app.get("/patterns")
def patterns():
    return {"patterns": PATTERNS}


@app.post("/predict/pattern")
async def predict_pattern(file: UploadFile = File(...)):  # noqa: B008
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a satellite image.")

    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image exceeds 10 MB limit.")

    try:
        label, confidence = classify_demo(data)
        label, confidence, model_name = classify_image(data)
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}") from exc

    return {
        "pattern": label,
        "confidence": confidence,
        "model": "demo-morphology-baseline",
        "model": model_name,
        "disclaimer": "Prototype result; not an official warning.",
    }


@app.post("/predict/forecast", response_model=ForecastResponse)
def predict_forecast(req: ForecastRequest):
    x = forecast(req.observations)
    return ForecastResponse(
        next_lat=x[0],
        next_lon=x[1],
        predicted_wind_kts=x[2],
        intensity_class=x[3],
        confidence=x[4],
    )

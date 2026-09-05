"""FastAPI entry point for CycloneSense AI."""
from __future__ import annotations
import time
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from app.schemas import ForecastRequest, ForecastResponse, PatternResponse, HealthResponse
from app.model import engine

START_TIME = time.time()
app = FastAPI(title="CycloneSense AI", description="Cyclone image analysis and short-term forecasting.", version="1.3.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

@app.get("/health", response_model=HealthResponse)
@app.get("/api/health", response_model=HealthResponse, include_in_schema=False)
def get_health():
    return HealthResponse(status="ok", service="cyclonesense-api-python", version="1.3.0",
        uptime_seconds=round(time.time()-START_TIME, 1),
        hardware={"engine": engine.device, "gpu": "cuda" if engine.device == "cuda" else "cpu", "model_mode": engine.model_mode},
        models_loaded={"image_analyzer": True, "trajectory_engine": True, "gradcam_engine": False},
        telemetry={"satellite_sources": ["INSAT-3D/3DR VHRR", "Himawari-9", "GOES-16"], "spatial_coverage": "North Indian Ocean"})

@app.post("/predict/pattern", response_model=PatternResponse, tags=["Vision"])
@app.post("/api/predict/pattern", response_model=PatternResponse, include_in_schema=False)
async def predict_cyclone_pattern(file: UploadFile = File(...)):
    """Analyze the actual uploaded image."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(415, "Please upload an image file.")
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(400, "The uploaded image is empty.")
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(413, "Image exceeds the 10 MB limit.")
    try:
        return PatternResponse(**engine.classify_image(image_bytes))
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(500, f"Image analysis failed: {exc}") from exc

@app.post("/predict/forecast", response_model=ForecastResponse, tags=["Forecast"])
@app.post("/api/predict/forecast", response_model=ForecastResponse, include_in_schema=False)
def predict_cyclone_forecast(payload: ForecastRequest):
    try:
        result = engine.predict_trajectory(payload.cyclone_id, [o.model_dump() for o in payload.observations])
        return ForecastResponse(**result)
    except Exception as exc:
        raise HTTPException(500, str(exc)) from exc

@app.get("/cyclones/active")
@app.get("/api/cyclones/active", include_in_schema=False)
def list_active_cyclones():
    return {"status": "success", "active_systems": [], "message": "Live registry is not connected."}

@app.get("/export/geojson")
@app.get("/api/export/geojson", include_in_schema=False)
def export_geojson(cyclone_id: str = "demo"):
    result = engine.predict_trajectory(cyclone_id, [
        {"lat":14.2,"lon":72.1,"wind_kts":45,"pressure_hpa":995},
        {"lat":14.7,"lon":72.8,"wind_kts":52,"pressure_hpa":989},
        {"lat":15.1,"lon":73.5,"wind_kts":58,"pressure_hpa":984}])
    points = [[73.5,15.1]] + [[p["pred_lon"],p["pred_lat"]] for p in result["prognostic_trajectory"]]
    return {"type":"FeatureCollection","features":[{"type":"Feature","properties":{"cyclone_id":cyclone_id},"geometry":{"type":"LineString","coordinates":points}}]}

@app.get("/export/bulletin", response_class=PlainTextResponse)
@app.get("/api/export/bulletin", response_class=PlainTextResponse, include_in_schema=False)
def export_bulletin(cyclone_id: str = "demo"):
    return f"CYCLONESENSE AI RESEARCH BULLETIN\nCYCLONE ID: {cyclone_id}\nGenerated: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}\n\nVerify against official IMD/RSMC advisories."

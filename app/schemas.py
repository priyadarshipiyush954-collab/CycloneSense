"""Data schemas and Pydantic V2 models for CycloneSense AI."""

from __future__ import annotations
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class Observation(BaseModel):
    """Historical or current meteorological fix observation for a cyclone."""
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")
    wind_kts: float = Field(..., ge=0.0, le=300.0, description="1-minute sustained maximum wind in knots")
    pressure_hpa: float = Field(..., ge=800.0, le=1050.0, description="Estimated minimum central atmospheric pressure in hPa")
    timestamp: Optional[str] = Field(None, description="ISO-8601 observation timestamp")


class ForecastRequest(BaseModel):
    """Request payload for multi-step prognostic track and intensity extrapolation."""
    cyclone_id: str = Field(..., min_length=1, max_length=64, description="Standard cyclone identifier (e.g. ARB-2026-02)")
    observations: List[Observation] = Field(..., min_length=1, description="Sequential meteorological observations (earliest to latest)")


class TrajectoryPoint(BaseModel):
    """Prognostic storm waypoint projected by the recurrent temporal model."""
    tau_hours: int = Field(..., description="Prognostic lead time (+12h, +24h, +36h, +48h, +72h)")
    pred_lat: float = Field(..., description="Predicted latitude")
    pred_lon: float = Field(..., description="Predicted longitude")
    pred_wind_kts: float = Field(..., description="Predicted sustained surface wind in knots")
    pred_pressure_hpa: float = Field(..., description="Predicted central pressure in hPa")
    cone_radius_km: float = Field(..., description="90% track cone of uncertainty radius in km")
    is_landfall: bool = Field(False, description="True if cyclone center crosses coastline at this tau")
    landfall_location: Optional[str] = Field(None, description="Landmark or district name if coastal crossing occurs")


class CoastalIntercept(BaseModel):
    """Predicted cyclone coastal crossing location, ETA, and storm surge context."""
    lat: float
    lon: float
    location: str
    eta_hours: float
    confidence_window_hours: float = 2.5
    tidal_coincidence: str


class ForecastResponse(BaseModel):
    """Prognostic 72-hour forecast response output."""
    status: str = "success"
    cyclone_id: str
    prognostic_trajectory: List[TrajectoryPoint]
    intensity_class: str
    confidence_index: float
    rapid_intensification_detected: bool
    landfall_intercept: Optional[CoastalIntercept] = None


class PatternRequest(BaseModel):
    """Request to classify tropical cyclone satellite imagery into Dvorak structural patterns."""
    preset_pattern: Optional[str] = Field("eye", description="Standard benchmark preset: 'eye', 'central_dense_overcast', 'curved_band', 'developing', 'sheared', 'dissipating', 'clear'")
    image_base64: Optional[str] = Field(None, description="Base64-encoded satellite swath (TIR1/VIS/WV)")
    explainability_engine: Optional[str] = Field("GradCAM_ViT", description="Explainable AI method: 'GradCAM_ViT' or 'IntegratedGradients'")


class PatternResponse(BaseModel):
    """Dvorak morphological classification output with Grad-CAM heatmap grid."""
    status: str = "success"
    pattern_predicted: str
    dvorak_taxonomy: str
    confidence: float
    probabilities: Dict[str, float]
    min_brightness_temp_kelvin: float
    estimated_central_pressure_hpa: float
    grad_cam_saliency_hash: str
    explanation: str
    grad_cam_grid: List[List[float]]
    disclaimer: str = "Operational Cyclone Research Decision Support · Verify against official IMD/RSMC advisories"


class HealthResponse(BaseModel):
    """System health, hardware state, and model inference telemetry."""
    status: str
    service: str
    version: str
    uptime_seconds: float
    hardware: Dict[str, Any]
    models_loaded: Dict[str, bool]
    telemetry: Dict[str, Any]

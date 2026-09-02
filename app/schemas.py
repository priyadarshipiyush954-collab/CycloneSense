from pydantic import BaseModel, Field


class Observation(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    wind_kts: float = Field(ge=0, le=250)
    pressure_hpa: float = Field(ge=850, le=1100)


class ForecastRequest(BaseModel):
    observations: list[Observation] = Field(min_length=2, max_length=100)


class ForecastResponse(BaseModel):
    next_lat: float
    next_lon: float
    predicted_wind_kts: float
    intensity_class: str
    confidence: float

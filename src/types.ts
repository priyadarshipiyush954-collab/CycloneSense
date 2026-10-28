export type PatternClass =
  | "clear"
  | "developing"
  | "curved_band"
  | "central_dense_overcast"
  | "eye"
  | "sheared"
  | "dissipating";

export interface Observation {
  id: string;
  lat: number;
  lon: number;
  wind_kts: number;
  pressure_hpa: number;
  timestamp: string;
}

export interface PrognosticWaypoint {
  tau_hours: number;
  pred_lat: number;
  pred_lon: number;
  pred_wind_kts: number;
  pred_pressure_hpa: number;
  cone_radius_km: number;
  is_landfall?: boolean;
  landfall_location?: string;
}

export interface LandfallIntercept {
  lat: number;
  lon: number;
  location: string;
  eta_hours: number;
  confidence_window_hours: number;
  tidal_coincidence: string;
}

export interface ForecastResponse {
  status: string;
  cyclone_id: string;
  prognostic_trajectory: PrognosticWaypoint[];
  intensity_class: string;
  confidence_index: number;
  rapid_intensification_detected: boolean;
  landfall_intercept: LandfallIntercept;
}

export interface PatternResponse {
  status: string;
  pattern_predicted: PatternClass;
  dvorak_taxonomy: string;
  confidence: number;
  probabilities: Record<PatternClass, number>;
  min_brightness_temp_kelvin: number;
  estimated_central_pressure_hpa: number;
  grad_cam_saliency_hash: string;
  explanation: string;
  grad_cam_grid: number[][];
  disclaimer?: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  uptime_seconds: number;
  hardware: {
    engine: string;
    gpu: string;
    vram_allocated_gb: number;
    inference_latency_ms: number;
    cuda_stream_active: boolean;
  };
  models_loaded: {
    vit_b16_dvorak: boolean;
    bilstm_trajectory_transformer: boolean;
    gradcam_engine: boolean;
  };
  telemetry: {
    satellite_sources: string[];
    spectral_bands: string[];
    postgis_index_status: string;
  };
}

export type SpectralBand = "TIR1" | "WV" | "VIS" | "RGB";

export interface BenchmarkPreset {
  id: string;
  name: string;
  basin: string;
  date: string;
  pattern: PatternClass;
  dvorak: string;
  wind_kts: number;
  pressure_hpa: number;
  min_temp_k: number;
  description: string;
  sampleObservations: Observation[];
}

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Observation, ForecastResponse, PrognosticWaypoint } from "../types";
import { BENCHMARK_PRESETS } from "../data/presets";
import { computePrognosticForecastClient, NIO_COAST_POINTS, findNearestCoast, classifyIntensity } from "../utils/forecastEngine";
import {
  MapPin,
  AlertTriangle,
  Plus,
  Trash2,
  RefreshCw,
  TrendingUp,
  Navigation2,
  Waves,
  Play,
  Pause,
  RotateCcw,
  Compass,
  Wind,
  Gauge,
  Sliders,
  CheckCircle2,
} from "lucide-react";

interface TrajectoryForecastProps {
  initialObservations: Observation[];
  onForecastUpdate?: (forecast: ForecastResponse) => void;
}

// Vector polygons for the Indian Subcontinent coastlines (Arabian Sea + Bay of Bengal + Sri Lanka)
const WEST_COAST_POLY = [
  [24.5, 68.1], // Indus Delta / Sir Creek
  [23.7, 68.6],
  [23.2, 68.8], // Kutch
  [22.8, 70.3], // Gulf of Kutch head
  [22.4, 69.1], // Dwarka
  [21.6, 69.6], // Porbandar
  [20.9, 70.4], // Veraval
  [20.7, 71.0], // Diu
  [21.1, 72.1], // Mahuva
  [21.8, 72.3], // Gulf of Khambhat head
  [21.2, 72.8], // Surat
  [20.0, 72.8], // Daman
  [19.0, 72.8], // Mumbai
  [17.0, 73.3], // Ratnagiri
  [15.5, 73.8], // Goa
  [14.5, 74.3], // Karwar
  [12.9, 74.8], // Mangaluru
  [11.2, 75.8], // Kozhikode
  [9.9, 76.2],  // Kochi
  [8.1, 77.55], // Kanyakumari
];

const EAST_COAST_POLY = [
  [8.1, 77.55], // Kanyakumari
  [9.3, 79.1],  // Rameswaram
  [10.8, 79.85],// Nagapattinam
  [11.9, 79.82],// Puducherry
  [13.1, 80.3], // Chennai
  [14.9, 80.05],// Nellore
  [15.8, 80.6], // Bapatla
  [16.2, 81.14],// Machilipatnam
  [17.0, 82.3], // Kakinada
  [17.7, 83.3], // Visakhapatnam
  [19.3, 84.9], // Gopalpur
  [19.8, 85.85],// Puri
  [20.3, 86.6], // Paradip
  [20.8, 86.9], // Dhamra
  [21.5, 87.0], // Balasore
  [21.62, 87.52],// Digha
  [21.65, 88.1],// Sagar Island
  [21.8, 89.0], // Sundarbans
  [22.0, 89.8], // Khepupara
  [22.3, 91.8], // Chittagong
  [21.4, 91.95],// Cox's Bazar
];

const SRI_LANKA_POLY = [
  [9.8, 80.2],
  [8.6, 81.2],
  [6.9, 81.8],
  [5.9, 80.5],
  [6.9, 79.8],
  [8.5, 79.8],
  [9.8, 80.2],
];

export const TrajectoryForecast: React.FC<TrajectoryForecastProps> = ({
  initialObservations,
  onForecastUpdate,
}) => {
  const [observations, setObservations] = useState<Observation[]>(initialObservations);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("tauktae-cdo");
  
  // Forecast state initialized with pure client computation so it NEVER starts null!
  const [forecast, setForecast] = useState<ForecastResponse>(() =>
    computePrognosticForecastClient(initialObservations)
  );
  
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [activeScrubIndex, setActiveScrubIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hoveredPointInfo, setHoveredPointInfo] = useState<string | null>(null);

  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const intensityCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Synchronize when parent observations update
  useEffect(() => {
    if (initialObservations && initialObservations.length > 0) {
      setObservations(initialObservations);
      runForecast(initialObservations);
    }
  }, [initialObservations]);

  // Combined timeline of past observed + future prognostic waypoints
  const timelinePoints = useMemo(() => {
    const list: {
      type: "past" | "future";
      tauHours: number;
      label: string;
      lat: number;
      lon: number;
      windKts: number;
      pressureHpa: number;
      coneRadiusKm: number;
      isLandfall?: boolean;
      landfallLocation?: string;
    }[] = [];

    // Past observations
    observations.forEach((obs, idx) => {
      const pastHours = (observations.length - 1 - idx) * 6;
      list.push({
        type: "past",
        tauHours: -pastHours,
        label: pastHours === 0 ? "T - 0h (Current Fix)" : `T - ${pastHours}h`,
        lat: obs.lat,
        lon: obs.lon,
        windKts: obs.wind_kts,
        pressureHpa: obs.pressure_hpa || 990,
        coneRadiusKm: 0,
      });
    });

    // Future prognostic
    if (forecast?.prognostic_trajectory) {
      forecast.prognostic_trajectory.forEach((t) => {
        list.push({
          type: "future",
          tauHours: t.tau_hours,
          label: `+${t.tau_hours}h Forecast`,
          lat: t.pred_lat,
          lon: t.pred_lon,
          windKts: t.pred_wind_kts,
          pressureHpa: t.pred_pressure_hpa,
          coneRadiusKm: t.cone_radius_km,
          isLandfall: t.is_landfall,
          landfallLocation: t.landfall_location,
        });
      });
    }

    return list;
  }, [observations, forecast]);

  // Keep active scrub index in bounds
  const currentScrubPoint = timelinePoints[activeScrubIndex] || timelinePoints[timelinePoints.length - 1];

  // Auto-play timeline animation
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && timelinePoints.length > 0) {
      timer = setInterval(() => {
        setActiveScrubIndex((prev) => (prev + 1) % timelinePoints.length);
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timelinePoints.length]);

  // Forecast runner with instant client-side computation & optional server reconciliation
  const runForecast = async (obs: Observation[]) => {
    setIsCalculating(true);
    // 1. Instant calculation: zero lag, works 100% offline or on static Vercel
    const clientResult = computePrognosticForecastClient(obs);
    setForecast(clientResult);
    if (onForecastUpdate) onForecastUpdate(clientResult);

    // 2. Background attempt to query server if available
    try {
      const res = await fetch("/api/predict/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cyclone_id: "ARB-2026-02",
          observations: obs.map((o) => ({
            lat: o.lat,
            lon: o.lon,
            wind_kts: o.wind_kts,
            pressure_hpa: o.pressure_hpa,
          })),
        }),
      });

      if (res.ok) {
        const serverData: ForecastResponse = await res.json();
        if (serverData && serverData.prognostic_trajectory?.length > 0) {
          setForecast(serverData);
          if (onForecastUpdate) onForecastUpdate(serverData);
        }
      }
    } catch {
      // Offline or static environment: clientResult is already active and perfect
    } finally {
      setIsCalculating(false);
    }
  };

  // Preset switch handler
  const handleLoadPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = BENCHMARK_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setObservations(preset.sampleObservations);
    runForecast(preset.sampleObservations);
    setActiveScrubIndex(preset.sampleObservations.length - 1);
  };

  // Render Map Canvas with Dynamic Coordinate Bounding & Dual Basin (Arabian Sea / Bay of Bengal)
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas || !forecast) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Retina / High-DPI support
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || 640;
    const displayHeight = Math.round(displayWidth * 0.72);

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = displayWidth;
    const height = displayHeight;

    // Determine Dynamic Bounding Box from all points
    const allLats: number[] = observations.map((o) => o.lat);
    const allLons: number[] = observations.map((o) => o.lon);
    if (forecast.prognostic_trajectory) {
      forecast.prognostic_trajectory.forEach((t) => {
        allLats.push(t.pred_lat);
        allLons.push(t.pred_lon);
      });
    }

    const minObsLat = Math.min(...allLats);
    const maxObsLat = Math.max(...allLats);
    const minObsLon = Math.min(...allLons);
    const maxObsLon = Math.max(...allLons);

    // Compute center and adaptive extent
    const latSpan = Math.max(9.0, maxObsLat - minObsLat + 4.5);
    const lonSpan = Math.max(12.0, maxObsLon - minObsLon + 6.0);

    const centerLat = (minObsLat + maxObsLat) / 2;
    const centerLon = (minObsLon + maxObsLon) / 2;

    const minLat = Math.max(5.0, centerLat - latSpan / 2);
    const maxLat = Math.min(27.0, centerLat + latSpan / 2);
    const minLon = Math.max(62.0, centerLon - lonSpan / 2);
    const maxLon = Math.min(96.0, centerLon + lonSpan / 2);

    const toX = (lon: number) => ((lon - minLon) / (maxLon - minLon)) * width;
    const toY = (lat: number) => height - ((lat - minLat) / (maxLat - minLat)) * height;

    // 1. Deep Ocean Background
    ctx.fillStyle = "#040b15";
    ctx.fillRect(0, 0, width, height);

    // 2. Graticule Lat/Lon Grid
    ctx.strokeStyle = "#0d2136";
    ctx.lineWidth = 1;
    ctx.font = "9px 'DM Mono', monospace";
    ctx.fillStyle = "#33516e";

    const latStep = 2;
    const lonStep = 2;

    for (let lat = Math.ceil(minLat / latStep) * latStep; lat <= maxLat; lat += latStep) {
      const y = toY(lat);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillText(`${lat}°N`, 6, y - 3);
    }

    for (let lon = Math.ceil(minLon / lonStep) * lonStep; lon <= maxLon; lon += lonStep) {
      const x = toX(lon);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.fillText(`${lon}°E`, x + 4, height - 6);
    }

    // 3. Draw Subcontinent Coastline & Landmass
    const drawPolygon = (pts: number[][], fill: string, stroke: string) => {
      ctx.beginPath();
      pts.forEach(([lat, lon], idx) => {
        const x = toX(lon);
        const y = toY(lat);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    };

    // Indian Peninsula landmass construct (connecting west coast, north inland boundary, and east coast)
    const combinedLandPoly = [
      ...WEST_COAST_POLY,
      [24.5, 72.0],
      [25.5, 75.0],
      [26.0, 80.0],
      [25.0, 85.0],
      [24.0, 88.0],
      ...[...EAST_COAST_POLY].reverse(),
    ];
    drawPolygon(combinedLandPoly, "#081626", "#1b3d5c");
    drawPolygon(SRI_LANKA_POLY, "#081626", "#1b3d5c");

    // 4. Geographic Labels
    ctx.fillStyle = "#4a6d8c";
    ctx.font = "bold 10px 'Space Grotesk', sans-serif";

    if (minLon < 73 && maxLon > 68) ctx.fillText("GUJARAT", toX(70.6), toY(22.2));
    if (minLon < 74 && maxLon > 71) ctx.fillText("MUMBAI", toX(73.1), toY(19.0));
    if (minLon < 76 && maxLon > 72) ctx.fillText("GOA", toX(74.0), toY(15.4));
    if (minLon < 82 && maxLon > 78) ctx.fillText("TAMIL NADU", toX(79.0), toY(11.0));
    if (minLon < 85 && maxLon > 81) ctx.fillText("ANDHRA PRADESH", toX(81.2), toY(16.0));
    if (minLon < 88 && maxLon > 83) ctx.fillText("ODISHA", toX(84.8), toY(20.4));
    if (minLon < 91 && maxLon > 87) ctx.fillText("SUNDARBANS / WB", toX(88.3), toY(22.2));

    // Waterbody Labels
    ctx.fillStyle = "#1e405f";
    ctx.font = "italic bold 12px 'Space Grotesk', sans-serif";
    if (minLon < 73) ctx.fillText("ARABIAN SEA", toX(66.5), toY(16.0));
    if (maxLon > 83) ctx.fillText("BAY OF BENGAL", toX(86.5), toY(15.0));

    // 5. Draw 90% Cone of Uncertainty (Widening Translucent Envelope)
    const traj = forecast.prognostic_trajectory;
    if (traj && traj.length > 0) {
      ctx.fillStyle = "rgba(45, 212, 191, 0.12)";
      ctx.strokeStyle = "rgba(45, 212, 191, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      const lastObs = observations[observations.length - 1];
      const startX = toX(lastObs.lon);
      const startY = toY(lastObs.lat);

      ctx.beginPath();
      ctx.moveTo(startX, startY);

      // Left edge of cone
      for (let i = 0; i < traj.length; i++) {
        const pt = traj[i];
        const px = toX(pt.pred_lon);
        const py = toY(pt.pred_lat);
        // 1 deg lat ≈ 111 km
        const lonKmPerDeg = 111 * Math.cos((pt.pred_lat * Math.PI) / 180);
        const radPx = (pt.cone_radius_km / lonKmPerDeg) * (toX(minLon + 1) - toX(minLon));
        ctx.lineTo(px - radPx, py);
      }

      // Cap at terminal waypoint
      const lastPt = traj[traj.length - 1];
      const lonKmLast = 111 * Math.cos((lastPt.pred_lat * Math.PI) / 180);
      const lastRadPx = (lastPt.cone_radius_km / lonKmLast) * (toX(minLon + 1) - toX(minLon));
      ctx.arc(toX(lastPt.pred_lon), toY(lastPt.pred_lat), lastRadPx, Math.PI, 0, false);

      // Right edge of cone back to start
      for (let i = traj.length - 1; i >= 0; i--) {
        const pt = traj[i];
        const px = toX(pt.pred_lon);
        const py = toY(pt.pred_lat);
        const lonKmPerDeg = 111 * Math.cos((pt.pred_lat * Math.PI) / 180);
        const radPx = (pt.cone_radius_km / lonKmPerDeg) * (toX(minLon + 1) - toX(minLon));
        ctx.lineTo(px + radPx, py);
      }

      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 6. Historical Track Line (Blue)
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    observations.forEach((obs, idx) => {
      const x = toX(obs.lon);
      const y = toY(obs.lat);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 7. Prognostic Track Line (Cyan)
    if (traj && traj.length > 0) {
      ctx.strokeStyle = "#2dd4bf";
      ctx.lineWidth = 3;
      ctx.beginPath();
      const lastObs = observations[observations.length - 1];
      ctx.moveTo(toX(lastObs.lon), toY(lastObs.lat));
      traj.forEach((pt) => {
        ctx.lineTo(toX(pt.pred_lon), toY(pt.pred_lat));
      });
      ctx.stroke();
    }

    // 8. Historical Waypoint Markers
    observations.forEach((obs, idx) => {
      const x = toX(obs.lon);
      const y = toY(obs.lat);
      const isCurrentFix = idx === observations.length - 1;

      ctx.fillStyle = isCurrentFix ? "#38bdf8" : "#0369a1";
      ctx.beginPath();
      ctx.arc(x, y, isCurrentFix ? 6.5 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#cce5ff";
      ctx.font = "9px 'DM Mono', monospace";
      const pastH = (observations.length - 1 - idx) * 6;
      ctx.fillText(pastH === 0 ? "CURRENT" : `T-${pastH}h`, x + 8, y - 2);
    });

    // 9. Prognostic Waypoint Markers
    if (traj) {
      traj.forEach((pt) => {
        const x = toX(pt.pred_lon);
        const y = toY(pt.pred_lat);

        ctx.fillStyle = pt.is_landfall ? "#ef4444" : "#2dd4bf";
        ctx.beginPath();
        ctx.arc(x, y, pt.is_landfall ? 8 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = pt.is_landfall ? "#f87171" : "#5eead4";
        ctx.font = "bold 9px 'DM Mono', monospace";
        ctx.fillText(`+${pt.tau_hours}h (${pt.pred_wind_kts}kt)`, x + 8, y - 2);

        if (pt.is_landfall) {
          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 10px 'Space Grotesk', sans-serif";
          ctx.fillText("LANDFALL INTERCEPT", x + 8, y + 12);
        }
      });
    }

    // 10. Active Scrubbed Waypoint Highlight (Glowing Reticle)
    if (currentScrubPoint) {
      const sx = toX(currentScrubPoint.lon);
      const sy = toY(currentScrubPoint.lat);

      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Pulsing center dot
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [observations, forecast, currentScrubPoint]);

  // Render Dual-Axis Intensity Canvas (Wind vs Pressure)
  useEffect(() => {
    const canvas = intensityCanvasRef.current;
    if (!canvas || !timelinePoints || timelinePoints.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || 560;
    const displayHeight = 180;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = displayWidth;
    const height = displayHeight;

    ctx.fillStyle = "#050e1b";
    ctx.fillRect(0, 0, width, height);

    const paddingLeft = 45;
    const paddingRight = 45;
    const paddingTop = 25;
    const paddingBottom = 30;
    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    // Wind Scale (kts): 20 to 140
    const minWind = 20;
    const maxWind = 140;
    const toWindY = (w: number) =>
      paddingTop + chartH - ((w - minWind) / (maxWind - minWind)) * chartH;

    // Pressure Scale (hPa): 1010 down to 910
    const minPres = 910;
    const maxPres = 1010;
    const toPresY = (p: number) =>
      paddingTop + ((p - minPres) / (maxPres - minPres)) * chartH;

    const toX = (idx: number) =>
      paddingLeft + (idx / (timelinePoints.length - 1)) * chartW;

    // Draw Category Threshold Background Bands
    const categories = [
      { label: "CS (34kt)", wind: 34, color: "rgba(56, 189, 248, 0.08)" },
      { label: "VSCS (64kt)", wind: 64, color: "rgba(245, 158, 11, 0.08)" },
      { label: "ESCS (90kt)", wind: 90, color: "rgba(239, 68, 68, 0.08)" },
    ];

    categories.forEach((cat) => {
      const y = toWindY(cat.wind);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#64748b";
      ctx.font = "8px 'DM Mono', monospace";
      ctx.fillText(cat.label, paddingLeft + 4, y - 3);
    });

    // Draw Wind Line (Cyan)
    ctx.strokeStyle = "#2dd4bf";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    timelinePoints.forEach((pt, i) => {
      const x = toX(i);
      const y = toWindY(pt.windKts);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Pressure Line (Amber)
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    timelinePoints.forEach((pt, i) => {
      const x = toX(i);
      const y = toPresY(pt.pressureHpa);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Waypoint dots
    timelinePoints.forEach((pt, i) => {
      const x = toX(i);
      const yW = toWindY(pt.windKts);
      const yP = toPresY(pt.pressureHpa);
      const isSelected = i === activeScrubIndex;

      // Wind dot
      ctx.fillStyle = isSelected ? "#ffffff" : "#2dd4bf";
      ctx.beginPath();
      ctx.arc(x, yW, isSelected ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Pressure dot
      ctx.fillStyle = isSelected ? "#ffffff" : "#f59e0b";
      ctx.beginPath();
      ctx.arc(x, yP, isSelected ? 4.5 : 3, 0, Math.PI * 2);
      ctx.fill();

      // X-Axis Timestep label
      ctx.fillStyle = isSelected ? "#facc15" : "#64748b";
      ctx.font = `${isSelected ? "bold " : ""}8px 'DM Mono', monospace`;
      const shortLabel = pt.tauHours <= 0 ? `${pt.tauHours}h` : `+${pt.tauHours}h`;
      ctx.fillText(shortLabel, x - 8, height - 10);
    });
  }, [timelinePoints, activeScrubIndex]);

  // Observation table edits
  const handleObservationChange = (index: number, field: keyof Observation, value: any) => {
    const next = [...observations];
    next[index] = { ...next[index], [field]: Number(value) || value };
    setObservations(next);
    runForecast(next);
  };

  const handleAddObservation = () => {
    const last = observations[observations.length - 1];
    const newObs: Observation = {
      id: `obs_${Date.now()}`,
      lat: Number((last.lat + 0.85).toFixed(2)),
      lon: Number((last.lon - 0.22).toFixed(2)),
      wind_kts: last.wind_kts + 10,
      pressure_hpa: (last.pressure_hpa || 990) - 8,
      timestamp: "T-0h",
    };
    const next = [...observations, newObs];
    setObservations(next);
    runForecast(next);
  };

  const handleRemoveObservation = (index: number) => {
    if (observations.length <= 2) {
      alert("At least 2 sequential observations are required for prognostic trajectory forecasting.");
      return;
    }
    const next = observations.filter((_, i) => i !== index);
    setObservations(next);
    runForecast(next);
  };

  return (
    <div className="bg-[#081524] border border-[#183652] rounded-xl overflow-hidden shadow-2xl space-y-6">
      {/* Module Title Bar */}
      <div className="p-4 bg-[#0a1b2d] border-b border-[#183652] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Navigation2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Prognostic Cyclone Trajectory & Intensity Forecaster
            </h2>
            <p className="text-xs text-slate-400 font-mono-code">
              Dynamic North Indian Ocean Basin Extrapolation · 90% Confidence Uncertainty Envelope
            </p>
          </div>
        </div>

        {/* Quick Presets & Compute Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#061220] p-1 rounded-lg border border-[#183652]">
            <span className="text-[10px] text-slate-400 font-mono-code px-1.5">PRESET:</span>
            {BENCHMARK_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleLoadPreset(p.id)}
                className={`px-2 py-1 rounded text-xs font-mono-code transition ${
                  selectedPresetId === p.id
                    ? "bg-cyan-500 text-slate-950 font-bold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                {p.id.split("-")[0].toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => runForecast(observations)}
            disabled={isCalculating}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition shadow-sm shadow-cyan-500/40 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCalculating ? "animate-spin" : ""}`} />
            <span>{isCalculating ? "Computing..." : "Recalculate AI Model"}</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Landfall Intercept Alert Card */}
        {forecast?.landfall_intercept && (
          <div className="bg-gradient-to-r from-red-950/50 via-[#0c2238] to-[#071a2e] border border-red-500/50 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-red-400 text-xs font-mono-code font-bold">
                <MapPin className="w-4 h-4 animate-bounce" />
                <span>COASTAL LANDFALL INTERCEPT & HAZARD PROJECTION</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {forecast.landfall_intercept.location}
              </h3>
              <p className="text-xs text-slate-300">
                Coordinates: <strong className="text-cyan-300 font-mono-code">{forecast.landfall_intercept.lat}°N, {forecast.landfall_intercept.lon}°E</strong> · ETA: <strong className="text-white">+{forecast.landfall_intercept.eta_hours} Hours</strong> (±{forecast.landfall_intercept.confidence_window_hours}h window).
              </p>
            </div>

            <div className="bg-[#050f1c] border border-amber-600/50 p-3 rounded-lg flex items-center gap-3 text-xs">
              <Waves className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <span className="text-amber-300 font-bold block font-mono-code">COASTAL SURGE & TIDE HAZARD</span>
                <span className="text-slate-300 text-[11px]">{forecast.landfall_intercept.tidal_coincidence}</span>
              </div>
            </div>
          </div>
        )}

        {/* Map Canvas + Dynamic Intensity Curve */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Geospatial Map Canvas */}
          <div className="lg:col-span-7 bg-[#061220] border border-[#183652] p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#183652] pb-2">
              <span className="text-xs font-mono-code text-cyan-300 font-bold flex items-center gap-2">
                <Compass className="w-4 h-4" />
                NORTH INDIAN OCEAN BASIN TRACK & CONE OF UNCERTAINTY
              </span>
              <span className="text-[10px] font-mono-code text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                90% CONFIDENCE ENVELOPE
              </span>
            </div>

            {/* Map Canvas with automatic responsive width */}
            <div className="flex items-center justify-center relative bg-[#040b15] rounded-lg overflow-hidden border border-[#122c45]">
              <canvas
                ref={mapCanvasRef}
                className="w-full h-auto block"
              />
            </div>

            {/* Map Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-code text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-[#38bdf8] rounded" /> Observed Past Track
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-[#2dd4bf] rounded" /> Prognostic Trajectory
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-teal-900/50 border border-teal-500/40 rounded" /> 90% Confidence Cone
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white" /> Landfall Intercept
              </span>
            </div>
          </div>

          {/* Right Column: Intensity Chart + Active Waypoint Inspector */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {/* Dual-Axis Intensity Chart */}
            <div className="bg-[#061220] border border-[#183652] p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between border-b border-[#183652] pb-2">
                <span className="text-xs font-mono-code text-amber-300 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  DYNAMIC INTENSITY CURVE
                </span>
                <div className="flex items-center gap-3 text-[10px] font-mono-code">
                  <span className="text-teal-400 font-bold">● Wind (kts)</span>
                  <span className="text-amber-400 font-bold">● Pressure (hPa)</span>
                </div>
              </div>

              <div className="bg-[#050e1b] rounded-lg overflow-hidden border border-[#122c45]">
                <canvas
                  ref={intensityCanvasRef}
                  className="w-full h-auto block"
                />
              </div>

              <div className="text-[10px] font-mono-code text-slate-500 flex justify-between pt-1">
                <span>Scale: 20 kts (LPA) → 140 kts (SuCS)</span>
                <span>Barometric: 1010 hPa → 910 hPa</span>
              </div>
            </div>

            {/* Interactive Waypoint Inspector Card */}
            {currentScrubPoint && (
              <div className="bg-gradient-to-br from-[#091e33] to-[#061424] border border-cyan-800/60 p-4 rounded-xl space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-[#183e60] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="text-xs font-bold text-yellow-300 font-mono-code">
                      WAYPOINT INSPECTION: {currentScrubPoint.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {currentScrubPoint.type === "past" ? "HISTORICAL FIX" : "PROGNOSTIC MODEL"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-[#05111f] p-2 rounded border border-[#143352]">
                    <span className="text-[10px] font-mono-code text-slate-400 block">POSITION</span>
                    <span className="text-xs font-bold text-white font-mono-code">
                      {currentScrubPoint.lat}°N, {currentScrubPoint.lon}°E
                    </span>
                  </div>
                  <div className="bg-[#05111f] p-2 rounded border border-[#143352]">
                    <span className="text-[10px] font-mono-code text-slate-400 block">MAX WINDS</span>
                    <span className="text-xs font-bold text-teal-300 font-mono-code">
                      {currentScrubPoint.windKts} kts ({Math.round(currentScrubPoint.windKts * 1.852)} km/h)
                    </span>
                  </div>
                  <div className="bg-[#05111f] p-2 rounded border border-[#143352]">
                    <span className="text-[10px] font-mono-code text-slate-400 block">CENTRAL PRES</span>
                    <span className="text-xs font-bold text-amber-300 font-mono-code">
                      {currentScrubPoint.pressureHpa} hPa
                    </span>
                  </div>
                  <div className="bg-[#05111f] p-2 rounded border border-[#143352]">
                    <span className="text-[10px] font-mono-code text-slate-400 block">90% CONE</span>
                    <span className="text-xs font-bold text-cyan-400 font-mono-code">
                      {currentScrubPoint.coneRadiusKm ? `±${currentScrubPoint.coneRadiusKm} km` : "Zero Error"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300 pt-1 font-mono-code">
                  <span>
                    IMD STAGE: <strong className="text-white">{classifyIntensity(currentScrubPoint.windKts)}</strong>
                  </span>
                  {currentScrubPoint.isLandfall && (
                    <span className="text-red-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      COASTAL CROSSING
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Scrubbing Timeline Bar */}
        <div className="bg-[#061220] border border-[#183652] p-4 rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-sm"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? "Pause Animation" : "Animate Storm Path"}</span>
              </button>

              <button
                onClick={() => setActiveScrubIndex(0)}
                className="p-1.5 rounded-lg bg-[#0b1f33] border border-[#183e60] text-slate-300 hover:text-white transition"
                title="Reset to origin"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-xs font-mono-code text-slate-400 flex items-center gap-2">
              <span>ACTIVE SCRUB STEP:</span>
              <span className="text-yellow-300 font-bold">
                {currentScrubPoint?.label} ({currentScrubPoint?.windKts} kts)
              </span>
            </div>
          </div>

          {/* Scrub Range Slider */}
          <input
            type="range"
            min={0}
            max={timelinePoints.length - 1}
            value={activeScrubIndex}
            onChange={(e) => {
              setActiveScrubIndex(Number(e.target.value));
              setIsPlaying(false);
            }}
            className="w-full accent-cyan-400 cursor-pointer h-2 bg-[#0d2238] rounded-lg"
          />

          <div className="flex justify-between text-[10px] font-mono-code text-slate-500">
            <span>Past Track ({timelinePoints[0]?.label})</span>
            <span>Current Fix</span>
            <span>72-Hour Prognosis ({timelinePoints[timelinePoints.length - 1]?.label})</span>
          </div>
        </div>

        {/* Editable Observation Vector Matrix */}
        <div className="bg-[#061220] border border-[#183652] p-4 rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#183652] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Observation Vector Matrix (Editable Coordinates & Intensity)
              </h3>
              <p className="text-xs text-slate-400 font-mono-code">
                Modify coordinates or add historical fixes to simulate what-if steering perturbations and instant path updates.
              </p>
            </div>

            <button
              onClick={handleAddObservation}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0b2238] border border-cyan-700 text-cyan-300 text-xs font-mono-code hover:bg-cyan-900/50 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Waypoint</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono-code text-left">
              <thead>
                <tr className="border-b border-[#183652] text-slate-400">
                  <th className="py-2 px-2">TIMESTEP</th>
                  <th className="px-2">LATITUDE (°N)</th>
                  <th className="px-2">LONGITUDE (°E)</th>
                  <th className="px-2">SUSTAINED WIND (KTS)</th>
                  <th className="px-2">CENTRAL PRESSURE (HPA)</th>
                  <th className="px-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#132c45]">
                {observations.map((obs, idx) => (
                  <tr key={obs.id} className="hover:bg-[#0a1c2e]">
                    <td className="py-1.5 px-2 text-slate-400">
                      T - {(observations.length - 1 - idx) * 6}h
                    </td>
                    <td className="px-2">
                      <input
                        type="number"
                        step="0.05"
                        value={obs.lat}
                        onChange={(e) => handleObservationChange(idx, "lat", e.target.value)}
                        className="w-24 bg-[#0a1a2b] border border-[#183a5c] px-2 py-1 rounded text-white font-mono-code focus:border-cyan-400 outline-none"
                      />
                    </td>
                    <td className="px-2">
                      <input
                        type="number"
                        step="0.05"
                        value={obs.lon}
                        onChange={(e) => handleObservationChange(idx, "lon", e.target.value)}
                        className="w-24 bg-[#0a1a2b] border border-[#183a5c] px-2 py-1 rounded text-white font-mono-code focus:border-cyan-400 outline-none"
                      />
                    </td>
                    <td className="px-2">
                      <input
                        type="number"
                        step="1"
                        value={obs.wind_kts}
                        onChange={(e) => handleObservationChange(idx, "wind_kts", e.target.value)}
                        className="w-24 bg-[#0a1a2b] border border-[#183a5c] px-2 py-1 rounded text-teal-300 font-bold font-mono-code focus:border-cyan-400 outline-none"
                      />
                    </td>
                    <td className="px-2">
                      <input
                        type="number"
                        step="1"
                        value={obs.pressure_hpa}
                        onChange={(e) => handleObservationChange(idx, "pressure_hpa", e.target.value)}
                        className="w-24 bg-[#0a1a2b] border border-[#183a5c] px-2 py-1 rounded text-amber-300 font-mono-code focus:border-cyan-400 outline-none"
                      />
                    </td>
                    <td className="px-2 text-right">
                      <button
                        onClick={() => handleRemoveObservation(idx)}
                        className="p-1 rounded text-slate-500 hover:text-red-400 transition"
                        title="Delete Waypoint"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

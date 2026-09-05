import React, { useState, useRef, useEffect } from "react";
import { Observation, ForecastResponse, PrognosticWaypoint } from "../types";
import { MapPin, AlertCircle, Plus, Trash2, RefreshCw, TrendingUp, Navigation2, Waves } from "lucide-react";

interface TrajectoryForecastProps {
  initialObservations: Observation[];
  onForecastUpdate?: (forecast: ForecastResponse) => void;
}

export const TrajectoryForecast: React.FC<TrajectoryForecastProps> = ({
  initialObservations,
  onForecastUpdate,
}) => {
  const [observations, setObservations] = useState<Observation[]>(initialObservations);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [selectedWaypoint, setSelectedWaypoint] = useState<PrognosticWaypoint | null>(null);

  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const intensityCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Trigger initial forecast
  useEffect(() => {
    runForecast(observations);
  }, []);

  const runForecast = async (obs: Observation[]) => {
    setIsCalculating(true);
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
        const data: ForecastResponse = await res.json();
        setForecast(data);
        if (onForecastUpdate) onForecastUpdate(data);
        if (data.prognostic_trajectory.length > 0) {
          setSelectedWaypoint(data.prognostic_trajectory[1] || data.prognostic_trajectory[0]);
        }
      }
    } catch (err) {
      console.error("Forecast execution failed:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  // Render Geospatial Map Canvas with North Indian Ocean Coastline & 90% Cone of Uncertainty
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas || !forecast) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 640;
    const height = 480;
    canvas.width = width;
    canvas.height = height;

    // Lat/Lon bounding box: Lat 10°N to 25°N, Lon 65°E to 82°E
    const minLat = 11.0;
    const maxLat = 24.0;
    const minLon = 66.0;
    const maxLon = 78.0;

    const toX = (lon: number) => ((lon - minLon) / (maxLon - minLon)) * width;
    const toY = (lat: number) => height - ((lat - minLat) / (maxLat - minLat)) * height;

    // Background Ocean
    ctx.fillStyle = "#050e1b";
    ctx.fillRect(0, 0, width, height);

    // Graticule grid
    ctx.strokeStyle = "#10253a";
    ctx.lineWidth = 1;
    ctx.font = "10px 'DM Mono', monospace";
    ctx.fillStyle = "#3b5874";

    for (let lat = 12; lat <= 24; lat += 2) {
      const y = toY(lat);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillText(`${lat}°N`, 8, y - 4);
    }
    for (let lon = 68; lon <= 78; lon += 2) {
      const x = toX(lon);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.fillText(`${lon}°E`, x + 4, height - 8);
    }

    // Coastal Landmass (Western India / Gujarat & Konkan)
    ctx.fillStyle = "#0b1c2b";
    ctx.strokeStyle = "#1f4568";
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Gujarat Kathiawar Peninsula & Saurashtra Coast
    const landCoords = [
      [24.0, 68.5],
      [23.3, 69.5],
      [22.8, 70.2], // Gulf of Kutch
      [22.4, 69.1], // Dwarka
      [21.6, 69.6], // Porbandar
      [20.9, 70.8], // Veraval / Diu
      [21.0, 72.0], // Gulf of Khambhat south
      [22.2, 72.4], // Gulf of Khambhat north
      [21.2, 72.8], // Surat
      [20.0, 72.8], // Daman
      [18.9, 72.8], // Mumbai
      [16.0, 73.5], // Goa
      [14.0, 74.3], // Karwar
      [11.5, 75.8], // Kerala / Kozhikode
      [11.5, 78.0],
      [24.0, 78.0],
    ];

    landCoords.forEach(([lat, lon], idx) => {
      const x = toX(lon);
      const y = toY(lat);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Coastal Labels
    ctx.fillStyle = "#6484a0";
    ctx.font = "bold 11px 'Space Grotesk', sans-serif";
    ctx.fillText("GUJARAT", toX(70.8), toY(22.2));
    ctx.fillText("MUMBAI", toX(73.1), toY(19.0));
    ctx.fillText("ARABIAN SEA", toX(67.5), toY(16.5));

    const traj = forecast.prognostic_trajectory;

    // Draw 90% Cone of Uncertainty Envelope (Translucent widening swath)
    if (traj.length > 0) {
      ctx.fillStyle = "rgba(105, 232, 208, 0.12)";
      ctx.strokeStyle = "rgba(105, 232, 208, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      // Left boundary of cone
      ctx.beginPath();
      const lastObs = observations[observations.length - 1];
      let startX = toX(lastObs.lon);
      let startY = toY(lastObs.lat);
      ctx.moveTo(startX, startY);

      // Forward left curve
      for (let i = 0; i < traj.length; i++) {
        const pt = traj[i];
        const px = toX(pt.pred_lon);
        const py = toY(pt.pred_lat);
        const radPx = (pt.cone_radius_km / 111.0) * ((toX(minLon + 1) - toX(minLon)));
        ctx.lineTo(px - radPx, py);
      }

      // Cap at top
      const lastPt = traj[traj.length - 1];
      const lastRadPx = (lastPt.cone_radius_km / 111.0) * ((toX(minLon + 1) - toX(minLon)));
      ctx.arc(toX(lastPt.pred_lon), toY(lastPt.pred_lat), lastRadPx, Math.PI, 0, false);

      // Backward right curve
      for (let i = traj.length - 1; i >= 0; i--) {
        const pt = traj[i];
        const px = toX(pt.pred_lon);
        const py = toY(pt.pred_lat);
        const radPx = (pt.cone_radius_km / 111.0) * ((toX(minLon + 1) - toX(minLon)));
        ctx.lineTo(px + radPx, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Historical Observations Track (Past Waypoints)
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

    // Past Waypoint Markers
    observations.forEach((obs, idx) => {
      const x = toX(obs.lon);
      const y = toY(obs.lat);
      ctx.fillStyle = idx === observations.length - 1 ? "#38bdf8" : "#0284c7";
      ctx.beginPath();
      ctx.arc(x, y, idx === observations.length - 1 ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#e2edf5";
      ctx.font = "9px 'DM Mono', monospace";
      ctx.fillText(`T-${(observations.length - 1 - idx) * 6}h`, x + 8, y + 3);
    });

    // Prognostic Forecast Spline Track
    if (traj.length > 0) {
      ctx.strokeStyle = "#69e8d0";
      ctx.lineWidth = 3;
      ctx.beginPath();
      const lastObs = observations[observations.length - 1];
      ctx.moveTo(toX(lastObs.lon), toY(lastObs.lat));
      traj.forEach((pt) => {
        ctx.lineTo(toX(pt.pred_lon), toY(pt.pred_lat));
      });
      ctx.stroke();

      // Prognostic Waypoints
      traj.forEach((pt) => {
        const x = toX(pt.pred_lon);
        const y = toY(pt.pred_lat);

        ctx.fillStyle = pt.is_landfall ? "#ef4444" : "#69e8d0";
        ctx.beginPath();
        ctx.arc(x, y, pt.is_landfall ? 8 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = pt.is_landfall ? "#f87171" : "#8ff1df";
        ctx.font = "bold 10px 'DM Mono', monospace";
        ctx.fillText(`+${pt.tau_hours}h (${pt.pred_wind_kts}kt)`, x + 9, y - 2);

        if (pt.is_landfall) {
          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 11px 'Space Grotesk', sans-serif";
          ctx.fillText("LANDFALL INTERCEPT", x + 10, y + 14);
        }
      });
    }
  }, [observations, forecast]);

  // Render Dual-Axis Intensity Chart (Wind kts vs Barometric Pressure hPa)
  useEffect(() => {
    const canvas = intensityCanvasRef.current;
    if (!canvas || !forecast) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 560;
    const height = 180;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = "#061220";
    ctx.fillRect(0, 0, width, height);

    // Timeline points: historical observations + future prognostic
    const points: { label: string; wind: number; pressure: number }[] = [];
    observations.forEach((o, i) => {
      points.push({
        label: `T-${(observations.length - 1 - i) * 6}h`,
        wind: o.wind_kts,
        pressure: o.pressure_hpa || 990,
      });
    });
    forecast.prognostic_trajectory.forEach((t) => {
      points.push({
        label: `+${t.tau_hours}h`,
        wind: t.pred_wind_kts,
        pressure: t.pred_pressure_hpa,
      });
    });

    if (points.length < 2) return;

    const padding = 45;
    const chartW = width - padding * 2;
    const chartH = height - 50;

    // Wind Scale: 20 to 140 kts
    const minWind = 20;
    const maxWind = 140;
    const toWindY = (w: number) => height - 30 - ((w - minWind) / (maxWind - minWind)) * chartH;

    // Pressure Scale: 1010 to 920 hPa
    const minPres = 920;
    const maxPres = 1010;
    const toPresY = (p: number) => 20 + ((p - minPres) / (maxPres - minPres)) * chartH;

    const toX = (idx: number) => padding + (idx / (points.length - 1)) * chartW;

    // Draw grid lines
    ctx.strokeStyle = "#132c45";
    ctx.lineWidth = 1;
    for (let w = 40; w <= 120; w += 20) {
      const y = toWindY(w);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // RI Threshold Line (+30 kts/24h)
    ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
    ctx.setLineDash([4, 4]);
    const riY = toWindY(64); // Cyclone threshold
    ctx.beginPath();
    ctx.moveTo(padding, riY);
    ctx.lineTo(width - padding, riY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#f59e0b";
    ctx.font = "9px 'DM Mono', monospace";
    ctx.fillText("RI Threshold (64 kts)", padding + 6, riY - 4);

    // Draw Wind Line (Cyan)
    ctx.strokeStyle = "#69e8d0";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    points.forEach((pt, i) => {
      const x = toX(i);
      const y = toWindY(pt.wind);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Pressure Line (Amber)
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((pt, i) => {
      const x = toX(i);
      const y = toPresY(pt.pressure);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Waypoint dots & Labels
    points.forEach((pt, i) => {
      const x = toX(i);
      const yW = toWindY(pt.wind);
      const yP = toPresY(pt.pressure);

      ctx.fillStyle = "#69e8d0";
      ctx.beginPath();
      ctx.arc(x, yW, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(x, yP, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "9px 'DM Mono', monospace";
      ctx.fillText(pt.label, x - 12, height - 12);
    });
  }, [observations, forecast]);

  // Table row editing
  const handleObservationChange = (index: number, field: keyof Observation, value: any) => {
    const next = [...observations];
    next[index] = { ...next[index], [field]: Number(value) || value };
    setObservations(next);
  };

  const handleAddObservation = () => {
    const last = observations[observations.length - 1];
    const newObs: Observation = {
      id: `obs_${Date.now()}`,
      lat: Number((last.lat + 0.9).toFixed(2)),
      lon: Number((last.lon - 0.2).toFixed(2)),
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
      alert("At least 2 sequential observations are required for forecasting.");
      return;
    }
    const next = observations.filter((_, i) => i !== index);
    setObservations(next);
    runForecast(next);
  };

  return (
    <div className="bg-[#081524] border border-[#183652] rounded-xl overflow-hidden shadow-2xl space-y-4">
      {/* Header */}
      <div className="p-4 bg-[#0a1b2d] border-b border-[#183652] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Navigation2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Recurrent Trajectory Predictor & Landfall Intercept Vector
            </h2>
            <p className="text-xs text-slate-400 font-mono-code">
              Bi-LSTM + Transformer Recurrent Horizon with 90% Confidence Uncertainty Envelope
            </p>
          </div>
        </div>

        <button
          onClick={() => runForecast(observations)}
          disabled={isCalculating}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition shadow-sm shadow-cyan-500/40 disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isCalculating ? "animate-spin" : ""}`} />
          <span>{isCalculating ? "Computing..." : "Run AI Forecast Model"}</span>
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* Landfall Intercept Alert Card (Section 5.3 C2) */}
        {forecast?.landfall_intercept && (
          <div className="bg-gradient-to-r from-red-950/40 via-[#0d2238] to-[#081b2e] border border-red-500/50 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-red-400 text-xs font-mono-code font-bold">
                <MapPin className="w-4 h-4 animate-bounce" />
                <span>LANDFALL INTERCEPT PROTOCOL ACTIVE</span>
              </div>
              <h3 className="text-base font-bold text-white">
                {forecast.landfall_intercept.location}
              </h3>
              <p className="text-xs text-slate-300">
                Predicted Intercept: <strong className="text-cyan-300">{forecast.landfall_intercept.lat}°N, {forecast.landfall_intercept.lon}°E</strong> in approximately <strong className="text-white">+{forecast.landfall_intercept.eta_hours} hours</strong> (±{forecast.landfall_intercept.confidence_window_hours}h window).
              </p>
            </div>

            <div className="bg-[#050f1c] border border-amber-600/50 p-3 rounded-lg flex items-center gap-3 text-xs">
              <Waves className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-amber-300 font-bold block font-mono-code">TIDAL COINCIDENCE RISK</span>
                <span className="text-slate-300 text-[11px]">{forecast.landfall_intercept.tidal_coincidence}</span>
              </div>
            </div>
          </div>
        )}

        {/* Map Canvas + Dynamic Intensity Curve */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Geospatial Map Canvas (Section 5.3 C1) */}
          <div className="lg:col-span-7 bg-[#061220] border border-[#183652] p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#183652] pb-2">
              <span className="text-xs font-mono-code text-cyan-300 font-bold">
                NORTH INDIAN OCEAN BASIN TRACK & CONE OF UNCERTAINTY
              </span>
              <span className="text-[10px] font-mono-code text-slate-400">90% ENVELOPE</span>
            </div>

            <div className="flex items-center justify-center">
              <canvas
                ref={mapCanvasRef}
                className="w-full max-w-[640px] h-auto rounded-lg border border-[#122c45] shadow-md"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-[#38bdf8] rounded" /> Observed Past Track
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-[#69e8d0] rounded" /> Prognostic Trajectory
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-teal-900/50 border border-teal-500/40 rounded" /> 90% Confidence Cone
              </span>
            </div>
          </div>

          {/* Dynamic Intensity Curve + Prognostic Summary (Section 5.3 C3) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {/* Dual-Axis Intensity Chart */}
            <div className="bg-[#061220] border border-[#183652] p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between border-b border-[#183652] pb-2">
                <span className="text-xs font-mono-code text-amber-300 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  DYNAMIC INTENSITY CURVE
                </span>
                <div className="flex items-center gap-3 text-[10px] font-mono-code">
                  <span className="text-cyan-400">● Wind (kts)</span>
                  <span className="text-amber-400">● Pressure (hPa)</span>
                </div>
              </div>

              <canvas
                ref={intensityCanvasRef}
                className="w-full h-auto rounded-lg border border-[#122c45]"
              />
            </div>

            {/* Prognostic Horizon Summary Table */}
            <div className="bg-[#061220] border border-[#183652] p-4 rounded-xl space-y-2">
              <span className="text-xs font-mono-code text-slate-400 block mb-1">
                72-HOUR PROGNOSTIC WAYPOINTS:
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono-code text-left">
                  <thead>
                    <tr className="border-b border-[#183652] text-slate-400">
                      <th className="py-1">TAU</th>
                      <th>COORDS</th>
                      <th>WIND</th>
                      <th>PRES</th>
                      <th>CONE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#132c45]">
                    {forecast?.prognostic_trajectory.map((pt) => (
                      <tr
                        key={pt.tau_hours}
                        className={`hover:bg-[#0a1d30] ${
                          pt.is_landfall ? "bg-red-950/30 text-red-300 font-bold" : "text-slate-300"
                        }`}
                      >
                        <td className="py-1.5">+{pt.tau_hours}h</td>
                        <td>{pt.pred_lat}°N, {pt.pred_lon}°E</td>
                        <td className="text-cyan-400 font-bold">{pt.pred_wind_kts} kt</td>
                        <td className="text-amber-400">{pt.pred_pressure_hpa} hPa</td>
                        <td>±{pt.cone_radius_km} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Editable Observation Vector Matrix (Section 5.3 C4) */}
        <div className="bg-[#061220] border border-[#183652] p-4 rounded-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#183652] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Observation Vector Matrix (Editable Schema Input)
              </h3>
              <p className="text-xs text-slate-400 font-mono-code">
                Directly matches POST /predict/forecast schema. Edit coordinates or add waypoints to simulate what-if perturbations.
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
                        className="w-24 bg-[#0a1a2b] border border-[#183a5c] px-2 py-1 rounded text-cyan-300 font-bold font-mono-code focus:border-cyan-400 outline-none"
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

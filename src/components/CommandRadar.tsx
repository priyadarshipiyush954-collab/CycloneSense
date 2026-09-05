import React, { useState, useRef, useEffect } from "react";
import { SpectralBand } from "../types";
import { Play, Pause, RotateCcw, Crosshair, Wind, Gauge, Compass, Layers, ShieldAlert } from "lucide-react";

interface CommandRadarProps {
  currentStormLat: number;
  currentStormLon: number;
  onCoordinateLock?: (lat: number, lon: number) => void;
  windKts: number;
  pressureHpa: number;
  category: string;
  isRapidIntensifying: boolean;
}

export const CommandRadar: React.FC<CommandRadarProps> = ({
  currentStormLat,
  currentStormLon,
  onCoordinateLock,
  windKts,
  pressureHpa,
  category,
  isRapidIntensifying,
}) => {
  const [selectedBand, setSelectedBand] = useState<SpectralBand>("TIR1");
  const [timeStepIndex, setTimeStepIndex] = useState<number>(2); // 0=T-12h, 1=T-6h, 2=T-0h, 3=T+24h, 4=T+48h
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showRangeRings, setShowRangeRings] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [reticleCoords, setReticleCoords] = useState<{ lat: number; lon: number }>({
    lat: currentStormLat,
    lon: currentStormLon,
  });
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const timeSteps = [
    { label: "T - 12h", time: "00:00Z", wind: Math.max(35, windKts - 25), latOffset: -1.4, lonOffset: -0.8 },
    { label: "T - 6h", time: "06:00Z", wind: Math.max(40, windKts - 12), latOffset: -0.7, lonOffset: -0.4 },
    { label: "T - 0h (Current)", time: "12:00Z", wind: windKts, latOffset: 0, lonOffset: 0 },
    { label: "T + 24h", time: "+24h Prognostic", wind: windKts + 18, latOffset: 1.8, lonOffset: 0.5 },
    { label: "T + 48h", time: "+48h Landfall", wind: Math.max(45, windKts - 15), latOffset: 3.2, lonOffset: 1.1 },
  ];

  const currentStep = timeSteps[timeStepIndex];
  const effectiveLat = Number((currentStormLat + currentStep.latOffset).toFixed(2));
  const effectiveLon = Number((currentStormLon + currentStep.lonOffset).toFixed(2));

  // Auto-play temporal scrubbing
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeStepIndex((prev) => (prev + 1) % timeSteps.length);
      }, 1600);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeSteps.length]);

  // Update canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let rotationAngle = 0;

    const render = () => {
      rotationAngle += 0.008;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      // Clear with deep space background
      ctx.fillStyle = "#050e1b";
      ctx.fillRect(0, 0, width, height);

      // Draw background grid lines
      if (showGrid) {
        ctx.strokeStyle = "#10263c";
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // Draw simulated coastline (West Coast of India / Gujarat protrusion)
      ctx.strokeStyle = "#1e405f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Schematic coastal contour
      ctx.moveTo(width * 0.75, 0);
      ctx.bezierCurveTo(width * 0.72, height * 0.25, width * 0.65, height * 0.35, width * 0.58, height * 0.42); // Gujarat Gulf of Khambhat
      ctx.bezierCurveTo(width * 0.64, height * 0.55, width * 0.68, height * 0.75, width * 0.72, height); // Konkan / Goa coast
      ctx.stroke();

      ctx.fillStyle = "#0a1f3333";
      ctx.lineTo(width, height);
      ctx.lineTo(width, 0);
      ctx.closePath();
      ctx.fill();

      // Spectral Band Color Filter
      // Draw Vortex Cloud Mass
      const stormX = cx + currentStep.lonOffset * 45;
      const stormY = cy - currentStep.latOffset * 45;

      // Draw outer atmospheric moisture diffusion
      const outerRad = Math.min(width, height) * 0.45;
      const gradient = ctx.createRadialGradient(stormX, stormY, 15, stormX, stormY, outerRad);

      if (selectedBand === "TIR1") {
        // Thermal Infrared (Color-enhanced cloud-top temperatures)
        gradient.addColorStop(0, "#050e1b");
        gradient.addColorStop(0.08, "#ffffff");
        gradient.addColorStop(0.18, "#d92338"); // Cold cloud-top -75C
        gradient.addColorStop(0.35, "#f0ab3d"); // -65C
        gradient.addColorStop(0.55, "#2563eb"); // -50C
        gradient.addColorStop(0.8, "#0d3356");
        gradient.addColorStop(1, "transparent");
      } else if (selectedBand === "WV") {
        // Water Vapor (Deep purples and indigos)
        gradient.addColorStop(0, "#071322");
        gradient.addColorStop(0.12, "#ec4899");
        gradient.addColorStop(0.3, "#8b5cf6");
        gradient.addColorStop(0.6, "#312e81");
        gradient.addColorStop(0.85, "#1e1b4b");
        gradient.addColorStop(1, "transparent");
      } else if (selectedBand === "VIS") {
        // Visible (High albedo cloud reflections in grayscale)
        gradient.addColorStop(0, "#050e1b");
        gradient.addColorStop(0.1, "#f8fafc");
        gradient.addColorStop(0.3, "#cbd5e1");
        gradient.addColorStop(0.6, "#64748b");
        gradient.addColorStop(0.85, "#1e293b");
        gradient.addColorStop(1, "transparent");
      } else {
        // RGB Composite
        gradient.addColorStop(0, "#061322");
        gradient.addColorStop(0.08, "#67e8f9");
        gradient.addColorStop(0.2, "#2dd4bf");
        gradient.addColorStop(0.45, "#0284c7");
        gradient.addColorStop(0.7, "#1e3a8a");
        gradient.addColorStop(1, "transparent");
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(stormX, stormY, outerRad, 0, Math.PI * 2);
      ctx.fill();

      // Spiral arms
      ctx.save();
      ctx.translate(stormX, stormY);
      ctx.rotate(-rotationAngle);

      for (let a = 0; a < 3; a++) {
        ctx.beginPath();
        const armOffset = (a * Math.PI * 2) / 3;
        ctx.strokeStyle =
          selectedBand === "TIR1"
            ? "rgba(240, 171, 61, 0.45)"
            : selectedBand === "WV"
            ? "rgba(168, 85, 247, 0.45)"
            : "rgba(103, 232, 249, 0.45)";
        ctx.lineWidth = 14;
        ctx.lineCap = "round";

        for (let t = 0.2; t < 2.5; t += 0.05) {
          const r = t * 65;
          const theta = t * 2.8 + armOffset;
          const px = r * Math.cos(theta);
          const py = r * Math.sin(theta);
          if (t === 0.2) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // Eye cavity
      ctx.fillStyle = "#040a12";
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      // Eyewall ring
      ctx.strokeStyle = "#8ff1df";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#69e8d0";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore();

      // Radar Range Rings centered on Storm Reticle
      if (showRangeRings) {
        // RMW (Radius of Maximum Winds ~38 km)
        ctx.strokeStyle = "#69e8d0";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(stormX, stormY, 40, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#69e8d0";
        ctx.font = "10px 'DM Mono', monospace";
        ctx.fillText("RMW 38km", stormX + 44, stormY - 6);

        // 150 km Gale boundary
        ctx.strokeStyle = "rgba(45, 212, 191, 0.6)";
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(stormX, stormY, 110, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(45, 212, 191, 0.8)";
        ctx.fillText("150 km Gale", stormX + 114, stormY - 6);

        // 300 km Peripheral boundary
        ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(stormX, stormY, 180, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(56, 189, 248, 0.6)";
        ctx.fillText("300 km Outer Ring", stormX + 184, stormY - 6);

        ctx.setLineDash([]);
      }

      // Crosshair Reticle on active storm coordinates
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Cross lines
      ctx.moveTo(stormX - 28, stormY);
      ctx.lineTo(stormX + 28, stormY);
      ctx.moveTo(stormX, stormY - 28);
      ctx.lineTo(stormX, stormY + 28);
      ctx.stroke();

      // Reticle target box
      ctx.strokeRect(stormX - 10, stormY - 10, 20, 20);

      // Reticle tag
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px 'DM Mono', monospace";
      ctx.fillText(
        `${effectiveLat.toFixed(1)}°N, ${effectiveLon.toFixed(1)}°E`,
        stormX + 14,
        stormY + 24
      );

      // Radar sweep line
      const sweepRad = Math.min(width, height) * 0.48;
      const sweepX = stormX + Math.cos(rotationAngle * 2) * sweepRad;
      const sweepY = stormY + Math.sin(rotationAngle * 2) * sweepRad;
      const sweepGrad = ctx.createLinearGradient(stormX, stormY, sweepX, sweepY);
      sweepGrad.addColorStop(0, "rgba(105, 232, 208, 0.4)");
      sweepGrad.addColorStop(1, "rgba(105, 232, 208, 0)");
      ctx.strokeStyle = sweepGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(stormX, stormY);
      ctx.lineTo(sweepX, sweepY);
      ctx.stroke();

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animFrame);
  }, [selectedBand, currentStep, showRangeRings, showGrid, effectiveLat, effectiveLon]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert pixel to approximate Lat/Lon (centered around 15°N, 72°E)
    const lat = 15.4 + (canvas.height / 2 - y) * 0.02;
    const lon = 72.8 + (x - canvas.width / 2) * 0.02;
    setHoverCoords({ lat: Number(lat.toFixed(2)), lon: Number(lon.toFixed(2)) });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hoverCoords) return;
    setReticleCoords(hoverCoords);
    if (onCoordinateLock) {
      onCoordinateLock(hoverCoords.lat, hoverCoords.lon);
    }
  };

  return (
    <div className="bg-[#081524] border border-[#183652] rounded-xl overflow-hidden shadow-2xl">
      {/* Module Header & Channel Selector */}
      <div className="p-4 bg-[#0a1b2d] border-b border-[#183652] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Live Command Radar & Geospatial Visualizer
            </h2>
            <p className="text-xs text-slate-400 font-mono-code">
              INSAT-3D / Himawari-9 Multispectral Storm Centered Swaths
            </p>
          </div>
        </div>

        {/* Multi-Spectral Channel Toggles */}
        <div className="flex items-center gap-1.5 bg-[#050f1c] p-1 rounded-lg border border-[#1a3854]">
          <span className="text-[11px] font-mono-code text-slate-400 px-2 hidden sm:inline">CHANNEL:</span>
          {(
            [
              { id: "TIR1", label: "TIR 10.8µm", desc: "Thermal IR (Cloud-top Temp)" },
              { id: "WV", label: "WV 6.7µm", desc: "Water Vapor (Troposphere)" },
              { id: "VIS", label: "VIS 0.65µm", desc: "High-Res Visible" },
              { id: "RGB", label: "RGB Composite", desc: "Multispectral Fusion" },
            ] as const
          ).map((band) => (
            <button
              key={band.id}
              onClick={() => setSelectedBand(band.id)}
              title={band.desc}
              className={`px-2.5 py-1 text-xs font-mono-code rounded transition-all ${
                selectedBand === band.id
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/50"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              {band.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Radar Screen + Telemetry HUD Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Radar Viewport Canvas */}
        <div className="lg:col-span-8 relative bg-[#040a12] flex flex-col items-center justify-center p-3 border-b lg:border-b-0 lg:border-r border-[#183652]">
          {/* Top Overlays: Reticle lock & Quick toggles */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
            <div className="bg-[#081524]/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-[#1f4265] text-xs font-mono-code text-cyan-300 flex items-center gap-2 shadow-lg">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "10s" }} />
              <span>
                LOCK: {effectiveLat.toFixed(2)}°N, {effectiveLon.toFixed(2)}°E
              </span>
            </div>

            {hoverCoords && (
              <div className="bg-[#081524]/90 px-2.5 py-1 rounded text-[11px] font-mono-code text-slate-300 border border-slate-700 hidden sm:block">
                PTR: {hoverCoords.lat}°N, {hoverCoords.lon}°E
              </div>
            )}
          </div>

          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <button
              onClick={() => setShowRangeRings(!showRangeRings)}
              className={`text-xs px-2.5 py-1 rounded font-mono-code border transition-all ${
                showRangeRings
                  ? "bg-cyan-950/80 text-cyan-300 border-cyan-700"
                  : "bg-slate-900/80 text-slate-400 border-slate-700"
              }`}
            >
              RMW Rings
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`text-xs px-2.5 py-1 rounded font-mono-code border transition-all ${
                showGrid
                  ? "bg-cyan-950/80 text-cyan-300 border-cyan-700"
                  : "bg-slate-900/80 text-slate-400 border-slate-700"
              }`}
            >
              Grid
            </button>
          </div>

          {/* Canvas */}
          <div className="w-full flex items-center justify-center relative">
            <canvas
              ref={canvasRef}
              width={560}
              height={460}
              onMouseMove={handleCanvasMouseMove}
              onClick={handleCanvasClick}
              className="w-full max-w-[560px] h-auto rounded-lg border border-[#142e47] shadow-inner cursor-crosshair"
            />
          </div>

          {/* Temporal Timeline Scrubber (Section 5.1 A4) */}
          <div className="w-full max-w-[560px] mt-3 bg-[#061220] border border-[#163450] p-3 rounded-lg flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono-code">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 rounded bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition"
                  title={isPlaying ? "Pause Timeline" : "Play Timeline"}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setTimeStepIndex(2)}
                  className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white transition"
                  title="Reset to Current T-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <span className="text-slate-300 font-semibold">{currentStep.label}</span>
                <span className="text-slate-500">({currentStep.time})</span>
              </div>
              <span className="text-cyan-400 font-bold">{currentStep.wind} kts</span>
            </div>

            <div className="flex items-center gap-1.5">
              {timeSteps.map((step, idx) => (
                <button
                  key={step.label}
                  onClick={() => setTimeStepIndex(idx)}
                  className={`flex-1 py-1.5 rounded text-[11px] font-mono-code text-center border transition-all ${
                    timeStepIndex === idx
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-semibold"
                      : "bg-[#0b1b2b] text-slate-400 border-[#1a3854] hover:bg-slate-800"
                  }`}
                >
                  {step.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Telemetry HUD (Section 5.1 A3) */}
        <div className="lg:col-span-4 p-5 flex flex-col justify-between bg-[#061220]/80">
          <div className="space-y-4">
            <div className="border-b border-[#183652] pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-code text-slate-400">TELEMETRY HUD</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  REAL-TIME SYNC
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">{category}</h3>
            </div>

            {/* Main Metrics Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0a1d30] border border-[#183c5e] p-3 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono-code">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SUSTAINED WIND</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {currentStep.wind} <span className="text-sm font-normal text-cyan-400">kts</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {(currentStep.wind * 1.852).toFixed(0)} km/h · 1-min avg
                </div>
              </div>

              <div className="bg-[#0a1d30] border border-[#183c5e] p-3 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono-code">
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  <span>CENTRAL PRESSURE</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {pressureHpa} <span className="text-sm font-normal text-amber-400">hPa</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">ΔP -32 hPa below ambient</div>
              </div>
            </div>

            {/* Translation Velocity & Vector */}
            <div className="bg-[#0a1d30] border border-[#183c5e] p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-teal-400" />
                  <span>TRANSLATION VECTOR</span>
                </span>
                <span className="text-teal-300 font-bold">335° (NNW)</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Forward Speed:</span>
                <span className="font-mono-code font-bold text-white">14.2 km/h</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Core Diameter:</span>
                <span className="font-mono-code font-bold text-white">76 km</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">RMW (Max Wind Radius):</span>
                <span className="font-mono-code font-bold text-cyan-300">38 km</span>
              </div>
            </div>

            {/* Rapid Intensification Alert Banner */}
            {isRapidIntensifying && (
              <div className="bg-gradient-to-r from-amber-950/70 to-red-950/70 border border-amber-600/60 p-3 rounded-lg text-xs space-y-1 shadow-lg">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>RAPID INTENSIFICATION CRITERION MET</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Tropospheric wind shear is under 12 kts over SST of 30.2°C. Central barometric drop exceeds 2.5 hPa/3h.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#183652] text-[11px] font-mono-code text-slate-400 flex items-center justify-between">
            <span>INSAT-3DR NADIR 82.0°E</span>
            <span className="text-emerald-400">CALIBRATED</span>
          </div>
        </div>
      </div>
    </div>
  );
};

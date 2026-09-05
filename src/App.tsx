import React, { useState } from "react";
import { Navigation } from "./components/Navigation";
import { CommandRadar } from "./components/CommandRadar";
import { VisionStudio } from "./components/VisionStudio";
import { TrajectoryForecast } from "./components/TrajectoryForecast";
import { MLOpsHub } from "./components/MLOpsHub";
import { BENCHMARK_PRESETS } from "./data/presets";
import { PatternResponse, ForecastResponse, Observation } from "./types";
import {
  Satellite,
  Activity,
  Layers,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Flame,
  Radio,
} from "lucide-react";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("radar");

  // Global telemetry state synchronized across modules
  const [currentStormName, setCurrentStormName] = useState<string>("ARB-2026-02 / CYCLONE TAUKTAE II");
  const [stormLat, setStormLat] = useState<number>(18.42);
  const [stormLon, setStormLon] = useState<number>(71.18);
  const [windKts, setWindKts] = useState<number>(95);
  const [pressureHpa, setPressureHpa] = useState<number>(954);
  const [intensityCategory, setIntensityCategory] = useState<string>(
    "Extremely Severe Cyclonic Storm (ESCS)"
  );
  const [isRapidIntensifying, setIsRapidIntensifying] = useState<boolean>(true);

  // Active observation track
  const [observations, setObservations] = useState<Observation[]>(
    BENCHMARK_PRESETS[1].sampleObservations
  );

  const handleCoordinateLock = (lat: number, lon: number) => {
    setStormLat(lat);
    setStormLon(lon);
  };

  const handlePatternClassified = (result: PatternResponse) => {
    if (result.pattern_predicted === "eye") {
      setWindKts(120);
      setPressureHpa(942);
      setIntensityCategory("Extremely Severe Cyclonic Storm (ESCS)");
      setIsRapidIntensifying(true);
    } else if (result.pattern_predicted === "central_dense_overcast") {
      setWindKts(95);
      setPressureHpa(954);
      setIntensityCategory("Very Severe Cyclonic Storm (VSCS)");
      setIsRapidIntensifying(true);
    } else if (result.pattern_predicted === "curved_band") {
      setWindKts(55);
      setPressureHpa(986);
      setIntensityCategory("Cyclonic Storm (CS)");
      setIsRapidIntensifying(false);
    } else {
      setWindKts(35);
      setPressureHpa(998);
      setIntensityCategory("Tropical Depression (D)");
      setIsRapidIntensifying(false);
    }
  };

  const handleForecastUpdate = (forecast: ForecastResponse) => {
    setIntensityCategory(forecast.intensity_class);
    setIsRapidIntensifying(forecast.rapid_intensification_detected);
  };

  return (
    <div className="min-h-screen bg-[#050d18] text-[#e2edf5] flex flex-col font-sans">
      {/* Navigation Header */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeStormName={currentStormName}
        isRapidIntensifying={isRapidIntensifying}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Hero Mission Briefing & Storm Spinning Visualizer */}
        <section className="bg-gradient-to-br from-[#081729] via-[#06111f] to-[#040a14] border border-[#183652] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 relative z-10">
            {/* Left Content Briefing */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono-code px-2.5 py-1 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                  <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                  SMART INDIA HACKATHON · SIH-2026 OPERATIONAL SUITE
                </span>
                <span className="text-xs font-mono-code text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                  NIO BASIN (BAY OF BENGAL & ARABIAN SEA)
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                AI-Assisted Tropical Cyclone Detection,{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent">
                  Morphological Classification
                </span>{" "}
                & Prognostic Forecasting
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                Unified meteorological command dashboard combining Vision Transformers (ViT-B/16),
                recurrent temporal extrapolation (Bi-LSTM), and Explainable AI (Grad-CAM) for real-time
                cyclogenesis verification, Dvorak T-number estimation, and 72-hour landfall hazard projection.
              </p>

              {/* Action Jump Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab("radar")}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-cyan-950"
                >
                  <Radio className="w-4 h-4" />
                  <span>Launch Command Radar</span>
                </button>
                <button
                  onClick={() => setActiveTab("vision")}
                  className="px-4 py-2 rounded-lg bg-[#0c2236] hover:bg-[#12304d] text-cyan-300 border border-cyan-700/60 font-medium text-xs flex items-center gap-2 transition"
                >
                  <Satellite className="w-4 h-4" />
                  <span>Grad-CAM Explainability</span>
                </button>
                <button
                  onClick={() => setActiveTab("trajectory")}
                  className="px-4 py-2 rounded-lg bg-[#0c2236] hover:bg-[#12304d] text-cyan-300 border border-cyan-700/60 font-medium text-xs flex items-center gap-2 transition"
                >
                  <Activity className="w-4 h-4" />
                  <span>Trajectory & Landfall</span>
                </button>
              </div>

              {/* Quick Telemetry Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#163654]">
                <div>
                  <span className="text-[10px] font-mono-code text-slate-400 block">ACTIVE TARGET</span>
                  <span className="text-xs font-bold text-white font-mono-code">ARB-2026-02</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono-code text-slate-400 block">CURRENT COORDS</span>
                  <span className="text-xs font-bold text-cyan-300 font-mono-code">
                    {stormLat}°N, {stormLon}°E
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono-code text-slate-400 block">PEAK WINDS</span>
                  <span className="text-xs font-bold text-white font-mono-code">{windKts} kts (1-min)</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono-code text-slate-400 block">EST. MIN PRESSURE</span>
                  <span className="text-xs font-bold text-amber-300 font-mono-code">{pressureHpa} hPa</span>
                </div>
              </div>
            </div>

            {/* Right Storm Spinning Graphic (with requested cycloneSpin & bioluminescent eyePulse animations) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="storm relative">
                <i></i>
                <i></i>
                <i></i>
                <b></b>
              </div>
              <div className="mt-4 text-center">
                <span className="text-[11px] font-mono-code text-cyan-400/90 block">
                  DYNAMIC RADIUS OF MAXIMUM WINDS (RMW) · 38 KM
                </span>
                <span className="text-[10px] font-mono-code text-slate-400">
                  Bioluminescent Inverted Planck Absorption Scale
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* View Switcher Controls / Anchor Navigation */}
        <div className="flex items-center justify-between border-b border-[#183652] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono-code text-slate-400">OPERATIONAL VIEW:</span>
            <span className="text-sm font-bold text-cyan-300 uppercase tracking-wide font-mono-code">
              {activeTab === "radar" && "Module A · Live Command Radar & Multispectral Visualizer"}
              {activeTab === "vision" && "Module B · AI Pattern Classifier & Explainability Studio"}
              {activeTab === "trajectory" && "Module C · Trajectory Predictor & Landfall Intercept"}
              {activeTab === "mlops" && "Module D · System Architecture & Hazard Dissemination"}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono-code text-slate-400">
            <span>QUICK SWITCH:</span>
            <button
              onClick={() => setActiveTab("radar")}
              className={`px-2 py-0.5 rounded ${activeTab === "radar" ? "bg-cyan-500 text-slate-950 font-bold" : "hover:text-white"}`}
            >
              RADAR
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab("vision")}
              className={`px-2 py-0.5 rounded ${activeTab === "vision" ? "bg-cyan-500 text-slate-950 font-bold" : "hover:text-white"}`}
            >
              VISION
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab("trajectory")}
              className={`px-2 py-0.5 rounded ${activeTab === "trajectory" ? "bg-cyan-500 text-slate-950 font-bold" : "hover:text-white"}`}
            >
              TRACK
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab("mlops")}
              className={`px-2 py-0.5 rounded ${activeTab === "mlops" ? "bg-cyan-500 text-slate-950 font-bold" : "hover:text-white"}`}
            >
              MLOPS
            </button>
          </div>
        </div>

        {/* Active Module Panel */}
        <section>
          {activeTab === "radar" && (
            <CommandRadar
              currentStormLat={stormLat}
              currentStormLon={stormLon}
              onCoordinateLock={handleCoordinateLock}
              windKts={windKts}
              pressureHpa={pressureHpa}
              category={intensityCategory}
              isRapidIntensifying={isRapidIntensifying}
            />
          )}

          {activeTab === "vision" && (
            <VisionStudio onPatternClassified={handlePatternClassified} />
          )}

          {activeTab === "trajectory" && (
            <TrajectoryForecast
              initialObservations={observations}
              onForecastUpdate={handleForecastUpdate}
            />
          )}

          {activeTab === "mlops" && <MLOpsHub />}
        </section>

        {/* Operational Context & Compliance Banner */}
        <footer className="bg-[#061220] border border-[#163654] rounded-xl p-5 text-xs text-slate-400 space-y-3 font-mono-code">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#142e47] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold">CycloneSense AI</span>
              <span>· Version 1.2.0 (SIH Track: Remote Sensing × Disaster Intelligence)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">WMO GTS Telemetry Compliant</span>
              <span>·</span>
              <span>IMD MOSDAC / NOAA Ground Station Compatible</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>STATUTORY DISCLAIMER:</strong> CycloneSense AI is an advanced research decision-support platform engineered for operational testing, meteorological pattern verification, and early cyclogenesis reconnaissance. It does not supersede official bulletins or statutory cyclone advisories issued by the India Meteorological Department (IMD / RSMC New Delhi).
          </p>
        </footer>
      </main>
    </div>
  );
};
export default App;

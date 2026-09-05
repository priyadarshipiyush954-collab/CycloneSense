import React, { useState, useEffect } from "react";
import {
  Activity,
  ShieldCheck,
  Satellite,
  Radio,
  Clock,
  AlertTriangle,
  Menu,
  X,
} from "lucide-react";

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeStormName: string;
  isRapidIntensifying: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  activeStormName,
  isRapidIntensifying,
}) => {
  const [utcTime, setUtcTime] = useState("");
  const [istTime, setIstTime] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + " UTC");
      setIstTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour12: false,
        }) + " IST"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: "radar", label: "Command Radar", icon: Radio, desc: "Real-time satellite & storm fix" },
    { id: "vision", label: "AI Vision & Grad-CAM", icon: Satellite, desc: "Dvorak ViT-B/16 & cloud-top physics" },
    { id: "trajectory", label: "Track & Intensity", icon: Activity, desc: "Bi-LSTM 72h path projection" },
    { id: "mlops", label: "MLOps & Python APIs", icon: ShieldCheck, desc: "FastAPI, GeoJSON & WMO export" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#050d18]/95 backdrop-blur-md border-b border-[#162e45] text-slate-100">
      {/* Top Banner Alert Bar */}
      <div className="bg-[#0b1c2e] px-4 py-1.5 border-b border-[#183652] flex flex-wrap justify-between items-center text-xs font-mono-code">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            INSAT-3D/3DR VHRR ONLINE
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-300 hidden md:inline">
            SYSTEM: <strong className="text-cyan-300 font-semibold">{activeStormName}</strong>
          </span>
          {isRapidIntensifying && (
            <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/50 animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              RAPID INTENSIFICATION (+30kt/24h)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{utcTime}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300">{istTime}</span>
          </div>
          <span className="bg-[#112a42] text-cyan-300 text-[10px] px-2 py-0.5 rounded border border-cyan-800 hidden sm:inline">
            FP16 TensorRT · 58ms
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-900/30">
            <div className="w-full h-full bg-[#050d18] rounded-[7px] flex items-center justify-center">
              <span className="text-cyan-400 text-lg font-bold">◉</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                CycloneSense <span className="text-cyan-400 font-extrabold">AI</span>
              </h1>
              <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                v1.2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Multi-Source Earth Observation & Meteorological Intelligence
            </p>
          </div>
        </div>

        {/* Desktop Tab Buttons */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800/80 text-slate-200 border border-slate-700 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#061220] border-b border-[#183652] px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  isActive
                    ? "bg-cyan-950/70 text-cyan-300 border border-cyan-700/60 font-semibold"
                    : "text-slate-300 hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isActive ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="text-[11px] text-slate-400 font-mono-code">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

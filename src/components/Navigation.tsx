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
  Smartphone,
  Globe,
  Server,
  QrCode,
  Copy,
  Check,
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
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const currentHost = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  return (
    <>
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
            <button
              onClick={() => setDeviceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 hover:bg-cyan-900/60 transition text-[11px]"
              title="Instructions to run and access on any mobile phone, tablet, or device"
            >
              <Smartphone className="w-3 h-3 text-cyan-400" />
              <span>Run On Any Device</span>
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{utcTime}</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-300">{istTime}</span>
            </div>
            <span className="bg-[#112a42] text-cyan-300 text-[10px] px-2 py-0.5 rounded border border-cyan-800 hidden lg:inline">
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
              onClick={() => setDeviceModalOpen(true)}
              className="p-2 rounded-lg bg-slate-800/80 text-cyan-300 border border-cyan-800/50"
              aria-label="Device access instructions"
            >
              <Smartphone className="w-5 h-5" />
            </button>
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

      {/* Cross-Device Access Modal */}
      {deviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#081729] border border-[#1d4268] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-slate-200">
            <div className="flex items-center justify-between border-b border-[#183652] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Run & Access On Any Device</h3>
                  <p className="text-xs text-slate-400">Phones, Tablets, Laptops, and Cloud Instances</p>
                </div>
              </div>
              <button
                onClick={() => setDeviceModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono-code">
              {/* Option 1: Live Cloud URL */}
              <div className="bg-[#050e1a] border border-[#163654] p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    1. Instant Live Web URL (Works on Any Phone / Browser)
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    HTTPS ACTIVE
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Open this exact address in Safari / Chrome on your mobile phone or tablet:
                </p>
                <div className="flex items-center gap-2 bg-[#02070f] p-2 rounded-lg border border-slate-800">
                  <input
                    type="text"
                    readOnly
                    value={currentHost}
                    className="bg-transparent text-cyan-300 text-xs w-full outline-none font-mono-code"
                  />
                  <button
                    onClick={() => handleCopy(currentHost, "cloudUrl")}
                    className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 flex items-center gap-1 text-[11px]"
                  >
                    {copiedText === "cloudUrl" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText === "cloudUrl" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Local Network (Wi-Fi) */}
              <div className="bg-[#050e1a] border border-[#163654] p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-amber-300 font-bold flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    2. Local Wi-Fi Access (From Phone/Tablet to Laptop)
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  When running locally on your computer, connect your phone to the same Wi-Fi and open your computer's local IP address:
                </p>
                <div className="bg-[#02070f] p-2.5 rounded-lg border border-slate-800 space-y-1 text-[11px] text-slate-300">
                  <div className="text-slate-400"># Frontend Dashboard:</div>
                  <div className="text-cyan-300 font-bold">http://&lt;YOUR_COMPUTER_IP&gt;:3000</div>
                  <div className="text-slate-400 mt-1"># Python FastAPI Backend:</div>
                  <div className="text-amber-300 font-bold">http://&lt;YOUR_COMPUTER_IP&gt;:8000/docs</div>
                </div>
              </div>

              {/* Option 3: Python Backend */}
              <div className="bg-[#050e1a] border border-[#163654] p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-purple-300 font-bold flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-purple-400" />
                    3. Python Server & ML Model Execution
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  To start the native Python backend on all network interfaces:
                </p>
                <div className="flex items-center justify-between bg-[#02070f] p-2 rounded-lg border border-slate-800">
                  <code className="text-emerald-400 text-[11px]">python run_server.py --host 0.0.0.0 --port 8000</code>
                  <button
                    onClick={() => handleCopy("python run_server.py --host 0.0.0.0 --port 8000", "pythonCmd")}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1"
                  >
                    {copiedText === "pythonCmd" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedText === "pythonCmd" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDeviceModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

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
  Cloud,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ShieldAlert,
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
  const [activeModalTab, setActiveModalTab] = useState<"cloudrun" | "share" | "local">("cloudrun");

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
    setTimeout(() => setCopiedText(null), 2500);
  };

  const currentHost = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const isDevUrl = currentHost.includes("ais-dev-");

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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-600/70 hover:bg-cyan-900/80 transition text-[11px] font-semibold shadow-sm"
              title="Fix 'Access Denied' and deploy code to Google Cloud Run or access on any phone"
            >
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>Deploy to Cloud Run / Access on Phone</span>
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
              className="p-2 rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-700/60"
              aria-label="Cloud Run and device access instructions"
            >
              <Cloud className="w-5 h-5" />
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

      {/* Google Cloud Run & Cross-Device Access Modal */}
      {deviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#081729] border border-[#1d4268] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-200 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#183652] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-600 flex items-center justify-center text-cyan-400">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Google Cloud Run & Device Access</h3>
                  <p className="text-xs text-slate-400">Run code in the cloud or fix "You don't have access to this page"</p>
                </div>
              </div>
              <button
                onClick={() => setDeviceModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Cause Diagnostic Callout */}
            <div className="bg-amber-950/40 border border-amber-600/60 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Why did you get "You don't have access to this page"?</span>
              </div>
              <p className="text-amber-100/90 text-[11.5px] leading-relaxed">
                The development preview URL (<code className="text-amber-200 bg-black/40 px-1 py-0.5 rounded font-mono">ais-dev-...</code>) is a private sandboxed container locked to your Google developer session. Opening it on a mobile phone, tablet, or another browser without Google account authentication results in Google Cloud Run blocking access (403 Forbidden).
              </p>
              <div className="text-[11px] text-amber-200/80">
                👉 <strong>Two ways to fix it:</strong> (1) Deploy to your own <strong>Google Cloud Run</strong> service with public access, or (2) Click the <strong>"Share"</strong> button in Google AI Studio to get a public URL.
              </div>
            </div>

            {/* Navigation Tabs inside Modal */}
            <div className="flex border-b border-[#183652] gap-2 text-xs font-medium">
              <button
                onClick={() => setActiveModalTab("cloudrun")}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
                  activeModalTab === "cloudrun"
                    ? "border-cyan-400 text-cyan-300 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Cloud className="w-4 h-4" />
                <span>Deploy to Google Cloud Run</span>
              </button>
              <button
                onClick={() => setActiveModalTab("share")}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
                  activeModalTab === "share"
                    ? "border-cyan-400 text-cyan-300 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>AI Studio Public Share</span>
              </button>
              <button
                onClick={() => setActiveModalTab("local")}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
                  activeModalTab === "local"
                    ? "border-cyan-400 text-cyan-300 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Local Wi-Fi Access</span>
              </button>
            </div>

            {/* Tab 1: Google Cloud Run Deployment */}
            {activeModalTab === "cloudrun" && (
              <div className="space-y-4 text-xs font-mono-code">
                <div className="bg-[#050e1a] border border-[#163654] p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-300 font-bold flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      1. One-Line Command (Direct Source to Cloud Run)
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                      PUBLIC ACCESSIBLE
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11.5px] leading-relaxed font-sans">
                    Run this command in your project directory in terminal (or PowerShell). The flag <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">--allow-unauthenticated</code> guarantees that <strong>anyone on any phone, tablet, or browser can access it</strong> without any login:
                  </p>
                  <div className="flex items-center justify-between bg-[#02070f] p-3 rounded-lg border border-slate-800">
                    <code className="text-cyan-300 text-xs break-all">
                      gcloud run deploy cyclonesense-ai --source . --port 3000 --allow-unauthenticated
                    </code>
                    <button
                      onClick={() =>
                        handleCopy(
                          "gcloud run deploy cyclonesense-ai --source . --port 3000 --allow-unauthenticated",
                          "gcloudCmd"
                        )
                      }
                      className="ml-3 px-3 py-1.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 flex items-center gap-1.5 text-xs flex-shrink-0"
                    >
                      {copiedText === "gcloudCmd" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === "gcloudCmd" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  {/* Windows missing gcloud helper */}
                  <div className="bg-[#020813] p-2.5 rounded-lg border border-amber-800/40 text-[11px] text-amber-200/90 font-sans space-y-1">
                    <div className="font-bold text-amber-300 flex items-center gap-1">
                      <span>💡 On Windows and getting "'gcloud' is not recognized"?</span>
                    </div>
                    <div>Install it in 10 seconds via PowerShell:</div>
                    <div className="flex items-center justify-between bg-black/50 p-1.5 rounded border border-amber-900/50 font-mono-code text-cyan-300">
                      <code>winget install Google.CloudSDK</code>
                      <button
                        onClick={() => handleCopy("winget install Google.CloudSDK", "wingetCmd")}
                        className="text-[10px] text-cyan-400 hover:underline px-1"
                      >
                        {copiedText === "wingetCmd" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="text-slate-400 text-[10px]">Then restart PowerShell and re-run the deploy command!</div>
                  </div>
                </div>

                <div className="bg-[#050e1a] border border-[#163654] p-4 rounded-xl space-y-3 font-sans">
                  <span className="text-white font-bold flex items-center gap-2 text-xs">
                    <Server className="w-4 h-4 text-teal-400" />
                    2. Pre-Configured Automated Scripts Included in This Project
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono-code">
                    <div className="p-3 bg-[#02070f] border border-slate-800 rounded-lg space-y-1.5">
                      <div className="text-slate-400 text-[11px]">Linux / macOS / Cloud Shell:</div>
                      <div className="flex items-center justify-between">
                        <code className="text-emerald-400">./deploy-cloudrun.sh</code>
                        <button
                          onClick={() => handleCopy("./deploy-cloudrun.sh", "shCmd")}
                          className="text-cyan-300 text-[10px] hover:underline"
                        >
                          {copiedText === "shCmd" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                    <div className="p-3 bg-[#02070f] border border-slate-800 rounded-lg space-y-1.5">
                      <div className="text-slate-400 text-[11px]">Windows PowerShell:</div>
                      <div className="flex items-center justify-between">
                        <code className="text-emerald-400">.\deploy-cloudrun.ps1</code>
                        <button
                          onClick={() => handleCopy(".\\deploy-cloudrun.ps1", "psCmd")}
                          className="text-cyan-300 text-[10px] hover:underline"
                        >
                          {copiedText === "psCmd" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Also includes <code className="text-cyan-300">cloudbuild.yaml</code> for automated Google Cloud Build CI/CD.
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: AI Studio Share Link */}
            {activeModalTab === "share" && (
              <div className="space-y-4 text-xs font-sans">
                <div className="bg-[#050e1a] border border-[#163654] p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    Using the AI Studio "Share" Button (Zero Setup)
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    If you want to view this app right now on your phone without running cloud commands:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-slate-300 text-xs bg-[#02070f] p-3 rounded-lg border border-slate-800">
                    <li>
                      Look at the top-right toolbar of this <strong>Google AI Studio</strong> screen.
                    </li>
                    <li>
                      Click the <strong className="text-cyan-300">Share</strong> button.
                    </li>
                    <li>
                      Copy the generated public link (which starts with <code className="text-emerald-400 font-mono">https://ais-pre-...</code> instead of <code className="text-rose-400 font-mono">ais-dev-...</code>).
                    </li>
                    <li>
                      Send that link to your phone via WhatsApp, Telegram, or email. It will open immediately without asking for login!
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* Tab 3: Local Wi-Fi */}
            {activeModalTab === "local" && (
              <div className="space-y-4 text-xs font-sans">
                <div className="bg-[#050e1a] border border-[#163654] p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    Same Wi-Fi Network Access (Laptop to Phone)
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    When running the project on your local computer (<code className="text-cyan-300 font-mono">npm run dev</code> or <code className="text-cyan-300 font-mono">node dist/server.cjs</code>):
                  </p>
                  <div className="bg-[#02070f] p-3 rounded-lg border border-slate-800 space-y-2 font-mono-code text-[11.5px]">
                    <div className="text-slate-400">1. Connect both laptop and phone to the same Wi-Fi.</div>
                    <div className="text-slate-400">2. Find your laptop's IP address (e.g. 192.168.1.45 via <code className="text-white">ipconfig</code> on Windows or <code className="text-white">ifconfig</code> on Mac/Linux).</div>
                    <div className="text-slate-400">3. On your phone's browser, open:</div>
                    <div className="text-cyan-300 font-bold pl-3">http://192.168.x.x:3000</div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-[#183652]">
              <span className="text-[11px] text-slate-500 font-mono-code">
                Cloud Run Port: 3000 · Managed Service · Container: Node 22 Alpine
              </span>
              <button
                onClick={() => setDeviceModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-950"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

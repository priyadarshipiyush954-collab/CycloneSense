import { useCallback, useEffect, useState } from "react";
import type { ActiveCycloneResult, ActiveCyclone } from "../server/gdacs";
import { LAYERS, LiveMap } from "./LiveMap";

const utcDay = (d: Date) => d.toISOString().slice(0, 10);
const defaultDay = () => utcDay(new Date(Date.now() - (new Date().getUTCHours() < 10 ? 86_400_000 : 0)));
function nrtTime(delayMin: number): Date {
  return new Date(Math.floor((Date.now() - delayMin * 60_000) / 600_000) * 600_000);
}
const ALERT_TEXT: Record<string, string> = { Red: "High alert", Orange: "Elevated alert", Green: "Low alert" };

export function App() {
  const [layerId, setLayerId] = useState(LAYERS[0].id);
  const [day, setDay] = useState(defaultDay);
  const [delay, setDelay] = useState(60);
  const [feed, setFeed] = useState<ActiveCycloneResult | null>(null);
  const [focus, setFocus] = useState<ActiveCyclone | null>(null);
  const [tileState, setTileState] = useState<"loading" | "ready" | "missing">("loading");
  const [feedRetry, setFeedRetry] = useState(0);
  const [now, setNow] = useState(new Date());

  const layer = LAYERS.find((l) => l.id === layerId) ?? LAYERS[0];
  const when = nrtTime(delay);
  const time = layer.kind === "daily" ? day : when.toISOString().replace(/\.\d{3}Z$/, "Z");
  const onTileState = useCallback((state: "loading" | "ready" | "missing") => setTileState(state), []);

  const loadFeed = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/active-cyclones", { signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Cyclone feed returned HTTP ${response.status}`);
      const data = (await response.json()) as ActiveCycloneResult;
      setFeed(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeed({ ok: false, fetchedAt: null, cyclones: [], source: "", error: error instanceof Error ? error.message : "Unable to load cyclone feed" });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadFeed(controller.signal);
    const timer = window.setInterval(() => void loadFeed(), 5 * 60_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [loadFeed]);

  useEffect(() => {
    if (feedRetry === 0) return;
    void loadFeed();
  }, [feedRetry, loadFeed]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const refresh = () => {
    setTileState("loading");
    setFeedRetry((n) => n + 1);
  };
  const checkedAt = feed?.fetchedAt
    ? new Date(feed.fetchedAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="CycloneSense home">
          <span className="brand-mark"><span /></span>
          <span><strong>CycloneSense</strong><small>ATMOSPHERIC INTELLIGENCE</small></span>
        </a>
        <nav className="topnav" aria-label="Main navigation">
          <a href="#monitor">Live monitor</a><a href="#signals">Cyclone signals</a><a href="#sources">Data sources</a>
        </nav>
        <div className="topbar-right"><span className="status-dot" /> <span>LIVE SYSTEM</span><button className="icon-button" onClick={refresh} aria-label="Refresh data" title="Refresh data">↻</button></div>
      </header>

      <main id="top">
        <section className="hero-section reveal">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> NORTH INDIAN OCEAN · REAL-TIME OBSERVATION</div>
            <h1>See the storm.<br /><span>Understand the signal.</span></h1>
            <p className="hero-description">A live satellite window into the Bay of Bengal and Arabian Sea, built to make evolving weather systems easier to explore.</p>
            <div className="hero-actions"><a className="primary-action" href="#monitor">Explore live map <span>↘</span></a><a className="text-action" href="https://mausam.imd.gov.in/" target="_blank" rel="noreferrer">Official IMD updates ↗</a></div>
          </div>
          <div className="hero-visual" aria-label="Atmospheric radar inspired illustration">
            <div className="orbit orbit-a" /><div className="orbit orbit-b" /><div className="orbit orbit-c" />
            <div className="radar-core"><div className="radar-eye" /><div className="radar-sweep" /></div>
            <span className="radar-label label-top">BAY OF BENGAL <i>•</i></span>
            <span className="radar-label label-bottom">SATELLITE TELEMETRY / NIO</span>
            <span className="radar-coord coord-one">17.2° N<br />88.5° E</span><span className="radar-coord coord-two">10 MIN<br />REFRESH CYCLE</span>
          </div>
          <div className="hero-index"><span>01 / OBSERVE</span><span>SCROLL TO EXPLORE ↓</span></div>
        </section>

        <section className="metric-strip reveal" aria-label="System overview">
          <div className="metric-item"><span className="metric-label">SYSTEM STATUS</span><strong><span className="status-dot" /> {feed === null ? "CONNECTING" : feed.ok ? "OPERATIONAL" : "DEGRADED"}</strong><small>{feed === null ? "Establishing data connection" : feed.ok ? "Cyclone feed reachable" : "Cyclone feed unavailable"}</small></div>
          <div className="metric-item"><span className="metric-label">ACTIVE SYSTEMS</span><strong>{feed === null ? "—" : feed.ok ? String(feed.cyclones.length).padStart(2, "0") : "N/A"}</strong><small>North Indian Ocean · GDACS</small></div>
          <div className="metric-item"><span className="metric-label">SATELLITE MODE</span><strong>{layer.kind === "daily" ? "DAILY MOSAIC" : "NEAR REAL-TIME IR"}</strong><small>{layer.kind === "daily" ? day : `${when.toISOString().slice(11, 16)} UTC / ${when.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST`}</small></div>
          <div className="metric-item"><span className="metric-label">LOCAL CLOCK</span><strong>{now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false })} IST</strong><small>{now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })}</small></div>
        </section>

        <section id="monitor" className="monitor-section section-wrap reveal">
          <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> LIVE MONITOR</div><h2>Atmosphere, <em>in motion.</em></h2></div><p>Explore satellite imagery, inspect storm positions, and step through observation times.</p></div>
          <div className="monitor-layout">
            <div className="map-panel">
              <div className="map-panel-header">
                <div><span className="panel-kicker">SATELLITE VIEW</span><h3>North Indian Ocean</h3></div>
                <div className={tileState === "ready" ? "map-state state-ready" : tileState === "missing" ? "map-state state-missing" : "map-state"}><span className="tiny-pulse" />{tileState === "ready" ? "IMAGERY LOADED" : tileState === "missing" ? "TILE ISSUE" : "LOADING TILES"}</div>
              </div>
              <div className="layer-switcher" role="group" aria-label="Satellite imagery layer">
                {LAYERS.map((l, i) => <button key={l.id} aria-pressed={l.id === layerId} onClick={() => { setLayerId(l.id); setTileState("loading"); }} className={l.id === layerId ? "layer-button active" : "layer-button"}><span className="layer-number">0{i + 1}</span>{l.label}</button>)}
              </div>
              <div className="map-canvas">
                <LiveMap layer={layer} time={time} cyclones={feed?.cyclones ?? []} focus={focus} onTileState={onTileState} />
                {tileState === "loading" && <div className="map-loading" role="status"><div className="loader-ring" /><strong>Acquiring satellite imagery</strong><span>Loading tiles from NASA GIBS</span></div>}
                {tileState === "missing" && <div className="map-message" role="status"><strong>Imagery is unavailable for this timestamp.</strong><span>Try an earlier time or another imagery layer. The base map and storm markers remain available.</span><button onClick={() => layer.kind === "daily" ? setDay(utcDay(new Date(Date.parse(day + "T00:00:00Z") - 86_400_000))) : setDelay((d) => d + 10)}>Try previous frame ↶</button></div>}
                <div className="map-legend"><span><i className="legend-dot" /> Storm position</span><span><i className="legend-line" /> Satellite coverage varies</span></div>
              </div>
              <div className="map-controls">
                {layer.kind === "daily" ? <label className="date-control"><span>OBSERVATION DATE (UTC)</span><input type="date" value={day} max={utcDay(new Date())} onChange={(e) => { if (e.target.value) { setDay(e.target.value); setTileState("loading"); } }} /></label> : <div className="time-control"><div><span>OBSERVATION TIME</span><strong>{when.toISOString().slice(11, 16)} UTC <b>/</b> {when.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST</strong></div><div className="step-controls"><button onClick={() => { setDelay((d) => d + 10); setTileState("loading"); }}>← Earlier</button><button onClick={() => { setDelay((d) => Math.max(30, d - 10)); setTileState("loading"); }}>Later →</button></div></div>}
                <p>{layer.note}</p>
              </div>
            </div>

            <aside className="signal-column" id="signals">
              <div className="signal-card">
                <div className="card-topline"><span className="panel-kicker">LIVE FEED</span><span className={feed?.ok ? "feed-indicator good" : "feed-indicator"}>{feed?.ok ? "CONNECTED" : feed === null ? "CONNECTING" : "OFFLINE"}</span></div>
                <h3>Storm signals<span className="signal-count">{feed?.ok ? String(feed.cyclones.length).padStart(2, "0") : "—"}</span></h3>
                {feed === null ? <div className="empty-state"><div className="mini-loader" /><p>Connecting to the cyclone feed…</p></div> : !feed.ok ? <div className="notice-state"><strong>Live feed unavailable</strong><p>The map remains usable, but storm reports could not be refreshed.</p>{feed.error && <small>{feed.error}</small>}<button onClick={refresh}>Retry connection ↻</button></div> : feed.cyclones.length === 0 ? <div className="empty-state"><div className="calm-icon">≈</div><strong>No active systems reported</strong><p>GDACS currently reports no active North Indian Ocean tropical cyclones.</p></div> : <div className="storm-list">{feed.cyclones.map((c) => <button key={c.id} onClick={() => setFocus(c)} className={focus?.id === c.id ? "storm-row selected" : "storm-row"}><span className={`storm-alert alert-${String(c.alert).toLowerCase()}`} /><span className="storm-details"><strong>{c.name}</strong><small>{ALERT_TEXT[c.alert] ?? c.alert} · {c.windKt ? `${c.windKt} kt` : "Wind not reported"}</small><small>{c.lat.toFixed(2)}° N, {c.lon.toFixed(2)}° E</small></span><span className="storm-arrow">↗</span></button>)}</div>}
                <div className="feed-footer">{feed?.ok && feed.source ? <span>Source: {feed.source}{feed.stale ? " · cached update" : ""}</span> : <span>Source: GDACS</span>}{checkedAt && <span>Checked {checkedAt} IST</span>}</div>
              </div>
              <div className="warning-card"><div className="warning-icon">!</div><div><span className="panel-kicker">SAFETY FIRST</span><strong>Official alerts take priority.</strong><p>This research dashboard is not an official warning system. Follow IMD and local disaster authorities for decisions.</p><a href="https://mausam.imd.gov.in/" target="_blank" rel="noreferrer">Open IMD bulletins ↗</a></div></div>
            </aside>
          </div>
        </section>

        <section id="sources" className="sources-section section-wrap reveal">
          <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> THE DATA BEHIND THE VIEW</div><h2>Signals, not <em>guesswork.</em></h2></div><p>We show source-backed observations and make gaps visible instead of filling them with simulated data.</p></div>
          <div className="source-grid">
            <a className="source-card" href="https://earthdata.nasa.gov/data/instruments/gibs" target="_blank" rel="noreferrer"><span className="source-index">01 / IMAGERY</span><span className="source-icon">◉</span><h3>NASA GIBS / EOSDIS</h3><p>Satellite tiles for true-colour, thermal infrared, and near real-time infrared views.</p><span className="source-link">Explore imagery source ↗</span></a>
            <a className="source-card" href="https://www.gdacs.org/" target="_blank" rel="noreferrer"><span className="source-index">02 / STORM FEED</span><span className="source-icon">⌁</span><h3>GDACS</h3><p>Active tropical-cyclone locations and reported alert / severity attributes.</p><span className="source-link">Explore live feed ↗</span></a>
            <a className="source-card" href="https://mausam.imd.gov.in/" target="_blank" rel="noreferrer"><span className="source-index">03 / OFFICIAL GUIDANCE</span><span className="source-icon">↗</span><h3>India Meteorological Department</h3><p>Official weather bulletins, cyclone warnings, and guidance for public safety.</p><span className="source-link">Open official source ↗</span></a>
          </div>
        </section>
        <section className="closing-banner reveal"><div className="closing-mark">CS<span>↗</span></div><div><span className="eyebrow">OBSERVE RESPONSIBLY</span><h2>Better context for a changing atmosphere.</h2></div><a href="#monitor">Back to the map ↑</a></section>
      </main>
      <footer className="footer"><a className="footer-brand" href="#top">CycloneSense<span> / ATMOSPHERIC INTELLIGENCE</span></a><span>Research project · Not an official warning system</span><span>Imagery: NASA GIBS / EOSDIS · Cyclones: GDACS</span></footer>
    </div>
  );
}

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ActiveCyclone } from "../server/gdacs";

export interface SatLayer {
  id: string; label: string; gibs: string; tms: string; ext: "jpg" | "png";
  maxNative: number; kind: "daily" | "nrt"; note: string;
}
export const LAYERS: SatLayer[] = [
  { id: "viirs", label: "Daily true colour", gibs: "VIIRS_SNPP_CorrectedReflectance_TrueColor", tms: "GoogleMapsCompatible_Level9", ext: "jpg", maxNative: 9, kind: "daily", note: "NASA VIIRS true-colour imagery. Daily daytime coverage is best for reading cloud structure." },
  { id: "modis-ir", label: "Daily thermal IR", gibs: "MODIS_Terra_Brightness_Temp_Band31_Day", tms: "GoogleMapsCompatible_Level7", ext: "png", maxNative: 7, kind: "daily", note: "NASA MODIS Band 31 thermal infrared. Colder cloud tops can indicate taller convective clouds; this is not a wind estimate." },
  { id: "himawari", label: "Near real-time IR", gibs: "Himawari_AHI_Band13_Clean_Infrared", tms: "GoogleMapsCompatible_Level6", ext: "png", maxNative: 6, kind: "nrt", note: "Himawari-9 infrared imagery, typically updated on a 10-minute cycle. Coverage and availability can vary by time and region." },
];
export function tileUrl(l: SatLayer, time: string): string {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${l.gibs}/default/${time}/${l.tms}/{z}/{y}/{x}.${l.ext}`;
}
const ALERT_COLOR: Record<string, string> = { Red: "#fb5572", Orange: "#ffb454", Green: "#5be0bd" };
interface Props {
  layer: SatLayer; time: string; cyclones: ActiveCyclone[]; focus: ActiveCyclone | null;
  onTileState: (state: "loading" | "ready" | "missing") => void;
}
export function LiveMap({ layer, time, cyclones, focus, onTileState }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const sat = useRef<L.TileLayer | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const tileTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { center: [16, 80], zoom: 4, minZoom: 3, maxZoom: 10, worldCopyJump: true, zoomControl: false, preferCanvas: true });
    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      zIndex: 1, maxZoom: 19, attribution: "&copy; OpenStreetMap contributors",
    }).addTo(m);
    for (const [id, z] of [["Coastlines_15m", 4], ["Reference_Labels_15m", 5]] as const) {
      let errors = 0;
      const overlay = L.tileLayer(`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${id}/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`, {
        zIndex: z, maxNativeZoom: 9, maxZoom: 10, attribution: "NASA GIBS",
      }).on("tileerror", () => { errors += 1; if (errors >= 8) overlay.remove(); });
      overlay.addTo(m);
    }
    markers.current = L.layerGroup().addTo(m);
    map.current = m;
    const onResize = () => m.invalidateSize({ pan: false });
    window.addEventListener("resize", onResize);
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    resizeObserver?.observe(el.current);
    const delayedResize = window.setTimeout(onResize, 150);
    return () => {
      window.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
      window.clearTimeout(delayedResize);
      if (tileTimer.current !== null) window.clearTimeout(tileTimer.current);
      m.remove(); map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    sat.current?.remove();
    let settled = false;
    let loaded = 0;
    let errors = 0;
    onTileState("loading");
    if (tileTimer.current !== null) window.clearTimeout(tileTimer.current);
    const markMissing = () => { if (!settled) { settled = true; onTileState("missing"); } };
    const next = L.tileLayer(tileUrl(layer, time), {
      zIndex: 3, maxNativeZoom: layer.maxNative, maxZoom: 10, attribution: "Imagery: NASA GIBS / EOSDIS",
      updateWhenIdle: true, keepBuffer: 2, crossOrigin: true,
    });
    next.on("tileload", () => {
      loaded += 1;
      if (!settled) { settled = true; onTileState("ready"); }
    });
    next.on("tileerror", () => {
      errors += 1;
      // Only declare the frame missing if no tiles succeeded. A few edge tiles can fail
      // while the rest of a useful satellite image renders correctly.
      if (!loaded && errors >= 8) markMissing();
    });
    next.on("load", () => {
      if (loaded > 0 && !settled) { settled = true; onTileState("ready"); }
    });
    next.addTo(m);
    sat.current = next;
    tileTimer.current = window.setTimeout(() => {
      if (!loaded && errors > 0) markMissing();
      else if (!settled && loaded > 0) { settled = true; onTileState("ready"); }
      else if (!settled) markMissing();
    }, 12_000);
    return () => {
      next.off();
      next.remove();
      if (tileTimer.current !== null) window.clearTimeout(tileTimer.current);
    };
  }, [layer, time, onTileState]);

  useEffect(() => {
    markers.current?.clearLayers();
    for (const c of cyclones) {
      L.circleMarker([c.lat, c.lon], {
        radius: 8, weight: 2, color: ALERT_COLOR[c.alert] ?? "#ffffff",
        fillColor: ALERT_COLOR[c.alert] ?? "#ffffff", fillOpacity: 0.9,
      }).bindTooltip(c.name, { permanent: true, direction: "right", offset: [9, 0], className: "storm-tooltip" })
        .bindPopup(`<strong>${String(c.name).replace(/[&<>"']/g, (v) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[v] ?? v))}</strong><br/>${c.lat.toFixed(2)}° N, ${c.lon.toFixed(2)}° E<br/>Alert: ${c.alert}${c.windKt ? `<br/>Wind: ${c.windKt} kt` : ""}`)
        .addTo(markers.current!);
    }
  }, [cyclones]);

  useEffect(() => {
    if (focus && map.current) {
      map.current.flyTo([focus.lat, focus.lon], Math.max(map.current.getZoom(), 6), { duration: 1.2 });
      markers.current?.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker) {
          const [lat, lon] = layer.getLatLng().toArray();
          if (Math.abs(lat - focus.lat) < 0.0001 && Math.abs(lon - focus.lon) < 0.0001) layer.openPopup();
        }
      });
    }
  }, [focus]);

  return <div ref={el} role="application" aria-label="Interactive satellite map of the North Indian Ocean. Drag to pan and use the controls to zoom." className="live-map-canvas" />;
}

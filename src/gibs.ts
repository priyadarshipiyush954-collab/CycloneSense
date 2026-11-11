// NASA GIBS layer catalogue + a probe that finds the near real-time Himawari layer that actually answers.
// Himawari's real GIBS id is "..._v0_NRT_ZENJPEG" (found via NASA's directory index); older ids and endpoints are kept as fallbacks.
export interface Variant { layer: string; ep: string; tms: string; ext: "jpg" | "png"; maxNative: number; key?: boolean } // key: JPEG whose no-data pixels are opaque black
export interface SatLayer {
  id: string;
  label: string;
  kind: "daily" | "nrt";
  coast: string; // coastline colour that reads on this imagery
  note: string;
  variants: Variant[];
}

const v = (layer: string, tms: string, ext: "jpg" | "png", maxNative: number, ep = "best", key = false): Variant => ({ layer, ep, tms, ext, maxNative, key });
const HIMA = "Himawari_AHI_Band13_Clean_Infrared_v0_NRT_ZENJPEG";
const L6 = "GoogleMapsCompatible_Level6";

export const LAYERS: SatLayer[] = [
  { id: "viirs", label: "Daily true colour", kind: "daily", coast: "#fff3b0",
    note: "NASA VIIRS on NOAA-20, one daytime pass per day (about 1:30 pm local time). Best for seeing cloud structure.",
    // Suomi NPP stopped delivering data on 2 Nov 2026, so its SNPP layer no longer gets new days. NOAA-20 has the same 1:30 pm pass.
    variants: [v("VIIRS_NOAA20_CorrectedReflectance_TrueColor", "GoogleMapsCompatible_Level9", "jpg", 9, "best", true)] },
  { id: "modis-ir", label: "Daily thermal IR", kind: "daily", coast: "#ffffff",
    note: "NASA MODIS Terra cloud-top temperature, daytime pass. Colder (higher) clouds are usually the stronger storms.",
    variants: [v("MODIS_Terra_Brightness_Temp_Band31_Day", "GoogleMapsCompatible_Level7", "png", 7)] },
  { id: "himawari", label: "Near real-time IR", kind: "nrt", coast: "#ffffff",
    note: "Japan's Himawari-9, updated every 10 minutes. Sees the Bay of Bengal well; the Arabian Sea is near the edge of its view.",
    variants: [v(HIMA, L6, "jpg", 6), v(HIMA, L6, "jpg", 6, "all"), v(HIMA, L6, "jpg", 6, "nrt"), v("Himawari_AHI_Band13_Clean_Infrared", L6, "png", 6)] },
];

export const tileUrl = (x: Variant, time: string) =>
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/${x.ep}/${x.layer}/default/${time}/${x.tms}/{z}/{y}/{x}.${x.ext}`;

/** Latest 10-minute satellite slot, `delayMin` minutes behind now. */
export const slotAt = (delayMin: number) =>
  new Date(Math.floor((Date.now() - delayMin * 60_000) / 600_000) * 600_000);
export const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

const loads = (url: string) =>
  new Promise<boolean>((resolve) => {
    const img = new Image();
    const t = setTimeout(() => resolve(false), 8000);
    img.onload = () => (clearTimeout(t), resolve(true));
    img.onerror = () => (clearTimeout(t), resolve(false));
    img.src = url;
  });

/** Try each variant at a tile over the Bay of Bengal / SE Asia, newest slot first. */
export async function resolveNrt(layer: SatLayer): Promise<{ variant: Variant; delayMin: number } | null> {
  for (const delayMin of [50, 70, 100, 140, 200]) {
    const time = iso(slotAt(delayMin));
    const ok = await Promise.all(layer.variants.map((x) => loads(tileUrl(x, time).replace("{z}/{y}/{x}", "3/3/6"))));
    const i = ok.indexOf(true);
    if (i >= 0) return { variant: layer.variants[i], delayMin };
  }
  return null;
}

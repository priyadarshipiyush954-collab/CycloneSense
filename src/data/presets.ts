import { BenchmarkPreset } from "../types";

export const BENCHMARK_PRESETS: BenchmarkPreset[] = [
  {
    id: "bob-super-cyclone",
    name: "Bay of Bengal Super Cyclone",
    basin: "North Indian Ocean (Bay of Bengal)",
    date: "2026-05-18",
    pattern: "eye",
    dvorak: "T6.5 / Well-Organized Eye",
    wind_kts: 135,
    pressure_hpa: 938,
    min_temp_k: 196.4,
    description:
      "Symmetric eyewall with stadium effect. Intense central core surrounded by deep convective ring with cloud-top temperatures under -76°C.",
    sampleObservations: [
      { id: "o1", lat: 14.1, lon: 88.2, wind_kts: 65, pressure_hpa: 982, timestamp: "T-18h" },
      { id: "o2", lat: 15.6, lon: 87.8, wind_kts: 85, pressure_hpa: 968, timestamp: "T-12h" },
      { id: "o3", lat: 17.2, lon: 87.4, wind_kts: 110, pressure_hpa: 950, timestamp: "T-6h" },
      { id: "o4", lat: 18.9, lon: 86.9, wind_kts: 135, pressure_hpa: 938, timestamp: "T-0h" },
    ],
  },
  {
    id: "tauktae-cdo",
    name: "Cyclone Tauktae (CDO Stage)",
    basin: "Arabian Sea",
    date: "2021-05-16",
    pattern: "central_dense_overcast",
    dvorak: "T5.0 / Central Dense Overcast",
    wind_kts: 95,
    pressure_hpa: 954,
    min_temp_k: 202.1,
    description:
      "Compact, highly reflective axisymmetric cirrus shield with embedded center. Strong upper-level outflow across the northern periphery.",
    sampleObservations: [
      { id: "t1", lat: 14.8, lon: 72.1, wind_kts: 45, pressure_hpa: 992, timestamp: "T-18h" },
      { id: "t2", lat: 15.9, lon: 71.85, wind_kts: 55, pressure_hpa: 984, timestamp: "T-12h" },
      { id: "t3", lat: 17.15, lon: 71.5, wind_kts: 70, pressure_hpa: 970, timestamp: "T-6h" },
      { id: "t4", lat: 18.42, lon: 71.18, wind_kts: 95, pressure_hpa: 954, timestamp: "T-0h" },
    ],
  },
  {
    id: "arabian-curved-band",
    name: "Arabian Sea Curved Band",
    basin: "East-Central Arabian Sea",
    date: "2024-10-22",
    pattern: "curved_band",
    dvorak: "T3.5 / Curved Band",
    wind_kts: 55,
    pressure_hpa: 986,
    min_temp_k: 211.8,
    description:
      "Prominent convective spiral feeder band wrapping 0.75 fractions of a circle into the formative low-level vortex. Moderate inflow.",
    sampleObservations: [
      { id: "c1", lat: 12.2, lon: 68.4, wind_kts: 30, pressure_hpa: 1002, timestamp: "T-18h" },
      { id: "c2", lat: 13.1, lon: 68.7, wind_kts: 38, pressure_hpa: 996, timestamp: "T-12h" },
      { id: "c3", lat: 14.2, lon: 69.1, wind_kts: 46, pressure_hpa: 991, timestamp: "T-6h" },
      { id: "c4", lat: 15.4, lon: 69.5, wind_kts: 55, pressure_hpa: 986, timestamp: "T-0h" },
    ],
  },
  {
    id: "sheared-depression",
    name: "Sheared Tropical Depression",
    basin: "Southwest Bay of Bengal",
    date: "2025-11-04",
    pattern: "sheared",
    dvorak: "T2.5 / Strongly Sheared",
    wind_kts: 35,
    pressure_hpa: 998,
    min_temp_k: 224.5,
    description:
      "Convective mass displaced 110 km west of the exposed low-level circulation center under 28 kt easterly vertical wind shear.",
    sampleObservations: [
      { id: "s1", lat: 10.5, lon: 83.2, wind_kts: 25, pressure_hpa: 1006, timestamp: "T-18h" },
      { id: "s2", lat: 11.2, lon: 82.5, wind_kts: 28, pressure_hpa: 1003, timestamp: "T-12h" },
      { id: "s3", lat: 11.8, lon: 81.9, wind_kts: 32, pressure_hpa: 1000, timestamp: "T-6h" },
      { id: "s4", lat: 12.4, lon: 81.3, wind_kts: 35, pressure_hpa: 998, timestamp: "T-0h" },
    ],
  },
];

# Dataset plan
Recommended fields: storm_id, timestamp_utc, satellite, channel, image_path, lat, lon, wind_kts, pressure_hpa, sst, pattern_label, intensity_label.
# CycloneSense AI Dataset Documentation

**Critical:** split train/validation/test by storm ID, not by image, to prevent leakage.
## Overview
CycloneSense AI utilizes multi-modal data combining **official historical best-track cyclone records** and **satellite imagery** for tropical cyclone identification, morphology classification, and track/intensity forecasting.

Potential authoritative sources include IMD archives, NOAA/NCEI, NASA Earth observation products and permitted INSAT data. Check current access/licensing before redistribution.
---

## 1. Best-Track Real Cyclone Data (NOAA IBTrACS)

### Authoritative Source
- **Provider**: NOAA NCEI (National Centers for Environmental Information) & WMO Regional Specialized Meteorological Centres (RSMC New Delhi / IMD).
- **Archive**: International Best Track Archive for Climate Stewardship (IBTrACS v04r01).
- **Basin**: North Indian Ocean (Bay of Bengal & Arabian Sea).
- **Endpoint**: `https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.NI.list.v04r01.csv`

### Track Schema
The cleaned and processed dataset is stored at `data/processed/cyclone_tracks.csv`:
| Field | Type | Description |
|---|---|---|
| `storm_id` | String | Unique WMO IBTrACS Storm Identifier (e.g., `2019117N11086` for Fani) |
| `name` | String | Official storm name (e.g., `AMPHAN`, `FANI`, `BIPARJOY`, `TAUKTAE`, `MOCHA`) |
| `timestamp` | ISO 8601 | Observation timestamp in UTC |
| `lat` | Float | Storm center latitude in degrees North |
| `lon` | Float | Storm center longitude in degrees East |
| `wind_kts` | Float | Maximum sustained 3-minute/10-minute wind speed in knots |
| `pressure_hpa` | Float | Central minimum atmospheric pressure in hPa (millibars) |
| `dlat` | Float | Forward latitude movement displacement ($\Delta\text{lat}$) |
| `dlon` | Float | Forward longitude movement displacement ($\Delta\text{lon}$) |
| `dwind` | Float | Intensity change rate ($\Delta\text{wind}$) |
| `dpressure` | Float | Pressure tendency ($\Delta\text{pressure}$) |
| `speed_kts` | Float | Translation speed in knots |
| `intensity_class` | Category | `depression`, `tropical_storm`, `severe_cyclonic_storm`, `very_severe_cyclonic_storm` |

---

## 2. Satellite Morphology Imagery Dataset

### Classes
1. `clear`: Cloud-free ocean surface or fair-weather marine cumulus.
2. `developing`: Early tropical disturbance with disorganized convective clusters.
3. `curved_band`: Spiral convective cloud bands curving into the storm center.
4. `central_dense_overcast`: Cold symmetric circular overcast covering the storm core.
5. `eye`: Well-defined circular cyclone eye surrounded by an intense eyewall.
6. `sheared`: Convective cloud canopy displaced away from the low-level circulation center.
7. `dissipating`: Decaying, fragmented, warming cloud tops and disorganized structure.

### Storage Layout
```text
data/
├── raw/
│   └── ibtracs_north_indian_ocean.csv
└── processed/
    ├── cyclone_tracks.csv
    ├── normalization_stats.json
    ├── forecast_train.npz
    ├── forecast_val.npz
    ├── forecast_test.npz
    ├── train/
    │   ├── clear/
    │   ├── developing/
    │   ├── curved_band/
    │   ├── central_dense_overcast/
    │   ├── eye/
    │   ├── sheared/
    │   └── dissipating/
    ├── val/
    │   └── [same 7 classes]
    └── test/
        └── [same 7 classes]
```

---

## 3. Strict Storm-ID Data Partitioning
To strictly prevent **spatial and temporal data leakage**, observations from the same cyclone storm ID are never mixed across splits:
- **Train Split (70%)**: Storm IDs allocated for model parameter learning.
- **Validation Split (15%)**: Unseen storm IDs for early stopping and hyperparameter tuning.
- **Test Split (15%)**: Completely held-out storm IDs for final generalization benchmark.

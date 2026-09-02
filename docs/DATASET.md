# Dataset plan
Recommended fields: storm_id, timestamp_utc, satellite, channel, image_path, lat, lon, wind_kts, pressure_hpa, sst, pattern_label, intensity_label.

**Critical:** split train/validation/test by storm ID, not by image, to prevent leakage.

Potential authoritative sources include IMD archives, NOAA/NCEI, NASA Earth observation products and permitted INSAT data. Check current access/licensing before redistribution.

"""
Real Cyclone Data Downloader and Ingestion Pipeline
"""Real Cyclone Data Downloader and Ingestion Pipeline.

CycloneSense AI - North Indian Ocean & Global Best Track Data
Downloads official NOAA/NCEI IBTrACS data and processes historical storm tracks.
"""

import csv
import logging
import shutil
import sys
import urllib.request
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# NOAA IBTrACS official CSV endpoints
NOAA_IBTRACS_NI_URL = "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.NI.list.v04r01.csv"
NOAA_IBTRACS_NI_URL = (
    "https://www.ncei.noaa.gov/data/"
    "international-best-track-archive-for-climate-stewardship-ibtracs/"
    "v04r01/access/csv/ibtracs.NI.list.v04r01.csv"
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
RAW_FILE = RAW_DIR / "ibtracs_north_indian_ocean.csv"
PROCESSED_FILE = PROCESSED_DIR / "cyclone_tracks.csv"


def download_file(url: str, dest_path: Path, timeout: int = 60) -> bool:
    """Download a file with progress reporting and user-agent header."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = dest_path.with_suffix(".tmp")
    logger.info(f"Downloading from {url}...")
    headers = {"User-Agent": "CycloneSense-AI/1.0 (Disaster Monitoring Research)"}
    req = urllib.request.Request(url, headers=headers)

    try:
        with (
            urllib.request.urlopen(req, timeout=timeout) as response,
            open(temp_path, "wb") as out_file,
        ):
            total_size = int(response.headers.get("Content-Length", 0))
            downloaded = 0
            block_size = 1024 * 64

            while True:
                buffer = response.read(block_size)
                if not buffer:
                    break
                downloaded += len(buffer)
                out_file.write(buffer)
                if total_size > 0:
                    percent = (downloaded / total_size) * 100
                    mb = downloaded / (1024 * 1024)
                    sys.stdout.write(
                        f"\rProgress: {mb:.1f} MB / {total_size / (1024 * 1024):.1f} MB ({percent:.1f}%)"
                    )
                    tot_mb = total_size / (1024 * 1024)
                    msg = f"\rProgress: {mb:.1f} MB / {tot_mb:.1f} MB ({percent:.1f}%)"
                    sys.stdout.write(msg)
                    sys.stdout.flush()

            sys.stdout.write("\n")
        shutil.move(str(temp_path), str(dest_path))
        logger.info(
            f"Successfully downloaded to {dest_path} ({dest_path.stat().st_size / (1024*1024):.2f} MB)"
        )
        sz_mb = dest_path.stat().st_size / (1024 * 1024)
        logger.info(f"Successfully downloaded to {dest_path} ({sz_mb:.2f} MB)")
        return True
    except Exception as exc:
        if temp_path.exists():
            temp_path.unlink()
        logger.error(f"Failed to download {url}: {exc}")
        return False


def get_first_valid(row: dict, keys: list[str], default=None):
    """Retrieve the first non-empty and non-space value from row."""
    for k in keys:
        v = row.get(k, "").strip()
        if v and v not in (" ", "", "-999", "-9999", "None"):
            try:
                val = float(v)
                if val > 0:
                    return val
            except ValueError:
                return v
    return default


def categorize_intensity(wind_kts: float) -> str:
    """Categorize cyclone intensity based on IMD / WMO wind thresholds."""
    if wind_kts < 34:
        return "depression"
    elif wind_kts < 64:
        return "tropical_storm"
    elif wind_kts < 83:
        return "severe_cyclonic_storm"
    else:
        return "very_severe_cyclonic_storm"


def _extract_col(row: list[str], col_indices: dict[str, int], name: str) -> str:
    idx = col_indices.get(name)
    if idx is not None and idx < len(row):
        return row[idx].strip()
    return ""


def process_ibtracs_data(raw_csv_path: Path, output_csv_path: Path):
    """
    Parse NOAA IBTrACS data, extract North Indian Ocean storms,
    calculate motion vectors, and save clean sequential tracks.
    """
    """Parse NOAA IBTrACS data and save clean sequential tracks."""
    output_csv_path.parent.mkdir(parents=True, exist_ok=True)
    logger.info(f"Parsing IBTrACS records from {raw_csv_path}...")

    storm_records = {}

    with open(raw_csv_path, encoding="utf-8", errors="ignore") as f:
        reader = csv.reader(f)
        header = next(reader)
        units_row = next(reader)  # Skip the IBTrACS units row
        next(reader)  # Skip the IBTrACS units row

        col_indices = {name.strip(): i for i, name in enumerate(header)}
        required_cols = ["SID", "NAME", "ISO_TIME", "LAT", "LON"]
        for col in required_cols:
            if col not in col_indices:
                raise ValueError(f"Missing required column '{col}' in IBTrACS header.")

        total_rows = 0
        valid_rows = 0

        for row in reader:
            total_rows += 1
            if not row or len(row) < len(header):
                continue

            sid = row[col_indices["SID"]].strip()
            name = row[col_indices["NAME"]].strip()
            iso_time = row[col_indices["ISO_TIME"]].strip()
            lat_str = row[col_indices["LAT"]].strip()
            lon_str = row[col_indices["LON"]].strip()

            try:
                lat = float(lat_str)
                lon = float(lon_str)
            except ValueError:
                continue

            # Prioritize Regional Specialized Meteorological Centre (IMD New Delhi) or WMO/USA
            def get_col_val(col_name):
                idx = col_indices.get(col_name)
                if idx is not None and idx < len(row):
                    return row[idx].strip()
                return ""

            wind_str = (
                get_col_val("NEWDELHI_WIND") or get_col_val("WMO_WIND") or get_col_val("USA_WIND")
                _extract_col(row, col_indices, "NEWDELHI_WIND")
                or _extract_col(row, col_indices, "WMO_WIND")
                or _extract_col(row, col_indices, "USA_WIND")
            )
            pres_str = (
                get_col_val("NEWDELHI_PRES") or get_col_val("WMO_PRES") or get_col_val("USA_PRES")
                _extract_col(row, col_indices, "NEWDELHI_PRES")
                or _extract_col(row, col_indices, "WMO_PRES")
                or _extract_col(row, col_indices, "USA_PRES")
            )

            try:
                wind = float(wind_str) if wind_str else None
            except ValueError:
                wind = None

            try:
                pres = float(pres_str) if pres_str else None
            except ValueError:
                pres = None

            # Clean default estimates if missing
            if wind is None or wind <= 0:
                wind = 30.0  # standard depression baseline
                wind = 30.0
            if pres is None or pres <= 800 or pres >= 1050:
                pres = 1000.0  # standard sea-level baseline
                pres = 1000.0

            rec = {
                "storm_id": sid,
                "name": name if name and name != "NOT_NAMED" else "UNNAMED",
                "timestamp": iso_time,
                "lat": round(lat, 3),
                "lon": round(lon, 3),
                "wind_kts": round(wind, 1),
                "pressure_hpa": round(pres, 1),
                "intensity_class": categorize_intensity(wind),
            }

            if sid not in storm_records:
                storm_records[sid] = []
            storm_records[sid].append(rec)
            valid_rows += 1

    logger.info(
        f"Processed {total_rows:,} raw rows. Found {len(storm_records):,} storms with {valid_rows:,} track points."
        f"Processed {total_rows:,} raw rows. "
        f"Found {len(storm_records):,} storms with {valid_rows:,} points."
    )

    # Filter storms with at least 4 sequential observations (needed for temporal lag features)
    eligible_storms = {sid: pts for sid, pts in storm_records.items() if len(pts) >= 4}
    logger.info(f"{len(eligible_storms):,} storms have >= 4 observations for sequence modeling.")
    logger.info(f"{len(eligible_storms):,} storms have >= 4 observations.")

    # Write processed sequential tracks with movement deltas
    out_headers = [
        "storm_id",
        "name",
        "timestamp",
        "lat",
        "lon",
        "wind_kts",
        "pressure_hpa",
        "dlat",
        "dlon",
        "dwind",
        "dpressure",
        "speed_kts",
        "intensity_class",
    ]

    count_written = 0
    with open(output_csv_path, "w", newline="", encoding="utf-8") as out_f:
        writer = csv.DictWriter(out_f, fieldnames=out_headers)
        writer.writeheader()

        for sid, pts in eligible_storms.items():
        for _sid, pts in eligible_storms.items():
            pts.sort(key=lambda x: x["timestamp"])
            for i, p in enumerate(pts):
                if i == 0:
                    dlat = 0.0
                    dlon = 0.0
                    dwind = 0.0
                    dpres = 0.0
                else:
                    prev = pts[i - 1]
                    dlat = round(p["lat"] - prev["lat"], 3)
                    dlon = round(p["lon"] - prev["lon"], 3)
                    dwind = round(p["wind_kts"] - prev["wind_kts"], 1)
                    dpres = round(p["pressure_hpa"] - prev["pressure_hpa"], 1)

                # Approximate speed in knots (60 nm per degree) assuming ~6-hour steps
                distance_nm = ((dlat * 60) ** 2 + (dlon * 60) ** 2) ** 0.5
                speed = round(distance_nm / 6.0, 1)

                row_dict = {
                    "storm_id": p["storm_id"],
                    "name": p["name"],
                    "timestamp": p["timestamp"],
                    "lat": p["lat"],
                    "lon": p["lon"],
                    "wind_kts": p["wind_kts"],
                    "pressure_hpa": p["pressure_hpa"],
                    "dlat": dlat,
                    "dlon": dlon,
                    "dwind": dwind,
                    "dpressure": dpres,
                    "speed_kts": speed,
                    "intensity_class": p["intensity_class"],
                }
                writer.writerow(row_dict)
                count_written += 1

    logger.info(
        f"Successfully generated {output_csv_path} with {count_written:,} sequential points across {len(eligible_storms)} storms."
        f"Generated {output_csv_path} with {count_written:,} sequential points "
        f"across {len(eligible_storms)} storms."
    )
    return len(eligible_storms), count_written


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    if not RAW_FILE.exists() or RAW_FILE.stat().st_size < 1000:
        logger.info("Real IBTrACS raw data not found locally. Initiating download...")
        success = download_file(NOAA_IBTRACS_NI_URL, RAW_FILE)
        if not success:
            logger.error("Download failed. Please check network connection.")
            return False
    else:
        logger.info(
            f"Using existing raw IBTrACS data at {RAW_FILE} ({RAW_FILE.stat().st_size / (1024*1024):.2f} MB)"
        )
        sz_mb = RAW_FILE.stat().st_size / (1024 * 1024)
        logger.info(f"Using existing raw IBTrACS data at {RAW_FILE} ({sz_mb:.2f} MB)")

    process_ibtracs_data(RAW_FILE, PROCESSED_FILE)
    logger.info("Real data ingestion complete.")
    return True


if __name__ == "__main__":
    main()

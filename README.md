# CycloneSense

A live dashboard that works on live satellite data to show the incoming cyclones and predict their most probable path.

It is deployed on [⬤CycloneSense](https://cyclonesense.vercel.app)

> Research project. Not an official warning system. Follow IMD (https://mausam.imd.gov.in/) for warnings.
>
> <img width="1900" height="947" alt="image" src="https://github.com/user-attachments/assets/c129437e-22bc-465b-b044-8b6c1e82f254" />


## 1. Website (simple, public)

Light-theme dashboard (v2.0.0; the earlier scroll-story site is tag `v1.0.0`; see CHANGELOG.md). Map of India's
seas with NASA GIBS satellite layers (daily true colour, daily thermal IR, near real-time Himawari IR), timeline
playback, a list of active cyclones worldwide from GDACS (those near India first), and current conditions and a
pressure chart per city from Open-Meteo. If the feed is down or no
cyclone is active, the site says so; no observation on it is simulated.

Selecting a storm draws its observed track and a forecast: a dashed path to +48h, a waypoint
at every 6-hourly lead, and a cone of uncertainty whose radius at each lead is the
forecaster's measured validation error at that lead. The forecast is a model prediction, and
the panel beside the map names the model, how many observed fixes it started from, and which
inputs were derived rather than observed. Without a trained checkpoint installed the same
endpoint answers by extrapolating the last observed motion vector and labels itself
`physics-extrapolation` rather than presenting it as a model result.

```bash
npm ci
npm run dev          # http://localhost:3000
npm run build && npm start
npm run test:web     # feed parser, proxy and trajectory geometry tests
npm run typecheck    # tsc --noEmit over src, server and tests
```

The Research section includes a Model A wind estimator. Run the Python service alongside the web app with `python run_server.py --host 0.0.0.0 --port 8000`; the Node server proxies `/api/predict/wind` to `http://127.0.0.1:8000` by default. Set `PYTHON_API_URL` when the API runs elsewhere. For an integrated local stack, use `docker compose up --build` (packages the Model A checkpoint into the Python image). The root `Dockerfile` alone serves the website and proxy, so its Python API must be configured separately.

The same Python service serves the trajectory forecaster at `POST /predict/trajectory`, proxied
at `/api/predict/trajectory`. Checkpoints are gitignored, so a fresh clone has none and the
endpoint runs its labelled extrapolation fallback. To train the real one on CPU in a few
minutes (a global pre-train across all basins, then a North Indian Ocean fine-tune):

```bash
pip install -r requirements-dev.txt  # full ML stack plus test tools
python -m ml.train_trajectory --basins WP,SI,EP,SP --exclude-storms-in-basins NI \
    --epochs 45 --batch-size 64 --checkpoint models/bob_trajectory_global.pt
python -m ml.train_trajectory --basins NI --epochs 200 --lr 5e-4 --patience 60 \
    --init-from models/bob_trajectory_global.pt \
    --checkpoint models/bob_trajectory_gru.pt
python -m pytest -q
```

The script prints per-lead validation error next to the straight-line baseline it has to
beat, and refuses a two-stage run whose pre-train already saw the storms the fine-tune holds
out. It beats that baseline at seven of eight leads and loses at +6 h.

## 3. Deploying a shareable link

```bash
npm i -g vercel && vercel login && vercel --prod
```

The forecast runs on Vercel without PyTorch: the trained weights are exported to
`models/bob_trajectory_gru.npz` (544 KB) and served by a numpy-only forward pass, because
torch is 534 MB against a 250 MB serverless limit. The wind estimator is the one feature
that cannot deploy there, and it says so instead of failing vaguely. See
`docs/DEPLOYMENT.md` for the Cloud Run route if you need the full PyTorch service.
See `docs/MODEL.md` for the architecture and the measured numbers, and `docs/API.md` for the
request and response shapes.

## 2. Real dataset -> Kaggle

`data/build_dataset.py` joins NOAA IBTrACS best-track labels (all basins) with real NASA GIBS MODIS
Terra/Aqua chips (true colour + Band-31 IR) centred on each storm. Needs internet.

```bash
pip install -r requirements-ml.txt
python data/build_dataset.py --check                    # one request per layer: confirms GIBS works
python data/build_dataset.py --limit 50                 # small trial
python data/build_dataset.py --start-year 2003 --workers 8 --kaggle-user YOUR_KAGGLE_USERNAME
kaggle datasets create -p kaggle_dataset -r zip         # needs ~/.kaggle/kaggle.json
```

Output: `tracks.csv` (every 6-hourly record, 6 h deltas, 24 h rapid-intensification flag),
`images_index.csv` (one row per image), `images/`, `dataset-metadata.json`. Re-running resumes.
Splits are by storm ID (70/15/15), never by image.

Limits: one daytime pass per day (no night IR); storms near the dateline are skipped; the IR chip is
GIBS's colour-palette rendering, not raw radiance; wind is USA 1-minute wind. IBTrACS has no Dvorak
pattern labels, so none are included.

## 3. Train and evaluate

```bash
python -m ml.train_chips --data-dir kaggle_dataset --channel truecolor --epochs 12
```

Also runs in a Kaggle notebook (`--data-dir /kaggle/input/<dataset>`, GPU on). It writes
`metrics.json` with test MAE/RMSE, category accuracy, per-category error, and the "predict the
training mean" baseline to compare against. No horizontal flips (they mirror the rotation sense).

## Tests

```bash
pytest tests
npm run test:web
npm run build
```

## Model A wind inference

`POST /predict/wind` accepts multipart form field `file` and serves the preserved checkpoint `models/multiyear45_resnet18_ir_weighted.pt`. It validates images (10 MB upload and 40 megapixel decode limits), converts to RGB, applies the deterministic training/evaluation preprocessing (`Resize(224)`, `ToTensor`, ImageNet normalization), and returns knots. `raw_prediction_kt` is the unmodified model output converted from `wind_kt / 100`; `application_prediction_kt` and compatibility alias `predicted_wind_kt` are independently bounded at zero for application display. A non-finite result or missing checkpoint returns an explicit service error. See [docs/API.md](docs/API.md) and [docs/INFERENCE.md](docs/INFERENCE.md).

The frontend posts to same-origin `/api/predict/wind`; Express streams the upload to FastAPI. For a static Vercel build, set `VITE_API_URL` at build time to a separately hosted FastAPI origin. No deployment is performed by this repository integration.

## Prepare an independent 2024+ holdout

The default command reads local IBTrACS and writes a candidate manifest only. Choose a new output directory; existing paths are refused:

```bash
python scripts/prepare_temporal_2024plus.py --out-dir reports/temporal_2024plus_candidate
```

Fetching is opt-in and limited to an explicit request count (maximum 500 per invocation):

```bash
python scripts/prepare_temporal_2024plus.py --out-dir data/temporal_2024plus_ir --fetch --max-requests 50
```

Review `readiness.json`, source provenance, track agency/status fields, overlap exclusions, and every image before use. The evaluator refuses existing output directories, checks SID overlap with all local indexes/tracks, requires exact SID/time/wind/coordinate joins to the paired temporal `tracks.csv`, validates source/image hashes, labels and 256×256 images, verifies Model A's frozen SHA-256, and writes raw and separately clipped metrics:

```bash
python scripts/evaluate_temporal_2024plus.py --data-dir data/temporal_2024plus_ir --out-dir reports/temporal_2024plus_evaluation
```

Do not tune the checkpoint or configuration on this holdout. When the candidate manifest has no paired local chips, evaluation reports readiness blockers and no metrics. Reuse the original training augmentation in any later training experiment.

Data: NOAA NCEI IBTrACS (Knapp et al. 2010); NASA GIBS / EOSDIS; JMA Himawari; GDACS. Check each source's
terms before redistributing.

## Deploy on Vercel

Import the repo at https://vercel.com/new (framework Vite is detected; `vercel.json` sets the build).
The static site comes from `dist/`, and `api/active-cyclones.ts` serves the cyclone feed as a serverless function.
For wind estimation, configure `VITE_API_URL` to a separately hosted FastAPI service before the Vite build; the browser calls that origin directly. No Python deployment is provisioned by the static Vercel project. `Dockerfile` + `server.ts` provide the Node site and same-origin proxy, while `docker-compose.yml` wires both services for a local integrated stack.

# 🌪️ CycloneSense AI

### AI-Powered Tropical Cyclone Identification, Classification & Prediction
## 🏗️ Competition-Grade Architecture

<p align="center">
  <img 
    src="D:\CycloneSense\CycloneSense-Competition-Grade-Architecture.svg"
    alt="CycloneSense AI Competition-Grade Architecture"
    width="100%"
  />
</p>

### End-to-End Pipeline

```text
Real Satellite Data
        ↓
Data Engineering & Quality Control
        ↓
PyTorch Multi-Source Fusion
        ↓
Temporal Forecasting
        ↓
Pattern + Track + Intensity Prediction
        ↓
Grad-CAM Explainability
        ↓
Prediction Maps / Storm Cone
        ↓
FastAPI Inference API
        ↓
PostgreSQL + PostGIS
        ↓
React Interactive Dashboard
        ↓
Docker + GitHub Actions CI/CD
        ↓
GHCR → Cloud Deployment
        ↓
Operational Monitoring & Technical Documentation

CycloneSense AI is an **Artificial Intelligence / Machine Learning based disaster-management platform** designed to identify, classify, and predict tropical cyclone patterns using **multi-source satellite observations and meteorological data**.

The platform combines **Computer Vision, Deep Learning, Remote Sensing, Time-Series Forecasting, Explainable AI, and MLOps** into a single deployable system.

> 🛰️ Production-grade operational architecture for tropical cyclone tracking and intensity prognosis.

---

## 🎯 Problem Statement

Tropical cyclones can develop and intensify rapidly, making early identification and accurate forecasting extremely important for disaster preparedness.

Traditional cyclone monitoring relies heavily on expert interpretation of satellite imagery, meteorological observations, and numerical weather prediction systems.

CycloneSense AI aims to provide an additional **AI-assisted monitoring layer** capable of:

* Detecting cyclone formations
* Identifying cyclone structural patterns
* Classifying cyclone morphology
* Estimating cyclone intensity
* Predicting short-term movement
* Visualizing predictions through an intuitive dashboard
* Providing explainable AI outputs

---

# 💡 Solution

CycloneSense AI processes satellite imagery together with meteorological observations.

```text
        🛰️ Satellite Data
       /       |       \
    INSAT   Himawari   GOES
       \       |       /
        \      |      /
         ▼     ▼     ▼
      Data Ingestion
             │
             ▼
     Image Preprocessing
             │
             ▼
     ┌───────────────┐
     │ Deep Learning │
     │    Encoder    │
     └───────┬───────┘
             │
       Image Features
             │
       ┌─────▼─────┐
       │ Multi-Source│
       │   Fusion    │
       └─────┬─────┘
             │
       ┌─────┴─────┐
       ▼           ▼
 Pattern Model   Forecast Model
       │           │
       ▼           ▼
 Classification  Track + Intensity
       │           │
       └─────┬─────┘
             ▼
        FastAPI Backend
             │
             ▼
       Web Dashboard
```

---

# 🧠 AI/ML Capabilities

## 1. Cyclone Identification

The system analyzes satellite imagery to identify potential tropical cyclone formations.

## 2. Structural Pattern Classification

The initial model supports seven structural categories:

| Pattern                  | Description                               |
| ------------------------ | ----------------------------------------- |
| `clear`                  | No significant cyclone structure          |
| `developing`             | Developing tropical disturbance           |
| `curved_band`            | Curved cloud-band organization            |
| `central_dense_overcast` | Dense central cloud structure             |
| `eye`                    | Visible cyclone eye structure             |
| `sheared`                | Vertically sheared/disorganized structure |
| `dissipating`            | Weakening or decaying system              |

## 3. Intensity Prediction

Meteorological observations such as:

* Wind speed
* Atmospheric pressure
* Historical intensity
* Location
* Temporal movement

can be used to estimate future cyclone intensity.

## 4. Track Prediction

Historical observations can be processed using temporal ML models such as:

* LSTM
* GRU
* Temporal Transformer

to predict the cyclone's future location.

---

# 🛰️ Multi-Source Satellite Data

The architecture is designed to support multiple satellite sources.

### Potential sources

* INSAT
* Himawari
* GOES
* NOAA/NCEI
* NASA Earth observation datasets
* Other permitted remote-sensing datasets

Each observation can contain:

```text
Satellite
Timestamp
Latitude
Longitude
Channel
Image
Wind Speed
Pressure
Sea Surface Temperature
Cloud Information
```

Multi-source fusion allows the system to obtain a more comprehensive representation of cyclone evolution.

---

# 🖥️ Web Dashboard

CycloneSense AI includes a modern responsive dashboard for interacting with the AI system.

### Dashboard capabilities

* Satellite image upload
* AI cyclone classification
* Confidence score
* Cyclone pattern visualization
* Track prediction
* Intensity prediction
* API connectivity
* Responsive design
* Real-time inference interface

The interface is designed for both technical demonstrations and future operational integration.

---

# 🏗️ Technology Stack

### Frontend

* React
* Vite
* JavaScript
* CSS
* Lucide Icons

### Backend

* Python
* FastAPI
* Pydantic
* Uvicorn

### Machine Learning

* PyTorch
* TorchVision
* NumPy
* Scikit-learn
* CNN / Vision Transformer
* LSTM / Transformer

### DevOps

* Docker
* Docker Compose
* GitHub Actions
* GitHub Container Registry

### Deployment

Recommended:

* Vercel / Netlify — Frontend
* Render / Railway / Fly.io — Backend
* PostgreSQL — Database
* S3-compatible storage — Satellite imagery
* GitHub Container Registry — Docker images

---

# 📁 Project Structure

```text
CycloneSense-AI/
│
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── model.py
│   └── schemas.py
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       └── styles.css
│
├── ml/
│   ├── train.py
│   └── requirements-ml.txt
│
├── tests/
│   └── test_api.py
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATASET.md
│   ├── MODEL.md
│   ├── DEPLOYMENT.md
│   └── DEMO.md
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml
│
├── data/
│   ├── raw/
│   └── processed/
│
├── models/
│
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .env.example
├── .gitignore
├── SECURITY.md
├── LICENSE
└── README.md
```

---

# ⚡ Installation

## 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/CycloneSense-AI.git

cd CycloneSense-AI
```

## 2. Create Python environment

### Windows

```bash
python -m venv .venv

.venv\Scripts\activate
```

### Linux/macOS

```bash
python3 -m venv .venv

source .venv/bin/activate
```

## 3. Install dependencies

```bash
pip install -r requirements.txt
```

## 4. Start backend

```bash
uvicorn app.main:app --reload
```

API:

```text
http://localhost:8000
```

Swagger documentation:

```text
http://localhost:8000/docs
```

---

# 🌐 Web Application & Dashboard

Open your terminal in the `CycloneSense` repository root:

```bash
# Make sure you are in the repository root (e.g. D:\CycloneSense)
npm install

npm run dev
```

The application runs at:

```text
http://localhost:3000
```

Set the backend URL if required:

```bash
VITE_API_URL=http://localhost:8000
```

---

# 🐳 Docker

The complete backend can be containerized using Docker.

Build:

```bash
docker build -t cyclonesense-ai .
```

Run:

```bash
docker run -p 8000:8000 cyclonesense-ai
```

Or run the complete development environment:

```bash
docker compose up --build
```

Services:

```text
Frontend → localhost:3000
Backend  → localhost:8000
Swagger  → localhost:8000/docs
```

---

# 🔌 API

## Health Check

```http
GET /health
```

Example response:

```json
{
  "status": "ok",
  "service": "cyclonesense-api"
}
```

---

## Pattern Prediction

```http
POST /predict/pattern
```

Upload a satellite image.

Example response:

```json
{
  "pattern": "central_dense_overcast",
  "confidence": 0.63,
  "model": "cyclone-pattern-classifier"
}
```

---

## Forecast

```http
POST /predict/forecast
```

Example:

```json
{
  "observations": [
    {
      "lat": 14.2,
      "lon": 72.1,
      "wind_kts": 45,
      "pressure_hpa": 995
    },
    {
      "lat": 14.7,
      "lon": 72.8,
      "wind_kts": 52,
      "pressure_hpa": 989
    },
    {
      "lat": 15.1,
      "lon": 73.5,
      "wind_kts": 58,
      "pressure_hpa": 984
    }
  ]
}
```

Possible output:

```json
{
  "next_lat": 15.5,
  "next_lon": 74.2,
  "predicted_wind_kts": 64,
  "intensity_class": "severe_cyclonic_storm",
  "confidence": 0.64
}
```

---

# 🧪 Testing

Run:

```bash
pytest -q
```

The CI pipeline automatically executes these tests before building the production Docker image.

---

# 🔄 CI/CD Pipeline

CycloneSense AI includes a GitHub Actions pipeline.

```text
Developer Push
      │
      ▼
GitHub Repository
      │
      ▼
Install Dependencies
      │
      ▼
Run Automated Tests
      │
      ├── ❌ Failed → Stop
      │
      ▼
Build Docker Image
      │
      ▼
GitHub Container Registry
      │
      ▼
Deploy
      │
      ▼
Production
```

### Pipeline stages

1. Checkout repository
2. Setup Python
3. Install dependencies
4. Run PyTest
5. Build Docker image
6. Publish image to GHCR
7. Trigger deployment

---

# 📊 ML Training Pipeline

For the production model:

```text
Raw Satellite Data
        ↓
Data Cleaning
        ↓
Geospatial Alignment
        ↓
Storm Center Detection
        ↓
Image Cropping
        ↓
Normalization
        ↓
Data Augmentation
        ↓
Train / Validation / Test
        ↓
CNN / ViT
        ↓
Multi-Source Fusion
        ↓
Classification
        ↓
Temporal Forecasting
        ↓
Evaluation
        ↓
Model Registry
        ↓
Deployment
```

### Important

Dataset splitting should be performed **by cyclone/storm ID**, rather than randomly by image, to prevent data leakage.

---

# 📈 Model Evaluation

### Classification

Recommended metrics:

* Accuracy
* Precision
* Recall
* F1-score
* Macro F1
* Balanced Accuracy
* Confusion Matrix

### Track Prediction

Recommended:

* Track MAE
* Position error in km
* Latitude MAE
* Longitude MAE

### Intensity Prediction

Recommended:

* Wind-speed MAE
* Pressure MAE
* Intensity-category F1
* RMSE

---

# 🔬 Explainable AI

A major objective of CycloneSense AI is to make predictions understandable.

Future production integration will provide:

### Grad-CAM

```text
Satellite Image
      ↓
CNN
      ↓
Prediction
      ↓
Grad-CAM
      ↓
Important Regions
```

This can show which regions of the satellite image influenced the cyclone classification.

---

# ☁️ Deployment

## Frontend

Recommended:

**Vercel**

Build command:

```bash
npm run build
```

Output:

```text
dist
```

Environment variable:

```text
VITE_API_URL=https://your-backend-domain
```

## Backend

Recommended:

**Render / Railway / Fly.io**

Docker image:

```text
ghcr.io/<username>/cyclonesense-ai:latest
```

Health check:

```text
/health
```

---

# 🔐 Environment Variables

Never commit secrets.

Example:

```env
ENVIRONMENT=production
MODEL_PATH=models/cyclone_model.pt
MAX_UPLOAD_MB=10
```

Deployment credentials should be stored using GitHub/hosting-provider secrets.

---

# 🌍 Future Scope

CycloneSense AI can be expanded into a complete operational decision-support platform.

### Planned improvements

* Real-time satellite feeds
* Automatic cyclone detection
* Live cyclone map
* Interactive geospatial visualization
* Multi-channel satellite fusion
* Advanced Vision Transformer
* Temporal Transformer forecasting
* Ensemble prediction
* Uncertainty estimation
* Grad-CAM visualization
* Historical cyclone comparison
* Automated alerts
* Mobile application
* PostgreSQL/PostGIS integration
* Model monitoring
* MLflow model registry
* Kubernetes deployment
* Edge inference
* Government/meteorological API integration

---

# 🏆 Operational Impact

CycloneSense AI can support disaster-management workflows by providing:

### Faster Detection

AI can automatically scan large volumes of satellite imagery.

### Consistent Classification

Machine learning can provide standardized structural classifications.

### Decision Support

Predicted movement and intensity can assist analysts in prioritizing developing systems.

### Scalability

The cloud-native architecture allows processing to scale with incoming satellite observations.

### Explainability

Visual explanations can help meteorological analysts understand model predictions.

---

# ⚠️ Disclaimer

CycloneSense AI is a **research and demonstration platform**.

It is **not an official cyclone warning or emergency-management system**.

Predictions should not be used as a substitute for warnings or forecasts issued by authorized meteorological agencies.

---

# 📜 License

This project is released under the **MIT License**.

See [`LICENSE`](LICENSE) for details.

---

# 🤝 Contributing

Contributions are welcome.

```bash
git checkout -b feature/your-feature

git add .

git commit -m "feat: add your feature"

git push origin feature/your-feature
```

Then open a Pull Request.

---

# 👨‍💻 Team

### CycloneSense AI

**Smart India Hackathon Project**

> AI × Remote Sensing × Climate Intelligence × Disaster Management

---

## ⭐ If you find this project useful

Give the repository a ⭐ and contribute to making AI-powered cyclone monitoring more accessible.



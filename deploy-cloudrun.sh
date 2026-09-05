#!/usr/bin/env bash
# Deploy CycloneSense AI to Google Cloud Run with Public Access for All Devices
set -e

SERVICE_NAME="cyclonesense-ai"
REGION="${GCP_REGION:-us-central1}"

echo "======================================================="
echo "  CycloneSense AI - Google Cloud Run Deployment"
echo "======================================================="

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo "[!] Google Cloud SDK (gcloud) is not installed."
    echo "    Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "[!] No active GCP project configured. Run: gcloud config set project <PROJECT_ID>"
    exit 1
fi

echo "[*] Target GCP Project: $PROJECT_ID"
echo "[*] Target Region:      $REGION"
echo "[*] Service Name:       $SERVICE_NAME"
echo ""

echo "[*] Enabling Google Cloud APIs (Cloud Run & Cloud Build)..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com

echo "[*] Building container and deploying to Google Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
    --source . \
    --platform managed \
    --region "$REGION" \
    --port 3000 \
    --memory 1Gi \
    --cpu 1 \
    --allow-unauthenticated

echo ""
echo "[✓] Deployment complete!"
echo "[*] Public Cloud Run URL:"
gcloud run services describe "$SERVICE_NAME" --platform managed --region "$REGION" --format "value(status.url)"
echo ""
echo "[*] This URL has public access enabled (--allow-unauthenticated)."
echo "[*] Anyone on any phone, tablet, or browser can access it without 'Access Denied' errors."

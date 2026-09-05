# CycloneSense AI - Google Cloud Run Deployment for Windows PowerShell
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  CycloneSense AI - Google Cloud Run Deployment" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Check if gcloud is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Google Cloud SDK (gcloud) is not installed." -ForegroundColor Red
    Write-Host "    Install Google Cloud CLI from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    Exit 1
}

# 2. Get current project
$projectId = (gcloud config get-value project 2>$null)
if (-not $projectId) {
    Write-Host "[!] No active GCP project configured." -ForegroundColor Red
    Write-Host "    Run: gcloud config set project <YOUR_PROJECT_ID>" -ForegroundColor Yellow
    Exit 1
}

$region = "us-central1"
$serviceName = "cyclonesense-ai"

Write-Host "[*] Active GCP Project: $projectId" -ForegroundColor Green
Write-Host "[*] Target Region:      $region" -ForegroundColor Green
Write-Host "[*] Service Name:       $serviceName" -ForegroundColor Green

Write-Host "[*] Enabling Google Cloud Services (Cloud Run & Cloud Build)..." -ForegroundColor Cyan
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com

Write-Host "[*] Building and deploying to Google Cloud Run (Public Access)..." -ForegroundColor Cyan
gcloud run deploy $serviceName `
    --source . `
    --platform managed `
    --region $region `
    --port 3000 `
    --memory 1Gi `
    --cpu 1 `
    --allow-unauthenticated

Write-Host ""
Write-Host "[✓] Deployment to Google Cloud Run succeeded!" -ForegroundColor Green
$publicUrl = (gcloud run services describe $serviceName --platform managed --region $region --format "value(status.url)")
Write-Host "[*] Public URL: $publicUrl" -ForegroundColor Cyan
Write-Host "[*] This URL allows public unauthenticated access on ANY mobile phone, tablet, or browser!" -ForegroundColor Green

# CycloneSense AI - Google Cloud Run Deployment for Windows PowerShell
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  CycloneSense AI - Google Cloud Run Deployment" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Check if gcloud is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "[!] Google Cloud CLI (gcloud) is not yet installed on this PC." -ForegroundColor Red
    Write-Host ""
    Write-Host "Choose one of these 2 quick ways to install it on Windows:" -ForegroundColor Yellow
    Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  Option A (Recommended - Windows Package Manager):" -ForegroundColor White
    Write-Host "    winget install Google.CloudSDK" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Option B (Official GUI Installer):" -ForegroundColor White
    Write-Host "    Download & run: https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After installing, restart PowerShell and re-run: .\deploy-cloudrun.ps1" -ForegroundColor Green
    Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray
    Exit 1
}

# 2. Check login state
Write-Host "[*] Checking Google Cloud authentication..." -ForegroundColor Cyan
$currentAccount = (gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null)
if (-not $currentAccount) {
    Write-Host "[!] You need to log in to Google Cloud. Opening browser login..." -ForegroundColor Yellow
    gcloud auth login
}

# 3. Get or prompt for GCP project
$projectId = (gcloud config get-value project 2>$null)
if (-not $projectId -or $projectId -eq "(unset)") {
    Write-Host ""
    Write-Host "[?] Enter your Google Cloud Project ID (e.g. cyclonesense-app):" -ForegroundColor Yellow -NoNewline
    $projectId = Read-Host " "
    if (-not $projectId) {
        Write-Host "[!] Project ID cannot be empty. Exiting." -ForegroundColor Red
        Exit 1
    }
    gcloud config set project $projectId
}

$region = "us-central1"
$serviceName = "cyclonesense-ai"

Write-Host ""
Write-Host "[*] Active GCP Project: $projectId" -ForegroundColor Green
Write-Host "[*] Target Region:      $region" -ForegroundColor Green
Write-Host "[*] Service Name:       $serviceName" -ForegroundColor Green
Write-Host ""

Write-Host "[*] Step 1/2: Enabling Cloud Run & Build APIs..." -ForegroundColor Cyan
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com

Write-Host "[*] Step 2/2: Building container and deploying to Cloud Run..." -ForegroundColor Cyan
Write-Host "    (This takes ~2-3 minutes to build and generate your public URL)" -ForegroundColor Gray

gcloud run deploy $serviceName `
    --source . `
    --platform managed `
    --region $region `
    --port 3000 `
    --memory 1Gi `
    --cpu 1 `
    --allow-unauthenticated

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  [✓] SUCCESS: Deployment to Google Cloud Run Complete!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
$publicUrl = (gcloud run services describe $serviceName --platform managed --region $region --format "value(status.url)")
Write-Host ""
Write-Host "🌐 Your Public App URL:" -ForegroundColor Yellow
Write-Host "   $publicUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Open this link on ANY phone, tablet, or PC — no login needed!" -ForegroundColor Green

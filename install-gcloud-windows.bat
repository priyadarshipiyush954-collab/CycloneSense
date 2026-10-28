@echo off
echo =======================================================
echo   Installing Google Cloud SDK (gcloud) for Windows
echo =======================================================
echo.

echo Checking for Windows Package Manager (winget)...
where winget >nul 2>nul
if %errorlevel% equ 0 (
    echo [*] Found winget! Installing Google Cloud SDK...
    winget install Google.CloudSDK
    echo.
    echo [✓] Installation initiated.
    echo [*] Once complete, close and reopen your PowerShell window,
    echo     then run: .\deploy-cloudrun.ps1
    goto :end
)

echo [!] winget not found. Opening official Google Cloud SDK installer download...
start https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe
echo.
echo Please complete the installer window that appeared.
echo Once installed, restart PowerShell and run: .\deploy-cloudrun.ps1

:end
pause

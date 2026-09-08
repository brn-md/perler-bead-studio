@echo off
title Perler Studio - Dev Server Launcher
echo ========================================================
echo   Starting Perler Studio Local Development Workstation
echo ========================================================
echo.

cd /d "%~dp0\.."

echo [1/2] Launching FastAPI Backend Engine (Port 8000)...
start "Perler Studio - API Server" cmd /k "venv\Scripts\python.exe -m uvicorn main:app --app-dir apps/api --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching Next.js Web App (Port 3000)...
start "Perler Studio - Web App" cmd /k "cd apps\web && npm run dev"

echo.
echo All services launched!
echo Access the application at: http://localhost:3000
echo.
pause

@echo off
title Perler Studio - 1-Click Launcher
echo ========================================================
echo   Launching Perler Studio Workstation
echo ========================================================
echo.

cd /d "%~dp0\.."

echo Starting backend and frontend...
start /min "Perler API" cmd /c "venv\Scripts\python.exe -m uvicorn main:app --app-dir apps/api --host 127.0.0.1 --port 8000"
start /min "Perler Web" cmd /c "cd apps\web && npm run dev"

echo Waiting for services to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:3000

echo Perler Studio is running at http://localhost:3000
echo Close this window or terminate the terminal when finished.
pause

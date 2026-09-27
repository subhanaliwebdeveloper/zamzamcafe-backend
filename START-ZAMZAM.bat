@echo off
cd /d "%~dp0"
echo ========================================
echo        ZAM ZAM CAFE - LOCAL START
echo ========================================
echo.
echo Starting Node.js Express backend locally...
start "Zam Zam Backend" cmd /k "cd /d "%~dp0backend" && npm start"
timeout /t 3 /nobreak >nul
echo Starting React Vite frontend...
start "Zam Zam Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173/"
echo.
echo Backend API: http://localhost:5000/api
echo Frontend:    http://localhost:5173
pause

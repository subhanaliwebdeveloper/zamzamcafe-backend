@echo off
cd /d "%~dp0"
echo ========================================
echo        ZAM ZAM CAFE - LOCAL START
echo ========================================
echo.
echo Starting Spring Boot backend locally...
start "Zam Zam Backend" cmd /k "cd /d "%~dp0backend" && mvn spring-boot:run"
timeout /t 3 /nobreak >nul
echo Starting React frontend...
start "Zam Zam Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173/"
echo.
echo Frontend uses the Railway backend by default.
echo Railway API: https://zamzamcafe-backend-production.up.railway.app/api
pause

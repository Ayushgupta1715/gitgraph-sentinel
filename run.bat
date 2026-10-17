@echo off
echo ========================================================
echo   Starting GitGraph Sentinel (FalkorDB Hackathon Track 01)
echo ========================================================
echo.
cd /d "%~dp0"
call venv\Scripts\activate.bat
python backend\app.py
pause

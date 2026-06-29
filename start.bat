@echo off
title APK Install Helper
echo Starting APK Install Helper...

:: Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed! Please install Node.js first.
    pause
    exit /b
)

:: Install dependencies if node_modules folder is missing
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install --legacy-peer-deps
)

:: Run adb setup script
echo Checking ADB platform-tools...
call node server/scripts/download-adb.js

:: Auto-open UI in default browser
echo Opening Web UI in browser...
start http://localhost:5173

:: Start client and server
echo Launching server and client...
npm run dev
pause

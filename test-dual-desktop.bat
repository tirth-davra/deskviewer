@echo off
echo ========================================
echo    DeskViewer Dual Desktop Testing
echo ========================================
echo.

echo Step 1: Starting WebSocket Server...
start "WebSocket Server - Port 8080" cmd /k "npm run start:websocket"

echo Waiting for WebSocket server to initialize...
timeout /t 4 /nobreak >nul

echo Step 2: Starting Host App...
echo (This will use the default port, usually 8888)
start "DeskViewer HOST" cmd /k "npm run start:host"

echo Waiting for Host app to fully load...
timeout /t 10 /nobreak >nul

echo Step 3: Kill any process on port 8888 to free it for client...
echo (This prevents port conflicts)
netstat -ano | findstr :8888 >nul && echo Port 8888 is busy, the client will need to use a different approach.

echo Step 4: Starting Client App...
echo (Manual approach - you may need to stop host first)
start "DeskViewer CLIENT" cmd /k "echo First stop the HOST app if running, then run: npm run start:client && pause"

echo.
echo ✅ Apps launching...
echo.
echo 📋 IMPORTANT TESTING STEPS:
echo.
echo Option A - Sequential Testing:
echo 1. Test HOST first: Go to Host mode, click "Start Sharing"
echo 2. Note the Session ID
echo 3. Close HOST app  
echo 4. In CLIENT window: run "npm run start:client"
echo 5. Go to Client mode, enter Session ID, click "Connect"
echo.
echo Option B - Use different computers:
echo 1. Run HOST on this computer
echo 2. Run CLIENT on another computer (same network)
echo.
echo Press any key to continue...
pause >nul
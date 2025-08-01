@echo off
echo ========================================
echo    DeskViewer Network Testing Guide
echo ========================================
echo.

echo 🌐 NETWORK SETUP INSTRUCTIONS:
echo.
echo HOST COMPUTER (Computer A):
echo 1. Run this command: npm run network:host
echo 2. Note the IP address shown (e.g., 192.168.1.100)
echo 3. Share this IP with the CLIENT computer
echo 4. Go to Host mode and click "Start Sharing"
echo 5. Share the Session ID with CLIENT
echo.
echo CLIENT COMPUTER (Computer B):
echo 1. Run this command: npm run network:client
echo 2. Enter the HOST computer's IP address when prompted
echo 3. Go to Client mode and enter the Session ID
echo 4. Click "Connect" to view HOST screen
echo.
echo 🔧 TROUBLESHOOTING:
echo - Make sure both computers are on the same network (WiFi/LAN)
echo - Check Windows Firewall settings (allow port 8080)
echo - Verify IP address is correct (use ipconfig on HOST)
echo.
echo 📋 QUICK COMMANDS:
echo.
echo For HOST computer:
echo   npm run start:websocket
echo   npm run start:host
echo.
echo For CLIENT computer:
echo   npm run start:client-network
echo.
echo Press any key to continue...
pause >nul
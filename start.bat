@echo off
REM Load API key from .env file
for /f "usebackq delims=" %%A in (".env.local") do set %%A

REM Start LocalTunnel (port 3000) with subdomain "spotifyplaylist"
start cmd /k "npx localtunnel --port 3000 --subdomain spotifyplaylist"

REM Wait 2 seconds, then start React frontend (npm start)
timeout /t 2 /nobreak >nul
start cmd /k "npm start"

REM Wait 2 more seconds, then start Express backend (npm run server)
timeout /t 2 /nobreak >nul
start cmd /k "npm run server"

@echo off
setlocal
cd /d "%~dp0"
if exist ".tools\node-v24.14.0-win-x64\npm.cmd" set "PATH=%CD%\.tools\node-v24.14.0-win-x64;%PATH%"
where npm.cmd >nul 2>nul || (echo Please install Node.js 22.12+ or 24 LTS. & pause & exit /b 1)
if not exist node_modules\vite\package.json (call npm.cmd ci --cache .tools\npm-cache || exit /b 1)
call npm.cmd run dev -- --open

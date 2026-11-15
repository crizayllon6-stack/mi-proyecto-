@echo off
title Fabrica de Casos
cd /d "%~dp0"
echo Abriendo el Panel...
start "" /b node panel\vigilar.mjs
node panel\generar.mjs --abrir
echo.
echo Abriendo Claude Code (escribe aqui lo que copies del Panel)...
if exist "%USERPROFILE%\.local\bin\claude.exe" (
  "%USERPROFILE%\.local\bin\claude.exe"
) else (
  claude
)
pause

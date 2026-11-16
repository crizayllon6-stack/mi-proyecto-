@echo off
title Editor de videos de la tienda
cd /d "%~dp0"
echo Editando los videos nuevos de la carpeta "entrada"...
echo (la primera vez tarda mas porque descarga Whisper)
echo.
node scripts\editar.mjs
echo.
start "" "%~dp0listos"
pause

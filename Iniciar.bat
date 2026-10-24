@echo off
rem Inicia o PS5 Emu Shell (versao empacotada). Se ainda nao foi gerada, usa o modo desenvolvimento.
cd /d "%~dp0"
if exist "app\win-unpacked\PS5EmuShell.exe" (
  start "" "app\win-unpacked\PS5EmuShell.exe"
) else (
  start "" /min cmd /c "npx electron ."
)

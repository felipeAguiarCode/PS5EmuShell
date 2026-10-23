@echo off
rem Inicia o PlayDeck (versao empacotada). Se ainda nao foi gerada, usa o modo desenvolvimento.
cd /d "%~dp0"
if exist "app\win-unpacked\PlayDeck.exe" (
  start "" "app\win-unpacked\PlayDeck.exe"
) else (
  start "" /min cmd /c "npx electron ."
)

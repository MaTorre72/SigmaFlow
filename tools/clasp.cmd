@echo off
setlocal
set "ROOT=%~dp0.."
set "NODE_DIR=%ROOT%\.tools\node-v24.16.0-win-x64"
set "CLASP_CMD=%ROOT%\.tools\clasp\node_modules\.bin\clasp.cmd"

if not exist "%NODE_DIR%\node.exe" (
  echo Node locale non trovato in "%NODE_DIR%"
  exit /b 1
)

if not exist "%CLASP_CMD%" (
  echo clasp locale non trovato in "%CLASP_CMD%"
  exit /b 1
)

set "PATH=%NODE_DIR%;%PATH%"
set "NO_UPDATE_NOTIFIER=1"
call "%CLASP_CMD%" %*

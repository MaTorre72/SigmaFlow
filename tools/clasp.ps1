$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$nodeDir = Join-Path $root '.tools\node-v24.16.0-win-x64'
$claspCmd = Join-Path $root '.tools\clasp\node_modules\.bin\clasp.cmd'

if (-not (Test-Path $nodeDir)) {
  throw "Node locale non trovato in $nodeDir"
}

if (-not (Test-Path $claspCmd)) {
  throw "clasp locale non trovato in $claspCmd"
}

$env:Path = "$nodeDir;$env:Path"
$env:NO_UPDATE_NOTIFIER = '1'
& $claspCmd @args

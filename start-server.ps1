# Start a local static server for this repo, trying ports 3000 -> 3001.
# Usage (PowerShell):
#   ./start-server.ps1           # tries 3000, falls back to 3001
#   ./start-server.ps1 -Port 3001

param(
  [int]$Port = 3000
)

function Test-PortInUse {
  param([int]$port)
  $pattern = ":$port\\s"
  $matches = netstat -ano | Select-String -Pattern "LISTENING.+$pattern"
  return $null -ne $matches
}

function Ensure-Tool {
  param([string]$tool)
  $cmd = Get-Command $tool -ErrorAction SilentlyContinue
  return $null -ne $cmd
}

# Move to repo root (script directory)
Set-Location -Path (Split-Path -Path $MyInvocation.MyCommand.Path -Parent)

$portsToTry = @($Port, 3001)
$chosenPort = $null
foreach ($p in $portsToTry) {
  if (-not (Test-PortInUse -port $p)) {
    $chosenPort = $p
    break
  }
}

if ($null -eq $chosenPort) {
  Write-Host "No hay puertos libres entre $($portsToTry -join ', ')." -ForegroundColor Red
  Write-Host "Cierra el proceso que usa esos puertos o elige otro con -Port." -ForegroundColor Yellow
  exit 1
}

$hasPnpm = Ensure-Tool -tool 'pnpm'
if (-not $hasPnpm) {
  Write-Host "pnpm no está disponible en PATH." -ForegroundColor Yellow
  Write-Host "Requisitos: Node.js 18+ y Corepack habilitado (corepack enable)." -ForegroundColor Yellow
  Write-Host "Alternativa rápida: npx http-server . -p $chosenPort -c-1" -ForegroundColor Yellow
  exit 1
}

Write-Host "Iniciando servidor estático en http://127.0.0.1:$chosenPort" -ForegroundColor Cyan
Write-Host "(Cache deshabilada: -c -1). Presiona Ctrl+C para detener."

# Launch http-server via pnpm dlx (no global install needed)
pnpm dlx http-server . -p $chosenPort -c -1

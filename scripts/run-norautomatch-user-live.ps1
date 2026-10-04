param(
  [int]$AppPort = 3310
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$containerName = "norautomatch-user-live-$PID"
$appProcess = $null
$logDir = Join-Path $repoRoot "validation_logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stdoutLog = Join-Path $logDir "user-live-app-stdout.log"
$stderrLog = Join-Path $logDir "user-live-app-stderr.log"

function Require-Command([string]$Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) { throw "Required command '$Name' was not found in PATH." }
}

function Invoke-NativeChecked([scriptblock]$Command, [string]$FailureMessage) {
  & $Command
  if ($LASTEXITCODE -ne 0) { throw $FailureMessage }
}

function Wait-Postgres {
  for ($i = 0; $i -lt 40; $i++) {
    & docker exec $containerName pg_isready -U norauto -d norauto_user_live *> $null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Seconds 1
  }
  throw "Disposable PostgreSQL did not become ready."
}

function Apply-SqlFile([string]$RelativePath) {
  $path = Join-Path $repoRoot $RelativePath
  if (-not (Test-Path $path)) { throw "Required schema file missing: $RelativePath" }
  Get-Content -Raw -Encoding UTF8 $path | & docker exec -i $containerName psql -v ON_ERROR_STOP=1 -U norauto -d norauto_user_live
  if ($LASTEXITCODE -ne 0) { throw "Schema application failed: $RelativePath" }
}

function Wait-App([string]$BaseUrl) {
  for ($i = 0; $i -lt 60; $i++) {
    if ($appProcess -and $appProcess.HasExited) {
      throw "NorAutoMatch app exited before becoming ready. See validation_logs."
    }
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $BaseUrl -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { return }
    } catch {
      # App may still be compiling; continue bounded readiness checks.
    }
    Start-Sleep -Seconds 1
  }
  throw "NorAutoMatch app did not become ready at $BaseUrl."
}

try {
  Write-Host "=== NorAutoMatch synthetic user-live validation ==="
  Write-Host "This test uses a disposable local PostgreSQL container and synthetic data only."

  Require-Command "git"
  Require-Command "node"
  Require-Command "npm"
  Require-Command "docker"

  $head = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $head) { throw "Could not resolve git HEAD." }
  Write-Host "GIT_HEAD=$head"

  & docker info *> $null
  if ($LASTEXITCODE -ne 0) { throw "Docker is installed but the Docker engine is not available." }

  Write-Host "[1/7] Starting disposable PostgreSQL..."
  & docker run -d --name $containerName `
    -e POSTGRES_USER=norauto `
    -e POSTGRES_PASSWORD=norauto-user-live-only `
    -e POSTGRES_DB=norauto_user_live `
    -p "127.0.0.1::5432" `
    postgres:17-alpine | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not start disposable PostgreSQL container." }

  Wait-Postgres
  $portLine = (& docker port $containerName "5432/tcp" | Select-Object -First 1).Trim()
  if ($LASTEXITCODE -ne 0 -or $portLine -notmatch ':(\d+)$') { throw "Could not resolve disposable PostgreSQL host port." }
  $dbPort = $Matches[1]
  $databaseUrl = "postgres://norauto:norauto-user-live-only@127.0.0.1:$dbPort/norauto_user_live"

  Write-Host "[2/7] Applying exact CRM schemas..."
  Apply-SqlFile "infrastructure/norautomatch-crm-v1.sql"
  Apply-SqlFile "infrastructure/norautomatch-crm-v2-manager-handoffs.sql"
  Apply-SqlFile "infrastructure/norautomatch-crm-v3-outbox-relay.sql"

  Write-Host "[3/7] Installing locked dependencies..."
  & npm ci
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }

  Write-Host "[4/7] Compiling user-live verifier..."
  if (Test-Path (Join-Path $repoRoot ".tmp-user-live")) {
    Remove-Item -Recurse -Force (Join-Path $repoRoot ".tmp-user-live")
  }
  & npx tsc -p tsconfig.user-live.json
  if ($LASTEXITCODE -ne 0) { throw "User-live verifier compilation failed." }

  $managerSecret = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
  $baseUrl = "http://127.0.0.1:$AppPort"
  $env:NORAUTO_CRM_DATABASE_URL = $databaseUrl
  $env:NORAUTO_MANAGER_SESSION_SECRET = $managerSecret
  $env:NORAUTO_VALIDATION_BASE_URL = $baseUrl
  $env:NORAUTO_INVENTORY_MODE = "demo"
  $env:NORAUTO_LIVE_INVENTORY_ACTIVATION = ""
  $env:CRM_WEBHOOK_URL = ""
  $env:NEXT_PUBLIC_SITE_URL = $baseUrl

  Write-Host "[5/7] Starting NorAutoMatch locally in demo inventory mode..."
  $appProcess = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/d", "/s", "/c", "npm run dev -- --port $AppPort" `
    -WorkingDirectory $repoRoot `
    -PassThru `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -NoNewWindow
  Wait-App $baseUrl

  Write-Host "[6/7] Exercising real HTTP + auth + PostgreSQL workflow..."
  & node ".tmp-user-live/scripts/norautomatch-user-live-validation.js"
  if ($LASTEXITCODE -ne 0) { throw "NorAutoMatch synthetic user-live workflow failed." }

  Write-Host "[7/7] PASS — validation completed."
  Write-Host "PASS_NORAUTO_USER_LIVE_LAUNCHER"
  Write-Host "No live inventory, real customer data, real CRM webhook, or production authority was used."
}
catch {
  Write-Error $_
  Write-Host "FAIL_NORAUTO_USER_LIVE_LAUNCHER"
  Write-Host "App logs (if created):"
  Write-Host "  $stdoutLog"
  Write-Host "  $stderrLog"
  exit 1
}
finally {
  if ($appProcess -and -not $appProcess.HasExited) {
    try { Stop-Process -Id $appProcess.Id -Force -ErrorAction SilentlyContinue } catch {}
  }
  try { & docker rm -f $containerName *> $null } catch {}

  Remove-Item Env:NORAUTO_CRM_DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:NORAUTO_MANAGER_SESSION_SECRET -ErrorAction SilentlyContinue
  Remove-Item Env:NORAUTO_VALIDATION_BASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:NORAUTO_INVENTORY_MODE -ErrorAction SilentlyContinue
  Remove-Item Env:NORAUTO_LIVE_INVENTORY_ACTIVATION -ErrorAction SilentlyContinue
  Remove-Item Env:CRM_WEBHOOK_URL -ErrorAction SilentlyContinue
  Remove-Item Env:NEXT_PUBLIC_SITE_URL -ErrorAction SilentlyContinue
}

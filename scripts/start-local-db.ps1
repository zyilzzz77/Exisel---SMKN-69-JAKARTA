$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$dataDirectory = Join-Path $projectRoot "private\postgres-data"
$logFile = Join-Path $projectRoot "private\postgres.log"
$pgControl = "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe"

if (-not (Test-Path -LiteralPath $pgControl)) {
  throw "PostgreSQL 16 tidak ditemukan."
}

if (-not (Test-Path -LiteralPath $dataDirectory)) {
  throw "Database lokal EXISEL belum diinisialisasi."
}

& $pgControl -D $dataDirectory status *> $null
if ($LASTEXITCODE -eq 0) {
  Write-Output "PostgreSQL lokal EXISEL sudah aktif pada 127.0.0.1:5433."
  exit 0
}

& $pgControl -D $dataDirectory -l $logFile -o "-p 5433 -h 127.0.0.1" -w start
if ($LASTEXITCODE -ne 0) {
  throw "PostgreSQL lokal EXISEL gagal dijalankan."
}

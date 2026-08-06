$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$dataDirectory = Join-Path $projectRoot "private\postgres-data"
$pgControl = "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe"

if (-not (Test-Path -LiteralPath $pgControl)) {
  throw "PostgreSQL 16 tidak ditemukan."
}

if (-not (Test-Path -LiteralPath $dataDirectory)) {
  Write-Output "Database lokal EXISEL belum diinisialisasi."
  exit 0
}

& $pgControl -D $dataDirectory status *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Output "PostgreSQL lokal EXISEL sudah berhenti."
  exit 0
}

& $pgControl -D $dataDirectory -m fast -w stop
if ($LASTEXITCODE -ne 0) {
  throw "PostgreSQL lokal EXISEL gagal dihentikan."
}

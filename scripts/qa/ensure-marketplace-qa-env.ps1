<#
.SYNOPSIS
  Ensure marketplace QA env vars are present in .env.local.
  Detects, repairs, or reports exactly what's missing.
  Never prints secrets.

.PARAMETER AppUrl
  App URL for QA testing (default: preview BKG).

.PARAMETER Rotate
  Force new password prompt even if existing passwords found.
#>
param(
  [string]$AppUrl = "https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app",
  [switch]$Rotate
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent | Split-Path -Parent
$envFile = Join-Path $root ".env.local"

$qaBlockMarkerStart = "# >>> TURPIAL QA E2E LOCAL ENV"
$qaBlockMarkerEnd = "# <<< TURPIAL QA E2E LOCAL ENV"

$qaVars = @{
  "APP_URL"                     = $AppUrl
  "QA_BUYER_IDENTIFIER"          = "buyerIA"
  "QA_BUYER_EMAIL"               = "buyerIA@local.test"
  "QA_SELLER_IDENTIFIER"         = "sellerIA"
  "QA_SELLER_EMAIL"              = "sellerIA@local.test"
  "QA_ADMIN_IDENTIFIER"          = "mvera"
}

function Write-SafeStatus {
  param([string]$varName, [bool]$present)
  Write-Host "  $varName = $present"
}

function Get-EnvPresence {
  param([string]$filePath)
  $presence = @{}
  if (-not (Test-Path $filePath)) { return $presence }
  $content = Get-Content $filePath -Raw -Encoding UTF8
  foreach ($key in @("DATABASE_URL", "DIRECT_URL", "APP_URL",
    "QA_BUYER_IDENTIFIER", "QA_BUYER_EMAIL", "QA_BUYER_PASSWORD",
    "QA_SELLER_IDENTIFIER", "QA_SELLER_EMAIL", "QA_SELLER_PASSWORD",
    "QA_ADMIN_IDENTIFIER", "QA_ADMIN_PASSWORD")) {
    $pattern = "(?m)^$key="
    $presence[$key] = $content -match $pattern
  }
  return $presence
}

function Get-CleanContent {
  param([string]$content, [string]$startMarker, [string]$endMarker)
  $lines = $content -split "`r?`n"
  $result = @()
  $inBlock = $false
  foreach ($line in $lines) {
    if ($line.Trim() -eq $startMarker) { $inBlock = $true; continue }
    if ($line.Trim() -eq $endMarker) { $inBlock = $false; continue }
    if (-not $inBlock) { $result += $line }
  }
  return ($result -join "`r`n")
}

Write-Host "=== Turpial Marketplace QA Env Bootstrap ==="
Write-Host ""

# Backup existing .env.local
if (Test-Path $envFile) {
  $backup = "$envFile.backup-$(Get-Date -Format 'yyyyMMddHHmmss')"
  Copy-Item $envFile $backup -Force
  Write-Host "Backup: $backup"
}

# Load existing content
$content = ""
if (Test-Path $envFile) {
  $content = Get-Content $envFile -Raw -Encoding UTF8
}

# Check presence
Write-Host "`nCurrent env presence:"
$presence = Get-EnvPresence $envFile
foreach ($key in $presence.Keys | Sort-Object) {
  Write-SafeStatus $key $presence[$key]
}

# Check DB vars — pull from Vercel if missing
$needsPull = (-not $presence["DATABASE_URL"]) -or (-not $presence["DIRECT_URL"])
if ($needsPull) {
  Write-Host "`nDATABASE_URL or DIRECT_URL missing. Pulling from Vercel preview..."
  npx vercel env pull .env.local --environment=preview --scope bkgs-projects-829c67c1
  if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw -Encoding UTF8
  }
}

# Determine if we need password
$needsPassword = $Rotate -or (-not $presence["QA_BUYER_PASSWORD"]) -or (-not $presence["QA_SELLER_PASSWORD"]) -or (-not $presence["QA_ADMIN_PASSWORD"])

if ($needsPassword) {
  Write-Host "`nQA password(s) missing or -Rotate specified."
  $securePwd = Read-Host "Contraseña común QA buyerIA/sellerIA/mvera" -AsSecureString
  $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePwd)
  $qaPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
  [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
  Write-Host "Password set (not printed)."
} else {
  # Extract existing password from env (only to preserve it)
  $match = [regex]::Match($content, "(?m)^QA_BUYER_PASSWORD=(.+)")
  $qaPassword = if ($match.Success) { $match.Groups[1].Value.Trim() } else { $null }
  if (-not $qaPassword) {
    $securePwd = Read-Host "No existing QA password found. Enter contraseña común QA" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePwd)
    $qaPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    Write-Host "Password set (not printed)."
  }
}

if (-not $qaPassword) {
  Write-Error "No QA password available. Aborting."
  exit 1
}

# Build QA block
$qaBlock = @"

$qaBlockMarkerStart
APP_URL=$AppUrl
QA_BUYER_IDENTIFIER=$($qaVars['QA_BUYER_IDENTIFIER'])
QA_BUYER_EMAIL=$($qaVars['QA_BUYER_EMAIL'])
QA_BUYER_PASSWORD=$qaPassword
QA_SELLER_IDENTIFIER=$($qaVars['QA_SELLER_IDENTIFIER'])
QA_SELLER_EMAIL=$($qaVars['QA_SELLER_EMAIL'])
QA_SELLER_PASSWORD=$qaPassword
QA_ADMIN_IDENTIFIER=$($qaVars['QA_ADMIN_IDENTIFIER'])
QA_ADMIN_PASSWORD=$qaPassword
$qaBlockMarkerEnd
"@

# Remove existing QA block and append fresh
$cleanContent = Get-CleanContent $content $qaBlockMarkerStart $qaBlockMarkerEnd
$finalContent = $cleanContent.TrimEnd() + "`r`n`r`n" + $qaBlock

# Write
Set-Content -Path $envFile -Value $finalContent -Encoding UTF8 -NoNewline

# Clear plaintext password
$qaPassword = $null

Write-Host "`n.env.local updated. Final presence:"
$finalPresence = Get-EnvPresence $envFile
foreach ($key in $finalPresence.Keys | Sort-Object) {
  Write-SafeStatus $key $finalPresence[$key]
}

Write-Host "`nDone. Run: npx tsx scripts/qa/doctor-marketplace-qa-env.mjs"

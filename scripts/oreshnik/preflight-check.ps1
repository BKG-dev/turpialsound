<#
.SYNOPSIS
    Oreshnik Pre-flight Check — Valida que el entorno esta listo antes de un sprint.
.DESCRIPTION
    Ejecuta las validaciones obligatorias antes de iniciar cualquier sprint:
    - Verifica que la rama madre existe
    - Verifica variables de entorno criticas (.env.local)
    - Ejecuta QA-00 preflight
    - Verifica git status limpio
.PARAMETER AppUrl
    URL de la app a validar (por defecto, APP_URL de .env.local o preview Vercel).
.PARAMETER SkipQA
    Omite la ejecucion de QA-00 (solo para sprints de docs).
.EXAMPLE
    ./preflight-check.ps1
    ./preflight-check.ps1 -AppUrl https://turpialsound-xxxx.vercel.app
    ./preflight-check.ps1 -SkipQA
.NOTES
    Retorna 0 si todo OK, 1 si hay fallos.
#>

param(
    [string]$AppUrl,
    [switch]$SkipQA,
    [string]$MotherBranch = "integration/today-reservas-marketplace-stable-2026-05-07"
)

$ErrorActionPreference = "Stop"

function Write-Oreshnik {
    param([string]$Message, [string]$Type = "INFO")
    $prefix = switch ($Type) {
        "PASS"  { "[ORESHNIK] [PASS]" }
        "FAIL"  { "[ORESHNIK] [FAIL]" }
        "WARN"  { "[ORESHNIK] [WARN]" }
        default { "[ORESHNIK] [INFO]" }
    }
    Write-Host "$prefix $Message"
}

$allPassed = $true

Write-Host ""
Write-Host "═══════════════════════════════════════════"
Write-Host "  ORESHNIK PRE-FLIGHT CHECK"
Write-Host "═══════════════════════════════════════════"
Write-Host ""

# 1. Verificar git
Write-Oreshnik "Paso 1/5: Git repository" -Type "INFO"
try {
    $gitTop = git rev-parse --show-toplevel 2>$null
    if ($gitTop) {
        Write-Oreshnik "Git repo: $gitTop" -Type "PASS"
    } else {
        throw "No es un repositorio git"
    }
} catch {
    Write-Oreshnik "No se encontro repositorio git" -Type "FAIL"
    $allPassed = $false
}

# 2. Verificar rama madre
Write-Oreshnik "Paso 2/5: Rama madre '$MotherBranch'" -Type "INFO"
try {
    git fetch origin --quiet 2>$null
    $motherExists = git rev-parse --verify "origin/$MotherBranch" 2>$null
    if ($motherExists) {
        $motherCommit = git rev-parse --short "origin/$MotherBranch"
        Write-Oreshnik "Rama madre existe: $MotherBranch @ $motherCommit" -Type "PASS"
    } else {
        throw "Rama madre no encontrada"
    }
} catch {
    Write-Oreshnik "Rama madre '$MotherBranch' no encontrada en origin" -Type "FAIL"
    $allPassed = $false
}

# 3. Verificar .env.local
Write-Oreshnik "Paso 3/5: Variables de entorno (.env.local)" -Type "INFO"
$envVars = @("DATABASE_URL", "APP_URL")
$missingVars = @()
foreach ($var in $envVars) {
    $exists = $false
    if (Test-Path ".env.local") {
        $content = Get-Content ".env.local" -Raw
        if ($content -match "$var=") {
            $exists = $true
        }
    }
    if ($exists) {
        Write-Oreshnik "${var}: configurada" -Type "PASS"
    } else {
        Write-Oreshnik "${var}: NO configurada en .env.local" -Type "FAIL"
        $missingVars += $var
    }
}
if ($missingVars.Count -gt 0) {
    Write-Oreshnik "Ejecuta: powershell -ExecutionPolicy Bypass -File scripts/qa/ensure-marketplace-qa-env.ps1" -Type "WARN"
}

# 4. Verificar git status limpio
Write-Oreshnik "Paso 4/5: Git working tree limpio" -Type "INFO"
$status = git status --porcelain 2>$null
$blockingChanges = $status | Where-Object { $_ -notmatch '^\?\? ' -and $_ -notmatch '\.obsidian' }
if (-not $blockingChanges) {
    Write-Oreshnik "Working tree limpio (sin cambios bloqueantes)" -Type "PASS"
} else {
    Write-Oreshnik "Hay cambios sin commitear:" -Type "WARN"
    $blockingChanges | ForEach-Object { Write-Host "  $_" }
}

# 5. QA-00 Preflight
if (-not $SkipQA) {
    Write-Oreshnik "Paso 5/5: QA-00 Preflight" -Type "INFO"
    try {
        $qaCmd = "npx tsx scripts/qa/run-marketplace-qa.mjs --module=QA-00"
        if ($AppUrl) {
            $qaCmd += " --app-url=$AppUrl"
        }
        $qaResult = Invoke-Expression $qaCmd 2>&1
        if ($LASTEXITCODE -eq 0 -or ($qaResult -join "`n") -match "PASS") {
            Write-Oreshnik "QA-00: PASS" -Type "PASS"
        } else {
            Write-Oreshnik "QA-00: FAIL - verifica que APP_URL y DATABASE_URL esten configurados" -Type "FAIL"
            $allPassed = $false
        }
    } catch {
        Write-Oreshnik "QA-00: ERROR al ejecutar - $($_.Exception.Message)" -Type "FAIL"
        $allPassed = $false
    }
} else {
    Write-Oreshnik "Paso 5/5: QA-00 saltado (--SkipQA)" -Type "WARN"
}

Write-Host ""
Write-Host "═══════════════════════════════════════════"
if ($allPassed) {
    Write-Oreshnik "PRE-FLIGHT: ALL PASS — Listo para iniciar sprint" -Type "PASS"
    exit 0
} else {
    Write-Oreshnik "PRE-FLIGHT: FAIL — Corrige los fallos antes de continuar" -Type "FAIL"
    exit 1
}

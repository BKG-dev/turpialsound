<#
.SYNOPSIS
    Oreshnik Sprint Scaffold — Crea la estructura completa para iniciar un sprint.
.DESCRIPTION
    Dado un ID de sprint y operador, crea la rama desde madre, ejecuta pre-flight,
    zone-check, y prepara el entorno. TODO en un solo comando.
.PARAMETER SprintId
    ID del sprint (ej. "S15", "S-JB-01", "S-MK-02").
.PARAMETER Operator
    "Jean" o "Manuel".
.PARAMETER MotherBranch
    Rama madre desde donde crear la rama del sprint.
.PARAMETER AppUrl
    URL de la app (preview Vercel) para QA-00.
.EXAMPLE
    ./scaffold-sprint.ps1 -SprintId S15 -Operator Manuel
    ./scaffold-sprint.ps1 -SprintId S-JB-01 -Operator Jean
.NOTES
    Crea la rama con formato: {Operator}/{sprint-slug}-{fecha}
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$SprintId,
    [Parameter(Mandatory=$true)]
    [ValidateSet("Jean", "Manuel")]
    [string]$Operator,
    [string]$MotherBranch = "integration/today-reservas-marketplace-stable-2026-05-07",
    [string]$AppUrl
)

$ErrorActionPreference = "Continue"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Oreshnik {
    param([string]$Message, [string]$Type = "INFO")
    $prefix = switch ($Type) {
        "PASS"  { "[ORESHNIK] [PASS]" }
        "FAIL"  { "[ORESHNIK] [FAIL]" }
        "WARN"  { "[ORESHNIK] [WARN]" }
        "STEP"  { "[ORESHNIK] [STEP]" }
        default { "[ORESHNIK] [INFO]" }
    }
    Write-Host "$prefix $Message"
}

$date = Get-Date -Format "yyyy-MM-dd"
$slug = $SprintId.ToLower() -replace '[^a-z0-9-]', '-'
$branchName = "$Operator/$slug-$date"

Write-Host ""
Write-Host "═══════════════════════════════════════════"
Write-Host "  ORESHNIK SCAFFOLD — $SprintId"
Write-Host "  Operador: $Operator"
Write-Host "  Rama: $branchName"
Write-Host "═══════════════════════════════════════════"
Write-Host ""

# Paso 1: Pre-flight
Write-Oreshnik "Paso 1/6: Pre-flight check" -Type "STEP"
$preflightArgs = @("-File", "$scriptDir\preflight-check.ps1")
if ($AppUrl) { $preflightArgs += "-AppUrl", $AppUrl }
$preflightResult = & powershell @preflightArgs 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Oreshnik "Pre-flight fallo. Corrige los errores antes de continuar." -Type "FAIL"
    Write-Host $preflightResult
    exit 1
}

# Paso 2: Fetch y checkout madre
Write-Oreshnik "Paso 2/6: Fetch y checkout rama madre" -Type "STEP"
git fetch origin --prune --quiet
git checkout "origin/$MotherBranch" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Oreshnik "No se pudo hacer checkout de origin/$MotherBranch" -Type "FAIL"
    exit 1
}
Write-Oreshnik "Checkout: origin/$MotherBranch OK" -Type "PASS"

# Paso 3: Crear rama
Write-Oreshnik "Paso 3/6: Crear rama '$branchName'" -Type "STEP"
$existingBranch = git branch --list $branchName 2>$null
if ($existingBranch) {
    Write-Oreshnik "La rama '$branchName' ya existe localmente." -Type "WARN"
    $continue = Read-Host "  ¿Checkout a rama existente? (s/N)"
    if ($continue -ne "s") {
        Write-Oreshnik "Abortado por el usuario." -Type "FAIL"
        exit 1
    }
    git checkout $branchName
} else {
    git checkout -b $branchName
    if ($LASTEXITCODE -ne 0) {
        Write-Oreshnik "No se pudo crear la rama '$branchName'" -Type "FAIL"
        exit 1
    }
}
Write-Oreshnik "Rama creada: $branchName" -Type "PASS"

# Paso 4: Zone check
Write-Oreshnik "Paso 4/6: Zone check (deteccion de colisiones)" -Type "STEP"
$zoneResult = & powershell -File "$scriptDir\zone-check.ps1" -SprintId $SprintId -Branch $branchName 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Oreshnik "Zone check detecto colisiones. Revisa antes de continuar." -Type "FAIL"
    Write-Host $zoneResult
    $continue = Read-Host "  ¿Continuar a pesar de las colisiones? (s/N)"
    if ($continue -ne "s") {
        Write-Oreshnik "Abortado por el usuario." -Type "FAIL"
        exit 1
    }
} else {
    Write-Oreshnik "Zone check: sin colisiones" -Type "PASS"
}

# Paso 5: Crear worktree (opcional)
Write-Oreshnik "Paso 5/6: Worktree (opcional)" -Type "STEP"
$createWorktree = Read-Host "  ¿Crear worktree dedicado? (s/N)"
if ($createWorktree -eq "s") {
    $worktreePath = "..\worktree-$slug-$date"
    $existingWorktree = git worktree list | Where-Object { $_ -match $worktreePath }
    if ($existingWorktree) {
        Write-Oreshnik "Worktree ya existe: $worktreePath" -Type "WARN"
    } else {
        git worktree add $worktreePath $branchName
        if ($LASTEXITCODE -eq 0) {
            Write-Oreshnik "Worktree creado: $worktreePath" -Type "PASS"
        }
    }
}

# Paso 6: Resumen
Write-Host ""
Write-Host "═══════════════════════════════════════════"
Write-Host "  SCAFFOLD COMPLETO"
Write-Host "═══════════════════════════════════════════"
Write-Host ""
Write-Host "  Sprint:    $SprintId"
Write-Host "  Operador:  $Operator"
Write-Host "  Rama:      $branchName"
Write-Host "  desde:     $MotherBranch"
Write-Host "  Worktree:  $worktreePath (si aplica)"
Write-Host ""
Write-Oreshnik "Listo para iniciar el sprint. Ejecuta tu agente Kilo." -Type "PASS"

<#
.SYNOPSIS
    Oreshnik Runner v1.0 — Orquestador central de sprints Turpial Sound.
.DESCRIPTION
    Comandos: scaffold, align, status, close, cleanup.
    Metodologia Oreshnik + Bus de Control Nivel 2.5.
#>

param(
    [Parameter(Position=0)]
    [ValidateSet("scaffold", "align", "status", "close", "cleanup")]
    [string]$Command,
    [string]$SprintId,
    [ValidateSet("Jean", "Manuel")]
    [string]$Operator,
    [string]$AppUrl,
    [string]$MotherBranch = "integration/today-reservas-marketplace-stable-2026-05-07"
)

$ErrorActionPreference = "Continue"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Info  { Write-Host "[ORESHNIK] [INFO] $args" }
function Write-Pass  { Write-Host "[ORESHNIK] [PASS] $args" }
function Write-Fail  { Write-Host "[ORESHNIK] [FAIL] $args" }
function Write-Warn  { Write-Host "[ORESHNIK] [WARN] $args" }
function Write-Step  { Write-Host "[ORESHNIK] [STEP] $args" }

Write-Host ""
Write-Host "=============================================="
Write-Host "  ORESHNIK RUNNER v1.0"
Write-Host "  Turpial Sound - Bus de Control Nivel 2.5"
Write-Host "=============================================="
Write-Host ""

if (-not $Command) {
    Write-Host "Uso: ./oreshnik.ps1 {comando} [opciones]"
    Write-Host ""
    Write-Host "Comandos:"
    Write-Host "  scaffold  - Crear rama, pre-flight, zone-check, worktree"
    Write-Host "  align     - Verificar precondiciones (solo lectura)"
    Write-Host "  status    - Mostrar estado actual de sprints"
    Write-Host "  close     - Cerrar sprint: checklist, docs, notificacion"
    Write-Host "  cleanup   - Eliminar worktrees obsoletos"
    Write-Host ""
    Write-Host "Ejemplos:"
    Write-Host "  oreshnik.ps1 scaffold -SprintId S15 -Operator Manuel"
    Write-Host "  oreshnik.ps1 align -SprintId S-JB-01"
    Write-Host "  oreshnik.ps1 status"
    Write-Host "  oreshnik.ps1 close -SprintId S15"
    Write-Host "  oreshnik.ps1 cleanup"
    exit 0
}

switch ($Command) {
    "scaffold" {
        if (-not $SprintId -or -not $Operator) {
            Write-Fail "scaffold requiere -SprintId y -Operator"
            exit 1
        }
        $sArgs = @("-File", "$scriptDir\scaffold-sprint.ps1", "-SprintId", $SprintId, "-Operator", $Operator)
        if ($AppUrl) { $sArgs += "-AppUrl", $AppUrl }
        & powershell @sArgs
        exit $LASTEXITCODE
    }

    "align" {
        if (-not $SprintId) {
            Write-Fail "align requiere -SprintId"
            exit 1
        }
        Write-Step "ALIGN: Verificando precondiciones para $SprintId (solo lectura)"
        & powershell -File "$scriptDir\preflight-check.ps1"
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Pre-flight fallo."
            exit 1
        }
        & powershell -File "$scriptDir\zone-check.ps1" -SprintId $SprintId
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Zone check fallo. Colisiones detectadas."
            exit 1
        }
        Write-Pass "ALIGN $SprintId : READY - El sprint es ejecutable."
        exit 0
    }

    "status" {
        Write-Step "STATUS: Estado actual del proyecto"
        Write-Host ""
        $currentBranch = git branch --show-current 2>$null
        Write-Host "  Rama actual:       $currentBranch"
        $mc = git rev-parse --short "origin/$MotherBranch" 2>$null
        Write-Host "  Rama madre:        $MotherBranch @ $mc"
        Write-Host ""
        Write-Host "  Worktrees activos:"
        git worktree list 2>$null | ForEach-Object { Write-Host "    $_" }
        Write-Host ""
        Write-Host "  Tags recientes:"
        $tags = git tag --sort=-creatordate 2>$null
        if ($tags) {
            $tags | Select-Object -First 5 | ForEach-Object { Write-Host "    $_" }
        }
        Write-Host ""
        Write-Host "  Docs canonicos:"
        Write-Host "    00_CENTRAL_TURPIAL.md"
        Write-Host "    INSTRUCCION_APERTURA_SESION.md"
        Write-Host "    METODOLOGIA_ORESHNIK_ANEXO.md"
        Write-Host "    PLAN_MAESTRO_SPRINTS_2026-05-12.md"
        $zPath = Join-Path $scriptDir "..\..\docs\07_handoffs\zone-map.json"
        if (Test-Path $zPath) {
            $zCount = (Get-Content $zPath -Raw | ConvertFrom-Json).zones.PSObject.Properties.Count
            Write-Host "    zone-map.json ($zCount zonas)"
        }
        Write-Host ""
        Write-Host "  Verificar deploys Vercel:  npx vercel list"
        exit 0
    }

    "close" {
        if (-not $SprintId) {
            Write-Fail "close requiere -SprintId"
            exit 1
        }
        Write-Step "CLOSE: Cerrando sprint $SprintId"
        Write-Host ""
        Write-Host "  Checklist de cierre para $SprintId :"
        Write-Host "  [ ] git diff --check = OK"
        Write-Host "  [ ] npx tsc --noEmit = OK"
        Write-Host "  [ ] pnpm build = OK"
        Write-Host "  [ ] QA modules = PASS"
        Write-Host "  [ ] No .env en diff"
        Write-Host "  [ ] No /reservas (si aplica)"
        Write-Host "  [ ] Commits con prefijo"
        Write-Host ""
        $confirm = Read-Host "  Checklist completado? (s/N)"
        if ($confirm -ne "s") {
            Write-Warn "Cierre cancelado. Completa el checklist y reintenta."
            exit 0
        }
        Write-Host ""
        Write-Info "Actualiza manualmente:"
        Write-Host "  1. 00_CENTRAL_TURPIAL.md - cambiar estado a CERRADO"
        Write-Host "  2. PLAN_MAESTRO_SPRINTS - actualizar track"
        Write-Host "  3. git add + git commit + git push"
        Write-Host "  4. Notificar al otro operador"
        Write-Host ""
        Write-Info "Despues del cierre manual, Jean hace merge gate a madre."
        exit 0
    }

    "cleanup" {
        Write-Step "CLEANUP: Buscando worktrees obsoletos"
        $wtOutput = git worktree list 2>$null
        $currentBranch = git branch --show-current
        foreach ($line in $wtOutput) {
            $parts = $line -split '\s+'
            if ($parts.Count -ge 3) {
                $wtPath = $parts[0]
                $wtBranch = $parts[-1].Trim('[]')
                if ($wtBranch -eq $currentBranch) { continue }
                if ($wtPath -eq (git rev-parse --show-toplevel)) { continue }
                $isMerged = git branch -r --merged "origin/$MotherBranch" 2>$null | Select-String $wtBranch
                if ($isMerged) {
                    Write-Warn "Worktree obsoleto: $wtPath ($wtBranch) - mergeado a madre"
                    $remove = Read-Host "  Eliminar? (s/N)"
                    if ($remove -eq "s") {
                        git worktree remove $wtPath --force 2>$null
                        Write-Pass "Eliminado: $wtPath"
                    }
                }
            }
        }
        exit 0
    }
}

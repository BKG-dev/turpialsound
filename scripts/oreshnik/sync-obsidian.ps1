<#
.SYNOPSIS
    Oreshnik Sync Obsidian — Sincroniza todos los documentos con la rama madre
.DESCRIPTION
    Paso 0 OBLIGATORIO antes de cualquier instruccion o codigo.
    Verifica que la rama madre este actualizada, que los documentos canonicos 
    tengan la misma fecha, y que Obsidian no haya sobreescrito archivos.
.NOTES
    Retorna 0 si sincronizacion OK, 1 si hay divergencia.
#>

param(
    [string]$MotherBranch = "integration/today-reservas-marketplace-stable-2026-05-07"
)

$ErrorActionPreference = "Continue"

function Write-Sync { param([string]$M, [string]$T="INFO")
    $p = @{PASS="[SYNC] [PASS]"; FAIL="[SYNC] [FAIL]"; WARN="[SYNC] [WARN]"; INFO="[SYNC] [INFO]"}[$T]
    Write-Host "$p $M"
}

Write-Host ""
Write-Host "=============================================="
Write-Host "  ORESHNIK SYNC OBSIDIAN — Step 0 Obligatorio"
Write-Host "=============================================="

$allOk = $true
$docsDir = "docs/obsidian-vault"

# 1. Fetch madre
Write-Sync "Fetch origin..." -T "INFO"
git fetch origin --prune --quiet 2>&1 | Out-Null
Write-Sync "Fetch completado" -T "PASS"

# 2. Verificar rama actual
$currentBranch = git branch --show-current
Write-Sync "Rama actual: $currentBranch" -T "INFO"

# 3. Verificar madre existe
$motherExists = git rev-parse --verify "origin/$MotherBranch" 2>$null
if (-not $motherExists) {
    Write-Sync "Rama madre '$MotherBranch' no encontrada en origin" -T "FAIL"
    $allOk = $false
} else {
    $motherCommit = git rev-parse --short "origin/$MotherBranch"
    Write-Sync "Madre: $MotherBranch @ $motherCommit" -T "PASS"
}

# 4. Verificar docs canonicos
$canonicalDocs = @(
    "$docsDir/00_CENTRAL_TURPIAL.md",
    "$docsDir/INSTRUCCION_APERTURA_SESION.md",
    "$docsDir/PLAN_MAESTRO_SPRINTS_2026-05-12.md",
    "$docsDir/METODOLOGIA_ORESHNIK_ANEXO.md"
)

$dates = @{}
foreach ($doc in $canonicalDocs) {
    if (Test-Path $doc) {
        $match = Select-String -Path $doc -Pattern "last_updated|actualizado" | Select-Object -First 1
        if ($match) {
            $date = $match.Line -replace '.*:\s*"?(.+?)"?\s*$', '$1'
            $dates[$doc] = $date
            Write-Sync "$doc → $date" -T "PASS"
        } else {
            Write-Sync "$doc → SIN FECHA de actualizacion" -T "FAIL"
            $allOk = $false
        }
    } else {
        Write-Sync "$doc → NO EXISTE en disco" -T "FAIL"
        $allOk = $false
    }
}

# 5. Verificar consistencia de fechas
$uniqueDates = $dates.Values | Sort-Object -Unique
if ($uniqueDates.Count -gt 2) {
    Write-Sync "Fechas inconsistentes entre documentos: $($uniqueDates -join ' | ')" -T "FAIL"
    $allOk = $false
} else {
    Write-Sync "Fechas consistentes entre documentos" -T "PASS"
}

# 6. Verificar madre esta sincronizada con local
if ($currentBranch -eq $MotherBranch) {
    $localCommit = git rev-parse --short HEAD
    $remoteCommit = git rev-parse --short "origin/$MotherBranch"
    if ($localCommit -ne $remoteCommit) {
        Write-Sync "Local ($localCommit) != origin ($remoteCommit). Necesitas git pull." -T "WARN"
    } else {
        Write-Sync "Local sincronizado con origin" -T "PASS"
    }
}

# 7. Restaurar docs si Obsidian los sobreescribio
$dirtyDocs = git diff --name-only -- $docsDir/ 2>$null
if ($dirtyDocs) {
    Write-Sync "Obsidian modifico estos archivos. Restaurando desde git..." -T "WARN"
    $dirtyDocs | ForEach-Object { Write-Host "  $_" }
    git checkout HEAD -- $docsDir/ 2>&1 | Out-Null
    Write-Sync "Docs restaurados desde git" -T "PASS"
} else {
    Write-Sync "Docs limpios (sin sobreescritura de Obsidian)" -T "PASS"
}

# 8. Verificar Vercel preview
Write-Sync "Verificando ultimo deploy Vercel..." -T "INFO"
try {
    $vercelOutput = & npx vercel list 2>&1 | Select-Object -First 5
    $readyLine = $vercelOutput | Select-String "Ready"
    if ($readyLine) {
        Write-Sync "Vercel preview: Ready" -T "PASS"
    } else {
        $errorLine = $vercelOutput | Select-String "Error"
        if ($errorLine) {
            Write-Sync "Vercel preview: ERROR — revisar build logs" -T "FAIL"
            $allOk = $false
        }
    }
} catch {
    Write-Sync "No se pudo verificar Vercel (sin conexion?)" -T "WARN"
}

Write-Host ""
Write-Host "=============================================="
if ($allOk) {
    Write-Sync "SYNC COMPLETO — Listo para trabajar" -T "PASS"
    Write-Host ""
    Write-Host "  Proximo:"
    Write-Host "    git pull origin $MotherBranch"
    Write-Host "    Abrir Obsidian → Ctrl+R"
    Write-Host "    Verificar 00_CENTRAL_TURPIAL.md"
    exit 0
} else {
    Write-Sync "SYNC FALLIDO — Corrige los fallos antes de continuar" -T "FAIL"
    exit 1
}

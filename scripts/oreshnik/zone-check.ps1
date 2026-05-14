<#
.SYNOPSIS
    Oreshnik Zone Check — Verifica que no hay colisiones de zona entre sprints activos.
.DESCRIPTION
    Lee docs/07_handoffs/zone-map.json, compara los archivos modificados en la rama actual
    contra las zonas definidas, y reporta si hay colisiones con otros sprints.
.PARAMETER SprintId
    ID del sprint a verificar (ej. "S15", "S-JB-01").
.PARAMETER Branch
    Rama a verificar (por defecto, la rama actual).
    Si se especifica, compara los cambios de esa rama contra la rama madre.
.EXAMPLE
    ./zone-check.ps1 -SprintId S15
    ./zone-check.ps1 -SprintId S-JB-01 -Branch Jean/s-jb-01-booking-fixes-2026-05-13
.NOTES
    Retorna 0 si es seguro continuar, 1 si hay colisiones.
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$SprintId,
    [string]$Branch,
    [string]$ZoneMapPath = "docs/07_handoffs/zone-map.json",
    [string]$MotherBranch = "integration/today-reservas-marketplace-stable-2026-05-07"
)

$ErrorActionPreference = "Stop"

function Write-Oreshnik {
    param([string]$Message, [string]$Type = "INFO")
    $prefix = switch ($Type) {
        "PASS"  { "[ORESHNIK] [PASS]" }
        "FAIL"  { "[ORESHNIK] [FAIL]" }
        "WARN"  { "[ORESHNIK] [WARN]" }
        "INFO"  { "[ORESHNIK] [INFO]" }
        default { "[ORESHNIK]" }
    }
    Write-Host "$prefix $Message"
}

# Validar que el zone-map existe
if (-not (Test-Path $ZoneMapPath)) {
    Write-Oreshnik "zone-map.json no encontrado en $ZoneMapPath. Ejecuta scaffold primero." -Type "FAIL"
    exit 1
}

$zoneMap = Get-Content $ZoneMapPath -Raw | ConvertFrom-Json

# Determinar archivos modificados
$changedFiles = @()
if ($Branch) {
    $changedFiles = @(git diff --name-only "origin/$MotherBranch...$Branch" 2>$null | Where-Object { $_ })
    if (-not $changedFiles) {
        $changedFiles = @(git diff --name-only "origin/$MotherBranch...$Branch" 2>$null | Where-Object { $_ })
    }
} else {
    $changedFiles = @(git diff --name-only "origin/$MotherBranch...HEAD" 2>$null | Where-Object { $_ })
}

if ($changedFiles.Count -eq 0) {
    Write-Oreshnik "Sin archivos modificados. Nada que verificar." -Type "INFO"
    Write-Oreshnik "SPRINT=$SprintId | ZONE-CHECK=PASS | COLLISIONS=0" -Type "PASS"
    exit 0
}

Write-Oreshnik "Verificando $($changedFiles.Count) archivos modificados contra zone-map..." -Type "INFO"

$collisions = @()
$warnings = @()
$forbidden = @()

foreach ($file in $changedFiles) {
    $matched = $false
    foreach ($zonePattern in $zoneMap.zones.PSObject.Properties) {
        $pattern = $zonePattern.Name
        $zone = $zonePattern.Value
        
        # Simple glob matching: ** → .*
        $regex = [regex]::Escape($pattern).Replace('\*\*', '.*').Replace('\*', '[^/]*')
        
        if ($file -match $regex) {
            $matched = $true
            
            # Verificar locks
            if ($zone.lock -eq "forbidden_forever") {
                $forbidden += "[$file] ZONA PROHIBIDA: nunca commitear. ($($zone.criticality))"
            }
            elseif ($zone.lock -eq "jean_exclusive" -and $SprintId -match "^S-JB|^S19") {
                # Jean en booking — OK
            }
            elseif ($zone.lock -eq "jean_exclusive") {
                $collisions += "[$file] ${pattern}: zona exclusiva Jean. Sprint $SprintId no autorizado. LOCK=$($zone.lock)"
            }
            elseif ($zone.lock -eq "double_jean_manuel") {
                $warnings += "[$file] ${pattern}: requiere LOCK DOBLE Jean+Manuel. Sprint $SprintId. CRITICALITY=$($zone.criticality)"
            }
            elseif ($zone.sprints -contains $SprintId) {
                # Sprint autorizado en esta zona — OK
            }
            elseif ($zone.sprints -contains "*") {
                # Zona compartida — OK con advertencia
                if ($zone.criticality -eq "critical") {
                    $warnings += "[$file] ${pattern}: zona critica compartida. Coordinar con el otro operador."
                }
            }
            else {
                $collisions += "[$file] ${pattern}: sprint $SprintId NO autorizado en esta zona. Sprints autorizados: $($zone.sprints -join ', ')"
            }
            break
        }
    }
    if (-not $matched) {
        $warnings += "[$file] sin entrada en zone-map. Archivo nuevo o no catalogado."
    }
}

# Reportar resultados
if ($forbidden.Count -gt 0) {
    Write-Oreshnik "ARCHIVOS PROHIBIDOS ENCONTRADOS:" -Type "FAIL"
    $forbidden | ForEach-Object { Write-Host "  $_" }
}

if ($collisions.Count -gt 0) {
    Write-Oreshnik "COLISIONES DETECTADAS:" -Type "FAIL"
    $collisions | ForEach-Object { Write-Host "  $_" }
}

if ($warnings.Count -gt 0) {
    Write-Oreshnik "ADVERTENCIAS:" -Type "WARN"
    $warnings | ForEach-Object { Write-Host "  $_" }
}

if ($forbidden.Count -eq 0 -and $collisions.Count -eq 0) {
    Write-Oreshnik "SPRINT=$SprintId | ZONE-CHECK=PASS | COLLISIONS=0 | WARNINGS=$($warnings.Count)" -Type "PASS"
    exit 0
} else {
    Write-Oreshnik "SPRINT=$SprintId | ZONE-CHECK=FAIL | COLLISIONS=$($collisions.Count) | FORBIDDEN=$($forbidden.Count)" -Type "FAIL"
    exit 1
}

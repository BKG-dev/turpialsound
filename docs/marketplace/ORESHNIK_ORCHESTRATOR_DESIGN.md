# Oreshnik Orchestrator Design

Diseño de un orquestador local para la automatización segura de sesiones de desarrollo, priorizando la supervisión humana y la integridad del repositorio.

## 1. Estructura de Carpetas
```text
scripts/oreshnik/
├── prompts/      # Archivos de texto con prompts (.txt o .md)
├── logs/         # Logs por agente/ejecución
└── runs/         # Manifests JSON de cada ejecución
```

## 2. Formato de Archivos

### Prompt Files (`scripts/oreshnik/prompts/*.md`)
```markdown
---
id: "001-setup-env"
agent: "generalist"
---
# Prompt
[Instrucciones detalladas aquí]
```

### Run Manifest (`scripts/oreshnik/runs/YYYYMMDD-HHMM.json`)
```json
{
  "timestamp": "2026-04-29T10:00:00Z",
  "status": "pending",
  "steps": [
    { "id": "001", "status": "pending", "log": "..." }
  ]
}
```

## 3. Reglas de Seguridad (No-Fly Zones)
1. **Un solo escritor:** Solo un agente puede mutar un archivo específico a la vez.
2. **Read-Only por defecto:** Todos los agentes inician en modo lectura.
3. **Escritura Backend:** Solo `Codex` tiene permiso (bajo demanda) para modificar backend/schema.
4. **Gate Manual:** El orchestrator debe detenerse antes de cada fase de escritura o modificación de infraestructura.
5. **Human-in-the-Loop:** Prohibido realizar `git commit` o `git push` sin confirmación explícita del usuario mediante el agente orquestador.

## 4. Propuesta de PowerShell Runner (`oreshnik.ps1`)
El runner actuará como el controlador central:
- **`./oreshnik.ps1 run --file [prompt]`**: Ejecuta una secuencia.
- **`./oreshnik.ps1 status`**: Muestra estado de la ejecución activa.
- **`./oreshnik.ps1 halt`**: Detiene cualquier proceso en ejecución.

## 5. Secuencia de Siguiente Sesión
1. **Carga:** El usuario invoca `oreshnik.ps1 --init`.
2. **Validación:** El agente verifica que no existan cambios pendientes (`git status`).
3. **Ejecución:** El agente carga el prompt, solicita confirmación humana para ejecutar, y procesa paso a paso.
4. **Logging:** Todo output de shell se redirige a `scripts/oreshnik/logs/`.
5. **Checkpoint:** El agente pausa entre fases, esperando orden humana para continuar o finalizar.

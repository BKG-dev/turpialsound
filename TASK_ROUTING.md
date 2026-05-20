# TASK ROUTING — Turpial Sound

Guía para elegir el modelo correcto antes de abrir una sesión en Claude Code.

## Haiku — `--model claude-haiku-4-5-20251001`
Tareas de bajo riesgo y alcance claro:
- Editar texto, timing, colores, opacidades
- Renombrar variables o archivos
- Ajustar clases Tailwind
- Agregar/quitar un campo en un type o interface
- Copiar o mover un bloque de código existente
- Buscar dónde está algo en el código
- Generar scaffolds desde plantilla conocida

## Sonnet — modelo por defecto
Tareas que requieren criterio o múltiples archivos:
- Crear un componente nuevo con lógica propia
- Resolver un bug con causa no obvia
- Refactors que tocan más de 3 archivos
- Implementar una feature con decisiones de diseño
- TypeScript errors complejos
- Integrar dos sistemas existentes

## Opus — requiere aprobación explícita
Solo cuando Sonnet no alcanza:
- Arquitectura de sistema nueva
- Decisiones estratégicas con alto impacto
- Análisis de trade-offs complejos con múltiples variables
- Código crítico de seguridad o rendimiento donde un error es costoso

---

## Cómo abrir con Haiku
En la terminal de VS Code:
```
claude --model claude-haiku-4-5-20251001
```

## Palanca más barata: prompts cortos
Un prompt de 50 tokens vs 200 tokens = 4x el costo de input.
Antes de escribir, elimina contexto que Claude ya sabe por CLAUDE.md.

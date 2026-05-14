# /sync

Ejecuta el Paso 0 obligatorio de sincronización antes de cualquier instrucción o código.

## Qué hace

1. Fetch de la rama madre
2. Verifica que todos los documentos canónicos tienen fecha de actualización
3. Compara fechas entre documentos (deben ser consistentes)
4. Restaura archivos si Obsidian los sobreescribió
5. Verifica el último deploy de Vercel
6. Confirma que local está sincronizado con origin

## Cuándo ejecutarlo

- **Obligatorio:** Al abrir sesión, antes de cualquier instrucción
- **Obligatorio:** Después de hacer git checkout entre ramas
- **Obligatorio:** Si Obsidian estuvo abierto durante un cambio de rama
- **Recomendado:** Antes de cada push

## Comando

```powershell
powershell -ExecutionPolicy Bypass -File scripts/oreshnik/sync-obsidian.ps1
```

## Regla en AGENTS.md

```
PASO 0 OBLIGATORIO: Antes de ejecutar cualquier instrucción o código, 
ejecutar /sync. Si sync falla, no continuar hasta corregir.
```

# GEMINI TASK — Auditoría limpia del estado actual Marketplace-Pure

## Modelo disponible

Gemini 2.5 Flash Lite.

Trabajas como agente principal temporal porque Codex no está disponible por límite.

Esta primera pasada es solo de auditoría. No modifiques archivos.

## Contexto operativo

Proyecto: Turpial Sound Marketplace  
Rama esperada: `Marketplace-Pure`

Estado reportado por el usuario:

- asistente IA público implementado pero sin commit;
- falta microcorrección para evitar respuestas truncadas/incompletas;
- falta revisar KB musical/filtros;
- después vendrá validación y commit, pero todavía no.

Existe documentación histórica con pendientes mobile P0, flujo admin, finanzas, tasas, P&L y QA.  
No asumas que esos frentes son el trabajo actual. Primero confirma el estado real del working tree.

## Reglas estrictas

No modificar archivos.  
No hacer commit.  
No hacer push.  
No hacer stash.  
No correr build todavía.  
No ejecutar scripts QA.  
No usar Playwright.  
No tocar producción.

Prohibido tocar o modificar:

- `main`
- producción
- booking
- `/reservas`
- schema
- Prisma
- migrations
- DB
- tasas de cambio
- pagos
- payouts
- `paymentProofUrl`
- proxy SUPER
- storage sensible
- Cron T+7
- pasarelas
- lógica financiera
- refactors amplios

Si detectas que algo requiere tocar una zona prohibida, detente y repórtalo.

## Objetivo

Determinar exactamente:

1. en qué rama estamos;
2. qué archivos están modificados;
3. si el working tree actual corresponde al asistente IA público, mobile P0, ambos u otra cosa;
4. dónde vive el asistente IA público;
5. dónde puede estar ocurriendo el truncamiento;
6. si existe KB musical/filtros;
7. qué microfix sería seguro aplicar en el siguiente paso.

## Comandos permitidos

Ejecuta:

```bash
git branch --show-current
git status --short --untracked-files=all
git diff --check
git diff --name-only
git diff --stat
git log --oneline -8
```

Luego busca archivos relacionados con el asistente IA público:

```bash
rg "assistant|asistente|ai-chat|ai|chat|quick|quick reply|knowledge|kb|filtro|filter|musical|instrumento|instrument|marketplace" app components lib actions content -S
```

Luego busca si hay cambios mobile P0 mezclados:

```bash
rg "navbar|hamburger|mobile|Quiero comprar|Quiero vender|upload|fallback|Pago fiduciario protegido|textarea" app components lib actions content -S
```

Después revisa únicamente los diffs de los archivos modificados actuales.

No hagas auditoría infinita.  
No cambies archivos.

## Preguntas que debes responder

### Git

- ¿Cuál es la rama actual?
- Si la rama NO es `Marketplace-Pure`, detente y advierte.
- ¿Qué archivos están modificados?
- ¿Qué archivos no trackeados existen?
- ¿`git diff --check` está limpio?
- ¿Cuál es el último commit local?

### Clasificación del working tree

Clasifica los cambios actuales como:

A. asistente IA público  
B. mobile P0  
C. ambos  
D. otra cosa  
E. mezcla riesgosa

Explica brevemente por qué.

### Asistente IA público

Identifica archivos candidatos exactos:

- API route o server action;
- componente frontend;
- prompt interno;
- quick replies;
- KB musical;
- filtros;
- helpers.

### Truncamiento

Indica dónde parece originarse el problema:

- prompt interno demasiado corto;
- límite de tokens;
- límite de caracteres;
- respuesta cortada en API;
- frontend cortando visualmente;
- CSS con `overflow`, `line-clamp`, altura fija o scroll mal aplicado;
- KB incompleta;
- filtros pobres;
- otro.

### KB musical/filtros

Responde:

- ¿Existe KB musical?
- ¿Dónde está?
- ¿Qué información contiene?
- ¿Existen filtros?
- ¿Dónde están?
- ¿Qué falta para que el asistente responda mejor sin inventar?

### Microfix propuesto

Propón un microfix seguro en máximo 7 bullets.

Debe cumplir:

- quirúrgico;
- sin tocar zonas prohibidas;
- sin cambiar arquitectura general;
- sin tocar pagos/tasas/schema;
- sin afectar booking ni `/reservas`;
- sin inventar datos operativos;
- orientado a respuestas más completas y útiles.

### Archivos que tocarías

Lista exacta de archivos que tocarías en el siguiente paso si el usuario autoriza.

### Riesgo

Clasifica el riesgo:

- bajo;
- medio;
- alto.

Explica en 2-4 líneas.

## Reporte final obligatorio

Entrega el reporte en este formato:

```markdown
# Reporte Gemini — Auditoría IA pública Marketplace-Pure

## 1. Rama actual

## 2. Estado Git

## 3. Archivos modificados

## 4. Archivos no trackeados

## 5. Resultado git diff --check

## 6. Últimos commits

## 7. Clasificación del working tree
A/B/C/D/E:

## 8. Archivos candidatos del asistente IA público

## 9. Posible origen del truncamiento

## 10. KB musical/filtros encontrados

## 11. Mobile P0 detectado o no detectado

## 12. Microfix propuesto

## 13. Archivos que tocaría si se autoriza

## 14. Riesgo

## 15. Recomendación
Proceder con microfix / QA visual primero / detenerse.
```

## Condición de parada

Detente y reporta si:

- no estás en `Marketplace-Pure`;
- hay cambios fuera de marketplace que no entiendes;
- hay archivos de booking o `/reservas` modificados;
- el fix requiere schema, Prisma, DB, pagos, tasas, storage sensible o producción;
- el working tree parece mezclado con otra tarea;
- no puedes identificar dónde vive el asistente IA público.

No modifiques nada en esta pasada.

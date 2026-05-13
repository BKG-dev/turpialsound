---
type: accion-inmediata
prioridad: "🔴 P1 — BLOQUEA AVANCE"
para: Jean Arteaga
de: Manuel Vera
fecha: 2026-05-13
tags: ["#accion", "#P1", "#vercel", "#bloqueante"]
---

# 🔴 JEAN — ACCIÓN INMEDIATA P1: Vercel Previews por Sprint

> **Si no haces esto, no podemos avanzar con sprints paralelos. Cada sprint pisa al otro en el preview compartido.**

## ¿Qué hay que hacer?

Configurar Vercel para que cada rama de sprint tenga su propio preview automático.

## ¿Por qué es urgente?

Manuel ya cerró S12, S13, S14B y BCV scheduler. Mañana arranca S15 y S14. Si ambos pushean al mismo preview compartido, sus cambios se sobrescriben. Con previews individuales por rama, cada sprint se valida visualmente en su propia URL sin bloquear al otro.

## Paso a paso (5 minutos)

### 1. Entrar a Vercel Dashboard

Abrí: https://vercel.com/BKG-dev/turpialsound/settings/git

### 2. Configurar Branch Deploys

En la sección **Git → Deploy Hooks & Branch Deploys**:

| Campo | Valor actual (probable) | Cambiar a |
|-------|------------------------|-----------|
| **Production Branch** | `main` | `integration/today-reservas-marketplace-stable-2026-05-07` |
| **Branch deploys** | desactivado o `main only` | **activar para todas las ramas** |

Si Vercel pide un patrón regex, usar: `(Manuel|Jean)/.*`

### 3. Verificar Environment Variables

Ir a: https://vercel.com/BKG-dev/turpialsound/settings/environment-variables

Verificar que TODAS las variables necesarias están marcadas para los 3 entornos:

- ☑️ Production
- ☑️ Preview  
- ☑️ Development

**Variables críticas que deben estar en los 3 entornos:**
- `DATABASE_URL`
- `DIRECT_URL`
- `CRON_SECRET`
- `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`
- `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD`
- `QA_ADMIN_IDENTIFIER`, `QA_ADMIN_PASSWORD`

Si alguna solo tiene ☑️ Production, marcá también Preview.

### 4. Listo

Cuando termines, avisame por WhatsApp. Yo creo una rama de prueba y verifico que Vercel le asigna un preview único.

---

## Resultado esperado

```
Rama madre:  https://turpialsound-xxxx.vercel.app
S12 Manuel:  https://turpialsound-abc123-manuel.vercel.app
S13 Manuel:  https://turpialsound-def456-manuel.vercel.app
S-JB-01:     https://turpialsound-ghi789-jean.vercel.app
```

Cada sprint con su preview aislado. Sin colisiones. Sin bloqueos.

---

> **⚠️ Sin esto completado, los sprints S15, S14 y S-JB-01 no pueden avanzar en paralelo. Es el lock principal del proyecto ahora.**

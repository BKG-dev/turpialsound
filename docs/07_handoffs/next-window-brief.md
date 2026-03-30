# Next Window Brief — Turpial Sound
**Fecha de sesión:** 2026-03-30
**Próxima sesión:** 2026-03-31
**Modelo recomendado:** Sonnet 4.6 (construcción) / Opus 4.6 (decisiones arquitectónicas)

---

## 0. Instrucción de arranque (copiar literalmente al abrir)

```
Lee CLAUDE.md y este archivo. NO cargues ningún otro archivo hasta que yo lo pida.
Estado del proyecto: Fase 5 en producción. Hoy trabajamos sobre HeroSection y el sistema de logo 3D.
Arranca resumiendo los 3 pendientes críticos de este brief, luego espera mi instrucción.
```

---

## 1. Estado al cierre de sesión 2026-03-30

### Completado hoy
| Componente | Estado |
|---|---|
| `components/media/LogoGlb.tsx` | ✅ Logo 3D giratorio con halo dinámico, drag, metallic material |
| `components/layout/AnimatedLogo.tsx` | ✅ Logo 3D reemplaza SVG en navbar |
| `components/layout/SiteFooter.tsx` | ✅ Logo 3D en footer, posicionado y escalado |
| `components/media/AudioVisualizerFrequency.tsx` | ✅ Nuevo visualizador Winamp-style 128 barras FFT |
| `components/home/HeroSection.tsx` | ✅ Reemplazado AudioVisualizerPlasma → Frequency, layout fix |

### Build status
- `npx tsc --noEmit` **pendiente de correr** — primera acción de mañana
- El nuevo `AudioVisualizerFrequency` tiene fix aplicado (bug `ctx.fill()` en barras vacías)
- `AudioVisualizerPlasma.tsx` sigue existiendo (no borrado — puede reutilizarse)

### Archivos tocados hoy
```
components/media/LogoGlb.tsx
components/media/AudioVisualizerFrequency.tsx  ← nuevo
components/layout/AnimatedLogo.tsx
components/layout/SiteFooter.tsx
components/home/HeroSection.tsx
```

---

## 2. Prioridades para mañana (ordenadas por impacto)

### PRIORIDAD 1 — Validación técnica (hacer PRIMERO)
- [ ] `npx tsc --noEmit` — confirmar build limpio
- [ ] Verificar visualmente `AudioVisualizerFrequency` en el browser (barras, colores, rotación, idle state)
- [ ] Verificar logo 3D en navbar y footer en mobile (riesgo: dos Canvas WebGL simultáneos)
- [ ] Confirmar que el hero no tiene "aire" en la carga inicial

### PRIORIDAD 2 — Performance del Hero (riesgo alto según Opus)
El hero carga simultáneamente: video + ParticleCanvas + AudioVisualizerFrequency + Framer Motion por caracter.

**Acciones:**
- [ ] Detectar `prefers-reduced-motion` en el opacity loop del heading (actualmente lo ignora)
- [ ] Evaluar `ParticleCanvas` lazy via IntersectionObserver
- [ ] Test en mobile real o DevTools throttling (CPU 4x slowdown)

### PRIORIDAD 3 — Deuda documental (Gates 3 y 4 abiertos)
Faltan entregables bloqueantes según evaluación Opus:
- [ ] `docs/04_design/design-principles.md`
- [ ] `docs/04_design/component-inventory.md`
- [ ] `docs/04_design/layout-rules.md`
- [ ] `docs/05_technical/seo-aeo-implementation.md`
- [ ] Crear `docs/06_delivery/` con `qa-log.md` y `launch-checklist.md`

### PRIORIDAD 4 — globals.css (~385 líneas, creciendo)
- [ ] Extraer estilos de botones (`btn-silky-primary`, etc.) hacia `Button.tsx`
- [ ] Extraer animaciones de acento hacia módulos específicos
- [ ] Alinear con regla 5.5 del CLAUDE.md

### PRIORIDAD 5 — Páginas y tareas diferidas
- [ ] Revisar que páginas de servicios tienen contenido real (no placeholders)
- [ ] **TAREA 5 diferida**: WhatsApp button — necesita número real con código de país y mensaje predeterminado

---

## 3. Decisiones cerradas — NO reabrir

| Decisión | Estado |
|---|---|
| Stack: Next.js + TS + Tailwind | Cerrado |
| Logo 3D con R3F sin drei (moduleResolution bundler) | Cerrado |
| `useLoader` → imperativo `GLTFLoader.load()` | Cerrado |
| Material metálico: `metalness: 0.65, roughness: 0.12` | Cerrado |
| Halo dinámico: 4 luces orbitales sin geometría visible | Cerrado |
| Navbar pill: `top-3 left-6 right-6 h-14 rounded-2xl` | Cerrado |
| AudioVisualizerFrequency reemplaza AudioVisualizerPlasma | Cerrado |
| Logo color negro → `#666666` (contraste sobre fondo oscuro) | Cerrado |
| Rotación logo: sentido antihorario, 0.3 rad/s | Cerrado |

---

## 4. Riesgos abiertos

| Riesgo | Severidad | Acción |
|---|---|---|
| `AudioVisualizerFrequency` no testeado con audio real | Alta | Primera verificación mañana |
| Dos Canvas WebGL simultáneos (navbar + footer) | Media | Test mobile |
| WebGL Context Lost en hot reload | Media | Monitorear en producción |
| Opacity loop sin `prefers-reduced-motion` | Baja-Media | Fix en PRIORIDAD 2 |

---

## 5. Estrategia de ahorro de tokens sin perder calidad

### Regla de oro
> **Contexto activo = solo lo que se toca en esta sesión.**
> Nunca cargar archivos "por si acaso". Leer solo cuando se va a editar.

### Protocolo de arranque (ahorra ~30% de tokens)
1. Cargar solo CLAUDE.md + este brief
2. Resumir los 3 pendientes críticos
3. Esperar instrucción antes de leer cualquier archivo
4. Leer archivos únicamente cuando hay una tarea concreta sobre ellos

### Tabla de modelos por tarea

| Tarea | Modelo |
|---|---|
| Implementar componentes desde brief cerrado | **Sonnet** |
| Bugfixes y ajustes menores | **Sonnet** |
| Decisiones de arquitectura o stack | **Opus** |
| Evaluaciones estratégicas del proyecto | **Opus** |
| Renombrados, scaffolding, limpieza mecánica | **Haiku** |
| Redacción de documentos `.md` | **Sonnet** |

### Técnicas específicas

**1. Tareas dirigidas, no abiertas**
❌ `"revisa todo el proyecto y mejora lo que veas"`
✅ `"lee solo HeroSection.tsx y arregla el opacity loop para prefers-reduced-motion"`

**2. Leer solo el rango necesario**
Si el bug está entre líneas 50–80: usar `offset: 50, limit: 40` en lugar del archivo completo.

**3. Agentes en background para exploración**
Búsquedas amplias → `subagent_type: Explore` en background.
El contexto principal sigue libre para recibir instrucciones.

**4. No explicar lo que el diff muestra**
Si el cambio es visible en el código, no hace falta describirlo.
Solo notificar: blockers, decisiones no obvias, riesgos.

**5. Batching de tool calls paralelas**
Dos lecturas independientes → mismo mensaje, llamadas paralelas.

**6. No recargar contexto de decisiones cerradas**
La tabla de la sección 3 evita que el modelo reconsidere lo ya decidido.

**7. Compactar al final de cada fase**
Este documento unificado es suficiente. No hace falta mantener simultáneamente `session-summary-active.md` + `compact-history.md` + `next-window-brief.md`.

---

## 6. Primer prompt sugerido para mañana

```
Lee CLAUDE.md y docs/07_handoffs/next-window-brief.md.
Primera acción: corre npx tsc --noEmit y dame el resultado.
Luego lista los 3 pendientes críticos en una tabla y espera mi instrucción.
```

---

## 7. Checklist de cierre de sesión 2026-03-30

- [x] LogoGlb.tsx — rotación sobre centro, halo, drag, colores, escala
- [x] AnimatedLogo.tsx — logo 3D en navbar
- [x] SiteFooter.tsx — logo 3D posicionado (-translate-x-12, +15px, 368×230)
- [x] AudioVisualizerFrequency.tsx — creado, bug de fill corregido
- [x] HeroSection.tsx — visualizador reemplazado, layout fix, scroll indicator 0.15s
- [x] Evaluación Opus completada y resumida
- [x] Este brief actualizado
- [ ] `tsc --noEmit` final → **primera acción de mañana**
- [ ] Test visual en browser → **primera acción de mañana**

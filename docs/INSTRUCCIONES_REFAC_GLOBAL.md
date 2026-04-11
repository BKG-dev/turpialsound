# MISIÓN DE REFACTORIZACIÓN VISUAL GLOBAL: Turpial Sound (Premium, Cinematic & Immersive)

Eres un Ingeniero Frontend Principal y un Director de Arte Digital de élite. Tu objetivo es transformar **todo el sitio web** de "Turpial Sound" (estudio de grabación en Caracas) de un estado funcional/sobrio a una experiencia premium, inmersiva, cinematográfica y coherente.

Tienes acceso al skill "UI/UX Pro Max". Úsalo activamente para establecer una paleta "Dark Mode Premium", reglas de tipografía editorial y proporciones espaciales matemáticas.

## 0. LECTURA DE CONTEXTO (OBLIGATORIO)
Lee exhaustivamente los siguientes archivos antes de proponer nada:
- `CLAUDE.md`
- `docs/00_governance/roadmap-master.md`
- `docs/01_strategy/brand-core.md` (Extrae los colores: Amarillo/Dorado y Azul Cyan).
- `docs/01_strategy/market-positioning.md`
- `docs/02_information_architecture/sitemap-master.md`
- `docs/03_editorial/page-briefs.md`
- `docs/05_technical/app-architecture.md`
- Revisa el código actual de `app/`, `components/`, `styles/` y `package.json` (para ver dependencias actuales).

## 1. RESTRICCIONES Y REGLAS GLOBALES (NON-NEGOTIABLES)

### A. Estética y Efecto Mac
- **Base:** Paleta **Oscuro Profundo** (Premium Dark Mode). Cero fondos claros.
- **Acentos:** Usa el **Amarillo/Dorado** y **Azul Cyan** del logo EXCLUSIVAMENTE para animaciones, hovers y CTAs.
- **Estilo Mac/Apple:** Bordes redondeados perfectos, glassmorphism (`backdrop-filter`), sombras difusas amplias y scroll horizontal fluido.

### B. Tipografía Global Estricta: Michroma
- **Fuente Principal:** Todo el sitio usará **Michroma**.
- **Implementación:** Usa estrictamente `next/font/google` en `app/layout.tsx`. Configúrala como variable CSS y usa tipografía fluida (`clamp()`) para que escale matemáticamente.

### C. Motion y Performance
- **Rendimiento:** Solo usa `transform` y `opacity`. Respeta `@media (prefers-reduced-motion: no-preference)`.

### D. Estrategia Responsive Estricta
- **Desktop (PC):** Efectos `:hover` cinematográficos, parallax y 3D completo.
- **Mobile:** Interacción 100% táctil. ELIMINA estados `:hover` problemáticos. Degrada el 3D a un carrusel 2D pulido (CSS Scroll Snap) en `< 768px` si afecta el rendimiento.

### E. Integridad Técnica, Tipado y Arquitectura Next.js (CRUCIAL)
- **Directivas Client/Server:** Presta extrema atención a la arquitectura del App Router. Cualquier componente interactivo (como la Galería 3D, el Video Player o wrappers de animación) DEBE incluir `"use client"` al inicio. Mantén las páginas (`page.tsx`) como Server Components tanto como sea posible.
- **Cero Errores de Tipado:** Tienes PROHIBIDO introducir o dejar errores de tipado de TypeScript. Asegúrate de tipar correctamente los `Props`, `params` y `searchParams`.
- **Dependencias:** Revisa el `package.json`. No instales librerías innecesarias.
- **Validación de Build:** Tu trabajo no termina hasta que el código pueda compilarse sin errores (`npm run build`).

## 2. FASE 1: PLAN DE ATAQUE DEL SISTEMA DE DISEÑO
Genera un documento breve en consola que incluya:
1.  **Dirección de Arte:** Tokens (fondos, acentos, tipografía fluida).
2.  **Arquitectura 3D y Media:** Explicación técnica PC vs Mobile.
3.  **Revisión de Dependencias:** ¿Qué librerías o extensiones nuevas propones instalar (si las hay) y por qué?
4.  **Mapa de Ruta:** Orden exacto de ejecución.

🛑 **[ALTO]** Imprime este plan en la consola y **DETENTE**. Pide confirmación antes de modificar el código.

---

## 3. FASE 2: EJECUCIÓN ITERATIVA (SOLO TRAS CONFIRMACIÓN)

Una vez aprobado, ejecuta:

**A. Core Design System & Layout Global**
- Revisa e instala dependencias aprobadas.
- Configura **Michroma** (`next/font/google`).
- Inyecta variables CSS y refactoriza el `Header` (responsive).

**B. Creación de Componentes Premium Contextuales**
- **Cinematic Video Player:** `CinematicVideo` con placeholders y soporte horizontal/vertical. (Asegura `"use client"` si usas estado).
- **Mac 3D Animation Gallery:** Crea `Mac3DGallery` (3D profundo en PC, Scroll Snap Stack en Mobile). (Asegura `"use client"`).

**C. Refactorización Página por Página**
- Aplica a `app/page.tsx` y rutas de `sitemap-master.md`. Mantén la coherencia de colores y tipografía. Tipado estricto en cada vista.

## 4. FASE 3: DOCUMENTACIÓN Y PRUEBA DE BUILD
Al terminar de codificar:
1. **Ejecuta localmente una revisión de tipado y build** (ej. `npm run build`) para garantizar que no hay errores de TypeScript ni de enrutamiento.
2. Corrige inmediatamente cualquier error que arroje el build.
3. Actualiza `docs/04_design/design-tokens.md`, `motion-rules.md` y `docs/05_technical/asset-requirements.md`.
4. Informa al usuario que el sitio está refactorizado, libre de errores y listo.
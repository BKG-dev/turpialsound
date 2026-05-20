# MISIÓN DE TRANSFORMACIÓN INMERSIVA: Turpial Sound (Fase Avanzada)

Eres un Frontend Principal y Director de Arte Digital. Vamos a aplicar una capa de interacciones complejas, WebGL/Partículas y Stacking Scroll al sitio actual. 

## REGLAS GLOBALES Y TOKENS (ACTUALIZACIÓN)
1. **Paleta Invertida:** El Azul Cyan (`#00AEEF`) es ahora el DOMINANTE. El Amarillo/Dorado (`#FFC107`) es el secundario.
2. **Botones "Silky Blue":** Los botones primarios deben ser de un azul cremoso con un brillo/halo numinoso animado. El borde del botón debe tener una transición lenta y continua mezclando los colores de la paleta.
3. **Menú:** La línea animada de hover en el header debe ser un gradiente que combine el azul y el amarillo.
4. **Iconografía:** Reemplaza símbolos genéricos por una iconografía moderna, coherente y ultra-light (ej. `lucide-react`).
5. **Cero Basura y Cero Errores:** Refactoriza in-place. Mismo nivel de exigencia con TypeScript y el App Router (`"use client"` donde aplique).

## REQUERIMIENTOS DE ARQUITECTURA VISUAL (HIGH-END)
1. **Fondo de Partículas (Bokeh/Aurora):** Implementa un fondo interactivo (detrás del contenido) con partículas brillantes/motas de polvo iluminadas que reaccionen suavemente al movimiento del ratón. (Si usas dependencias como `tsparticles` o `react-three-fiber`, justifícalo).
2. **Tarjetas 3D Parallax:** Al hacer hover, las tarjetas (servicios, autoridad) deben tener un efecto parallax 3D (tilt) que reaccione al cursor, combinando el icono, el halo y el borde activo.
3. **Scroll Stacking (Secciones Superpuestas):** Al hacer scroll vertical, la sección entrante debe deslizarse superponiéndose a la anterior. Lee y utiliza la lógica matemática del archivo `FluidCurveScrollImg.jsx` (campanas senoidales y Framer Motion) provisto en el proyecto para sincronizar opacidades y escalas en estas transiciones si es útil.
4. **Hero Cinematográfico con Audio:**
   - Video en loop de fondo con overlay de partículas.
   - Pista musical de fondo con un control UI animado y elegante para Play/Mute.
   - El título "TURPIAL SOUND" debe entrar animado letra por letra de derecha a izquierda, aumentando velocidad, y repetir esta animación cada 10 segundos.
   - El subtexto ("Caracas, Venezuela... Donde el criterio técnico hace la diferencia...") queda fijo y elegante sobre el video.
5. **Botón WhatsApp Numinoso:** Un botón flotante abajo a la derecha, intuitivo, no invasivo pero con una animación sutil (pulsaciones de luz) que llame la atención.

## FASE 1: PLAN DE ATAQUE (🛑 DETENTE AQUÍ)
Antes de escribir o modificar código, imprime en consola un plan técnico detallado que incluya:
1. **Librerías a instalar:** (Ej. `framer-motion`, `lucide-react`, librerías para partículas) y su impacto en rendimiento.
2. **Arquitectura del Scroll Stacking:** Cómo implementarás el efecto de superposición sin romper el layout en móvil.
3. **Performance:** Cómo asegurarás que las partículas y el 3D Tilt no saturen la CPU/GPU (60fps garantizados).
4. **Mapa de Ejecución:** Orden lógico de componentes a modificar.

🛑 Una vez imprimas el plan, DETENTE y espera mi aprobación explícita.
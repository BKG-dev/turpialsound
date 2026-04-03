# Turpial Sound — Reglas de Layout y Arquitectura Espacial

> Estado: **Aplicado en Producción (V1)**
> Última actualización: 2026-04-01

## 1. Contenedores y Grid
* **Max-Width:** El contenedor global (`.container-base`) tiene un límite de `1200px` para asegurar la legibilidad del texto (`max-width: prose`).
* **Padding Fluido:** El espaciado lateral se adapta al viewport (`clamp(1rem, 5vw, 3rem)`), garantizando un respiro visual en todos los dispositivos.

## 2. Stacking Scroll (Secciones Superpuestas)
La navegación vertical del sitio utiliza un efecto de "Stacking".
* Las secciones entrantes se deslizan sobre la sección anterior, generando un efecto parallax de profundidad.
* En mobile, este comportamiento se degrada suavemente a un scroll tradicional si compromete el rendimiento de la GPU.

## 3. Degradación Responsiva Estricta
* **Desktop (Hover activado):** Se despliegan efectos 3D (Tilt Cards), WebGL interactivo y animaciones de cursor.
* **Mobile (Touch):** Los estados `:hover` problemáticos se anulan o se transforman en estados `:active`. El WebGL complejo se minimiza a CSS Scroll Snapping (2D) para garantizar 60fps constantes en dispositivos de gama media.
// components/FluidCurveScrollImg.jsx
"use client";

import { motion, useTransform, useSpring } from "framer-motion";
import { useEffect } from "react";

/* ============================
   Helpers matemáticos (claridad)
   ============================ */

// clamp a [0,1]
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * Remapea u∈[0,1] para que el pico ocurra en "c" pero quede centrado visualmente en 0.5 (up).
 *  - Si u<=c → comprime a [0..0.5]
 *  - Si u> c → a [0.5..1]
 */
function remapToCenteredHalf(u, c) {
  c = clamp01(c || 0.5);
  if (u <= c) return 0.5 * (u / (c || 1e-6));
  return 0.5 + 0.5 * ((u - c) / (1 - c || 1e-6));
}

/**
 * Campana senoidal:  b = sin(π·x)^k
 * - x∈[0,1], b∈[0,1], b=0 en extremos, b=1 en el centro.
 * - k (sharpness) > 1 aplana más los extremos y concentra en el centro.
 * - peakGain (>1) exagera el pico (se clampa a 1 para no pasar de 1).
 */
function bellBoosted(x, sharpness = 2.0, peakGain = 1.0) {
  const s = Math.pow(Math.sin(Math.PI * clamp01(x)), sharpness);
  return Math.min(1, s * Math.max(peakGain, 0));
}

/**
 * Ganancia (0..1) con pico en "peak" y 0 en extremos [start,end].
 */
function bellOverRange(t, start, peak, end, sharpness, peakGain) {
  if (end <= start) return 0;
  if (t <= start || t >= end) return 0;
  const u = (t - start) / (end - start);                    // normaliza a [0..1]
  const c = clamp01((peak - start) / (end - start) || 0.5); // centro relativo
  const up = remapToCenteredHalf(u, c);                     // centra visualmente
  return bellBoosted(up, sharpness, peakGain);              // 0..1
}

/* =========================================================
   FluidCurveScrollImg — Onda con campana senoidal calibrable
   =========================================================
   PERILLAS (props):
   - scrollProgress : MotionValue (useScroll) → 0..1 dentro de la sección
   - imageSrc       : PNG con transparencia de la onda
   - direction      : "down" (origen ARRIBA) | "up" (origen ABAJO)
   - inputRange     : [start, peak, end] — inicio, máximo y fin en unidades de scroll
   - minScaleY      : escala en extremos (≈ línea; usa 0.0001 para evitar artefactos)
   - maxScaleY      : escala en el centro (cuánto “abre”)
   - sharpness      : 1.2–3+ → mayor = extremos más planos y pico más concentrado
   - peakGain       : 1–2     → multiplicador del pico (exagera el centro; se clampa a 1)
   - curveHeightVh  : alto del bloque en vh
   - edgeBleedVW    : sangrado lateral por lado en vw (6–10 si ves bordes)
   - yOffsetPx      : ajuste fino vertical (px)
   - spring         : { stiffness, damping, mass } para suavizar el scroll
   - fade           : true para animar opacidad con la misma campana
   - enabled        : compuerta (SectionWave la usa para activar solo el borde correcto)
   - gateSpring     : spring de la compuerta (enabled) para transiciones suaves
   - flipY          : voltea verticalmente el PNG si algún asset quedó al revés
*/
export default function FluidCurveScrollImg({
  scrollProgress,
  imageSrc,
  direction = "down",

  // ====== Calibración tipo CommonScale (suave y elegante) ======
  inputRange = [0, 0.5, 1], // inicio-pico-fin dentro de la sección
  minScaleY = 0.0001,       // colapsada en extremos
  maxScaleY = 1.62,         // apertura en el centro (1.55–1.65)
  sharpness = 2.4,          // aplanado progresivo en extremos
  peakGain = 1.28,          // empuje extra en el centro (1.2–1.4)

  curveHeightVh = 50,       // 48–56 según gusto
  edgeBleedVW = 8,          // 6–10 si ves bordes laterales
  yOffsetPx = 0,

  spring = { stiffness: 50, damping: 10, mass: 0.2 },
  fade = false,

  enabled = true,
  gateSpring = { stiffness: 200, damping: 32, mass: 0.6 },
  flipY = false,
}) {
  // Suaviza el scroll
  const smooth = useSpring(scrollProgress, spring);

  // Compuerta: activa/desactiva sin saltos (la usa SectionWave)
  const gate = useSpring(enabled ? 1 : 0, gateSpring);
  useEffect(() => {
    gate.set(enabled ? 1 : 0);
  }, [enabled, gate]);

  /* =========================
     BLOQUE MATEMÁTICO CENTRAL
     =========================
     scaleY(t) = min + (max - min) * bellOverRange(t) * gate
     con bellOverRange(t) = sin(π·u')^sharpness * peakGain (clamp a 1).
     Resultado: extremos colapsados y pico potente en el centro.
  */
  const scaleY = useTransform([smooth, gate], ([t, g]) => {
    const [start, peak, end] = inputRange;
    const bell = bellOverRange(t, start, peak, end, sharpness, peakGain); // 0..1
    return minScaleY + (maxScaleY - minScaleY) * bell * g;
  });

  // Opacidad opcional (misma campana, multiplicada por la compuerta)
  const opacity = fade
    ? useTransform([smooth, gate], ([t, g]) => {
        const [start, peak, end] = inputRange;
        return bellOverRange(t, start, peak, end, 1.0, 1.0) * g; // opacidad más suave
      })
    : undefined;

  // === Anclajes y tamaño ===
  // "down" debe anclar ARRIBA (origin 0%, top:0)
  // "up"   debe anclar ABAJO  (origin 100%, bottom:0)
  const originY = direction === "up" ? "100%" : "0%";
  const bleed = Math.max(0, edgeBleedVW);
  const width = `calc(100vw + ${bleed * 2}vw)`;

  // Transform final: centrado + offset + escala vertical
  const transform = useTransform(
    scaleY,
    (s) => `translateX(-50%) translateY(${yOffsetPx}px) scaleY(${s})`
  );

  return (
    <motion.div
      aria-hidden
      className="absolute inset-0 pointer-events-none select-none z-0"
      style={{
        left: "50%",
        width,
        height: `${curveHeightVh}vh`,
        transformOrigin: `50% ${originY}`,
        transform,
        top: direction === "down" ? 0 : "auto",
        bottom: direction === "up" ? 0 : "auto",
        opacity,
        willChange: "transform, opacity",
      }}
    >
      <img
        src={imageSrc}
        alt=""
        draggable={false}
        className="w-full h-full object-fill pointer-events-none select-none"
        style={flipY ? { transform: "scaleY(-1)" } : undefined}
        decoding="async"
        loading="lazy"
      />
    </motion.div>
  );
}

/**
 * Bell-curve math utilities for scroll-synchronized animations.
 * Adapted from FluidCurveScrollImg.jsx (project reference).
 *
 * Core formula: b = sin(π·x)^k
 * Produces 0 at edges, 1 at center — ideal for smooth enter/exit transitions.
 */

/** Clamp x to [0, 1] */
function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/**
 * Remaps u∈[0,1] so the visual peak is centred at 0.5
 * even when the logical peak `c` is off-centre.
 */
function remapToCenteredHalf(u: number, c: number): number {
  c = clamp01(c || 0.5)
  if (u <= c) return 0.5 * (u / (c || 1e-6))
  return 0.5 + 0.5 * ((u - c) / (1 - c || 1e-6))
}

/**
 * Raw bell:  sin(π·x)^sharpness × peakGain, clamped to [0, 1].
 * Higher sharpness → flatter edges, more concentrated peak.
 */
function bellBoosted(x: number, sharpness = 2.0, peakGain = 1.0): number {
  const s = Math.pow(Math.sin(Math.PI * clamp01(x)), sharpness)
  return Math.min(1, s * Math.max(peakGain, 0))
}

/**
 * Bell gain over a scroll range.
 * Returns 0 outside [start, end], peaks at `peak`.
 *
 * @param t         Current scroll progress (0–1)
 * @param start     Range start
 * @param peak      Position of maximum value within the range
 * @param end       Range end
 * @param sharpness Shape control (default 2.4 — smooth but defined)
 * @param peakGain  Peak multiplier (default 1.28 — slight boost at centre)
 */
export function bellOverRange(
  t: number,
  start: number,
  peak: number,
  end: number,
  sharpness = 2.4,
  peakGain = 1.28,
): number {
  if (end <= start) return 0
  if (t <= start || t >= end) return 0
  const u = (t - start) / (end - start)
  const c = clamp01((peak - start) / (end - start) || 0.5)
  const up = remapToCenteredHalf(u, c)
  return bellBoosted(up, sharpness, peakGain)
}

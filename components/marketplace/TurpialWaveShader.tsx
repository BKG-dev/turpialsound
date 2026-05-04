'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`

const fragmentShader = `
precision highp float;

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform float uIntensity;
uniform float uStaticMix;

float waveCurve(float x, float phase, float amplitude, float frequency) {
  return 0.5
    + sin(x * frequency + phase) * amplitude
    + sin(x * (frequency * 0.43) - phase * 0.64) * amplitude * 0.48;
}

float gaussian(float distanceToLine, float width) {
  return exp(-(distanceToLine * distanceToLine) / (2.0 * width * width));
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float x = uv.x * mix(7.0, 5.35, step(aspect, 1.0));
  float time = mix(uTime * 0.72, 0.0, uStaticMix);

  float primary = waveCurve(x, time * 0.52, 0.108 * uIntensity, 1.22);
  float secondary = waveCurve(x * 1.04, time * 0.34 + 1.28, 0.052 * uIntensity, 1.78);
  float tertiary = waveCurve(x * 0.88, time * 0.25 + 2.15, 0.036 * uIntensity, 2.22);

  float wave = primary + (secondary - 0.5) * 0.58 + (tertiary - 0.5) * 0.36 + 0.18;
  float d = abs(uv.y - wave);

  float core = gaussian(d, 0.0032) * 0.16;
  float whiteVeil = gaussian(d, 0.014) * 0.34;
  float cyanInner = gaussian(d, 0.032) * 0.48;
  float cyanOuter = gaussian(d, 0.095) * 0.34;
  float cyanMist = gaussian(d, 0.185) * 0.16;

  float goldWave = wave + sin((uv.x * 6.2831) + time * 0.55) * 0.018 - 0.026;
  float goldD = abs(uv.y - goldWave);
  float goldAccent = gaussian(goldD, 0.026) * 0.16 + gaussian(goldD, 0.075) * 0.08;

  float edgeFade = smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x);
  float verticalFade = smoothstep(0.08, 0.28, uv.y) * smoothstep(0.95, 0.72, uv.y);
  float fade = edgeFade * verticalFade;

  vec3 cyan = vec3(0.0, 0.682, 0.937);
  vec3 gold = vec3(1.0, 0.757, 0.027);
  vec3 softWhite = vec3(0.98, 0.995, 1.0);

  vec3 color = vec3(0.0);
  color += cyan * (cyanInner * 1.25 + cyanOuter * 0.85 + cyanMist * 0.42);
  color += gold * goldAccent * 0.82;
  color += softWhite * (whiteVeil * 0.82 + core * 1.15);

  float alpha = (
    core * 0.18 +
    whiteVeil * 0.26 +
    cyanInner * 0.24 +
    cyanOuter * 0.18 +
    cyanMist * 0.10 +
    goldAccent * 0.14
  ) * fade;

  alpha = clamp(alpha, 0.0, 0.42);

  gl_FragColor = vec4(color, alpha);
}
`

export function TurpialWaveShader() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [webglFailed, setWebglFailed] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => setReducedMotion(media.matches)
    updateMotionPreference()
    media.addEventListener('change', updateMotionPreference)
    return () => media.removeEventListener('change', updateMotionPreference)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !window.matchMedia('(max-width: 767px)').matches,
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
    })

    const gl = renderer.getContext()
    if (!gl) {
      renderer.dispose()
      setWebglFailed(true)
      return
    }

    setWebglFailed(false)
    renderer.domElement.className = 'absolute inset-0 h-full w-full pointer-events-none'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    root.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.Camera()
    const geometry = new THREE.PlaneGeometry(2, 2)
    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uStaticMix: { value: reducedMotion ? 1 : 0 },
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    let frameId = 0
    let disposed = false

    const setSize = () => {
      const { width, height } = root.getBoundingClientRect()
      const safeWidth = Math.max(width, 1)
      const safeHeight = Math.max(height, 1)
      const isMobile = window.innerWidth < 768
      const pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 1.15 : 1.6)

      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(safeWidth, safeHeight, false)
      uniforms.uResolution.value.set(safeWidth * pixelRatio, safeHeight * pixelRatio)
      uniforms.uIntensity.value = isMobile ? 0.78 : 1.0
      uniforms.uStaticMix.value = reducedMotion ? 1 : 0
    }

    const resizeObserver = new ResizeObserver(() => {
      setSize()
      renderer.render(scene, camera)
    })

    resizeObserver.observe(root)
    setSize()

    const start = performance.now()
    const render = (now: number) => {
      if (disposed) return
      // Slower animation (0.00075 -> 0.00032)
      uniforms.uTime.value = (now - start) * 0.00032
      renderer.render(scene, camera)
      if (!reducedMotion) {
        frameId = window.requestAnimationFrame(render)
      }
    }

    if (reducedMotion) {
      uniforms.uTime.value = 0
      renderer.render(scene, camera)
    } else {
      frameId = window.requestAnimationFrame(render)
    }

    return () => {
      disposed = true
      if (frameId) window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      scene.remove(mesh)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      const loseContext = renderer.getContext().getExtension('WEBGL_lose_context')
      loseContext?.loseContext()
      renderer.domElement.remove()
    }
  }, [reducedMotion])

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: `
            radial-gradient(circle at 18% 30%, rgba(0, 174, 239, 0.10), transparent 34%),
            radial-gradient(circle at 78% 36%, rgba(255, 193, 7, 0.08), transparent 28%),
            radial-gradient(circle at 52% 46%, rgba(255, 255, 255, 0.14), transparent 36%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.04) 100%)
          `,
        }}
      />
      {(reducedMotion || webglFailed) && (
        <div
          className="absolute inset-x-[-10%] top-[28%] h-[42%] rounded-[999px] blur-3xl"
          style={{
            background: `
              linear-gradient(
                90deg,
                rgba(0, 174, 239, 0) 0%,
                rgba(0, 174, 239, 0.16) 18%,
                rgba(255, 255, 255, 0.28) 44%,
                rgba(255, 193, 7, 0.12) 63%,
                rgba(0, 174, 239, 0.14) 82%,
                rgba(0, 174, 239, 0) 100%
              )
            `,
            opacity: reducedMotion ? 0.72 : 0.52,
            transform: reducedMotion ? 'translateY(-18%)' : 'translateY(-14%)',
          }}
        />
      )}
      {!webglFailed && <div ref={rootRef} className="absolute inset-0" />}
    </div>
  )
}

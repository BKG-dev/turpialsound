'use client'

import { useRef, useState, useEffect } from 'react'
import type { PointerEvent } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Box3, Color, Group, Mesh, MeshStandardMaterial, PointLight, Vector3 } from 'three'

const GLB_PATH = '/images/logo%20turpial%203d1.glb'

interface DragState {
  dragging:     boolean
  lastX:        number
  pendingDelta: number
}

/* ─── Halo dinámico — cuatro luces que orbitan alrededor del sólido ─────── */
function HaloEffect() {
  const cyanRef  = useRef<PointLight>(null)
  const goldRef  = useRef<PointLight>(null)
  const cyan2Ref = useRef<PointLight>(null)
  const gold2Ref = useRef<PointLight>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const r = 2.0

    // Par principal — órbita horizontal
    if (cyanRef.current) {
      cyanRef.current.position.set(
        Math.cos(t * 0.85) * r,
        Math.sin(t * 0.55) * 0.7,
        Math.sin(t * 0.85) * r * 0.35 + 1.5,
      )
    }
    if (goldRef.current) {
      goldRef.current.position.set(
        Math.cos(t * 0.85 + Math.PI) * r,
        Math.sin(t * 0.55 + Math.PI) * 0.7,
        Math.sin(t * 0.85 + Math.PI) * r * 0.35 + 1.5,
      )
    }
    // Par secundario — órbita vertical desfasada, crea profundidad
    if (cyan2Ref.current) {
      cyan2Ref.current.position.set(
        Math.sin(t * 0.65) * 0.6,
        Math.cos(t * 0.65) * r,
        Math.sin(t * 0.65 + 1.2) * 0.8 + 1.2,
      )
    }
    if (gold2Ref.current) {
      gold2Ref.current.position.set(
        Math.sin(t * 0.65 + Math.PI) * 0.6,
        Math.cos(t * 0.65 + Math.PI) * r,
        Math.sin(t * 0.65 + Math.PI + 1.2) * 0.8 + 1.2,
      )
    }
  })

  return (
    <>
      <pointLight ref={cyanRef}  color="#00AEEF" intensity={5} distance={8} />
      <pointLight ref={goldRef}  color="#FFC107" intensity={4} distance={8} />
      <pointLight ref={cyan2Ref} color="#00AEEF" intensity={3} distance={6} />
      <pointLight ref={gold2Ref} color="#FFC107" intensity={2.5} distance={6} />
    </>
  )
}

/* ─── Modelo ─────────────────────────────────────────────────────────────── */
function SpinningLogo({ drag }: { drag: React.MutableRefObject<DragState> }) {
  const [pivot, setPivot] = useState<Group | null>(null)
  const groupRef = useRef<Group>(null)

  useEffect(() => {
    let cancelled = false
    const disposables: MeshStandardMaterial[] = []

    const loader = new GLTFLoader()
    loader.load(
      GLB_PATH,
      (gltf) => {
        const model = gltf.scene as Group

        if (cancelled) {
          /* Componente desmontado mientras cargaba — liberar GPU inmediatamente */
          model.traverse((child) => {
            if (!(child instanceof Mesh)) return
            child.geometry?.dispose()
            const mat = child.material
            if (Array.isArray(mat)) mat.forEach(m => m.dispose())
            else mat?.dispose()
          })
          return
        }

        // Conservar colores originales + material metálico brillante
        model.traverse((child) => {
          if (!(child instanceof Mesh)) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const orig = child.material as any
          const rawColor = orig?.color instanceof Color
            ? (orig.color as Color).clone()
            : new Color(0xcccccc)
          // Reemplazar negro puro o muy oscuro por gris claro
          const color = rawColor.getHSL({ h: 0, s: 0, l: 0 }).l < 0.15
            ? new Color(0x666666)
            : rawColor
          const mat = new MeshStandardMaterial({
            color,
            metalness: 0.65,
            roughness: 0.12,
          })
          child.material = mat
          disposables.push(mat)  // registrar para dispose en unmount
        })

        model.rotation.x = Math.PI / 2

        const box = new Box3().setFromObject(model)
        const size = new Vector3()
        box.getSize(size)
        const maxDim = Math.max(size.x, size.y, size.z)
        if (maxDim > 0) model.scale.setScalar((3 * 1.15 * 1.2) / maxDim)

        const p = new Group()
        p.add(model)
        const box2 = new Box3().setFromObject(p)
        const center = new Vector3()
        box2.getCenter(center)
        model.position.set(-center.x, -center.y, -center.z)
        p.scale.z = 0.4

        setPivot(p)
      },
      undefined,
      (err) => console.error('[LogoGlb] LOAD ERROR', err),
    )

    return () => {
      cancelled = true
      /* Liberar materiales GPU al desmontar */
      disposables.forEach(m => m.dispose())
    }
  }, [])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    if (drag.current.dragging) {
      groupRef.current.rotation.y += drag.current.pendingDelta
      drag.current.pendingDelta = 0
    } else {
      groupRef.current.rotation.y -= delta * 0.3
    }
  })

  if (!pivot) return null

  return (
    <group ref={groupRef}>
      <primitive object={pivot} />
    </group>
  )
}

/* ─── Componente público ─────────────────────────────────────────────────── */
export function LogoGlb({
  width       = 320,
  height      = 200,
  interactive = true,
}: {
  width?:       number
  height?:      number
  interactive?: boolean
}) {
  const [mounted,    setMounted]    = useState(false)
  const [isDesktop,  setIsDesktop]  = useState(false)
  const [inView,     setInView]     = useState(true)
  const [tabVisible, setTabVisible] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const drag = useRef<DragState>({ dragging: false, lastX: 0, pendingDelta: 0 })

  useEffect(() => {
    setMounted(true)
    /* ── Optimización móvil: no montar WebGL en pantallas pequeñas ── */
    setIsDesktop(!window.matchMedia('(max-width: 768px)').matches)
  }, [])

  useEffect(() => {
    if (!mounted || !isDesktop) return
    const el = containerRef.current
    if (!el) return

    /* ── IntersectionObserver: pausa el renderer R3F fuera del viewport ── */
    const io = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting)
    }, { threshold: 0 })
    io.observe(el)

    /* ── Pausa cuando la pestaña queda oculta ── */
    const onVisibility = () => {
      setTabVisible(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [mounted, isDesktop])

  /* Placeholder SSR / móvil */
  if (!mounted || !isDesktop) return <div style={{ width, height }} aria-hidden="true" />

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!interactive) return
    drag.current.dragging     = true
    drag.current.lastX        = e.clientX
    drag.current.pendingDelta = 0
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!interactive || !drag.current.dragging) return
    drag.current.pendingDelta += (e.clientX - drag.current.lastX) * 0.012
    drag.current.lastX = e.clientX
  }
  function stopDrag() { drag.current.dragging = false }

  return (
    <div
      ref={containerRef}
      style={{ width, height, position: 'relative', cursor: interactive ? 'grab' : 'default' }}
      aria-label="Logo Turpial Sound 3D"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerLeave={stopDrag}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%' }}
        frameloop={inView && tabVisible ? 'always' : 'never'}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[-5,  8,  3]} intensity={2.0} color="#ffffff" />
        <directionalLight position={[ 3,  4,  5]} intensity={3.5} color="#ffffff" />
        <directionalLight position={[-4, -2,  3]} intensity={1.2} color="#cce8ff" />
        <pointLight position={[0, 0, -6]} color="#ffffff" intensity={1.5} distance={14} />

        <HaloEffect />
        <SpinningLogo drag={drag} />
      </Canvas>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { OrderStatus } from '../types'

interface ThreeRadarCanvasProps {
  status: OrderStatus
  riderProgress: number // 0.0 to 1.0
  distanceKm: number
}

export default function ThreeRadarCanvas({ status, riderProgress, distanceKm }: ThreeRadarCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    const container = containerRef.current
    if (!container) return

    // Scene, Camera, Renderer
    const width = container.clientWidth || 320
    const height = container.clientHeight || 160

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 0, 7)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      container.appendChild(renderer.domElement)
    } catch {
      // Graceful fallback if WebGL not supported on older device
      return
    }

    // â”€â”€ 1. Central Radar Wireframe Globe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const globeGeometry = new THREE.IcosahedronGeometry(1.6, 2)
    const globeMaterial = new THREE.MeshBasicMaterial({
      color: status === 'ready' ? 0x22c55e : status === 'delivered' ? 0x10b981 : 0xf59e0b,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    })
    const globe = new THREE.Mesh(globeGeometry, globeMaterial)
    scene.add(globe)

    // â”€â”€ 2. Concentric Orbiting Golden Rings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const ringGeo1 = new THREE.RingGeometry(2.1, 2.14, 48)
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    })
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1)
    ring1.rotation.x = Math.PI / 2.6
    scene.add(ring1)

    const ringGeo2 = new THREE.RingGeometry(2.7, 2.74, 48)
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: status === 'ready' ? 0x22c55e : 0xd97706,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
    })
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2)
    ring2.rotation.y = Math.PI / 3.2
    ring2.rotation.x = Math.PI / 4
    scene.add(ring2)

    // â”€â”€ 3. Golden Ambient Particle Field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const particleCount = 120
    const particlePositions = new Float32Array(particleCount * 3)
    const particleColors = new Float32Array(particleCount * 3)

    const baseColor = new THREE.Color(status === 'ready' ? '#4ade80' : '#fbbf24')
    const accentColor = new THREE.Color('#38bdf8')

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      const radius = 1.8 + Math.random() * 2.2

      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      particlePositions[i * 3 + 1] = (radius * Math.sin(phi) * Math.sin(theta)) * 0.45 // flatten slightly for widescreen
      particlePositions[i * 3 + 2] = radius * Math.cos(phi)

      const mixed = Math.random() > 0.3 ? baseColor : accentColor
      particleColors[i * 3] = mixed.r
      particleColors[i * 3 + 1] = mixed.g
      particleColors[i * 3 + 2] = mixed.b
    }

    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3))

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)

    // â”€â”€ 4. Pulsing Restaurant Core Beacon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const coreGeo = new THREE.SphereGeometry(0.22, 16, 16)
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.85,
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    core.position.set(-2.2, 0, 0)
    scene.add(core)

    // â”€â”€ 5. Customer Destination Beacon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const destGeo = new THREE.SphereGeometry(0.22, 16, 16)
    const destMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    })
    const dest = new THREE.Mesh(destGeo, destMat)
    dest.position.set(2.2, 0, 0)
    scene.add(dest)

    // â”€â”€ 6. Active Moving Rider Spark â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const riderGeo = new THREE.SphereGeometry(0.18, 16, 16)
    const riderMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.95,
    })
    const riderSpark = new THREE.Mesh(riderGeo, riderMat)
    scene.add(riderSpark)

    // â”€â”€ 7. Animation Loop with Parallax & Intersection Observer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let animationFrameId: number
    let clock = new THREE.Clock()
    let isVisible = true

    // Responsive interaction
    let mouseX = 0
    let mouseY = 0
    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    }
    container.addEventListener('pointermove', handlePointerMove, { passive: true })

    // Pause rendering when scrolled out of view to save 100% battery/GPU
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
    })
    observer.observe(container)

    const animate = () => {
      if (!isMountedRef.current) return
      animationFrameId = requestAnimationFrame(animate)

      if (!isVisible) return

      const delta = clock.getDelta()
      const time = clock.getElapsedTime()

      // Globe continuous luxury rotation
      globe.rotation.y += delta * 0.25
      globe.rotation.x = Math.sin(time * 0.3) * 0.15

      // Rings orbit
      ring1.rotation.z += delta * 0.4
      ring2.rotation.z -= delta * 0.35

      // Particle subtle sway
      particles.rotation.y += delta * 0.08
      particles.rotation.x = Math.sin(time * 0.2) * 0.08

      // Pulsing glow effect
      const corePulse = 1 + Math.sin(time * 3) * 0.25
      core.scale.set(corePulse, corePulse, corePulse)

      const destPulse = 1 + Math.cos(time * 2.5) * 0.2
      dest.scale.set(destPulse, destPulse, destPulse)

      // Rider spark travels along curved delivery trajectory
      const clampedProgress = Math.max(0.05, Math.min(0.95, riderProgress))
      const startX = -2.2
      const endX = 2.2
      const currentX = startX + (endX - startX) * clampedProgress
      const arcY = Math.sin(clampedProgress * Math.PI) * 0.75
      riderSpark.position.set(currentX, arcY, 0.4)

      const sparkPulse = 1 + Math.sin(time * 6) * 0.3
      riderSpark.scale.set(sparkPulse, sparkPulse, sparkPulse)

      // Parallax smooth camera tilt towards mouse/touch
      camera.position.x += (mouseX * 0.6 - camera.position.x) * 0.05
      camera.position.y += (mouseY * 0.3 - camera.position.y) * 0.05
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }

    animate()

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer) return
      const w = container.clientWidth || 320
      const h = container.clientHeight || 160
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    return () => {
      isMountedRef.current = false
      cancelAnimationFrame(animationFrameId)
      container.removeEventListener('pointermove', handlePointerMove)
      observer.disconnect()
      resizeObserver.disconnect()

      // Cleanup WebGL resources
      globeGeometry.dispose()
      globeMaterial.dispose()
      ringGeo1.dispose()
      ringMat1.dispose()
      ringGeo2.dispose()
      ringMat2.dispose()
      particleGeometry.dispose()
      particleMaterial.dispose()
      coreGeo.dispose()
      coreMat.dispose()
      destGeo.dispose()
      destMat.dispose()
      riderGeo.dispose()
      riderMat.dispose()

      renderer.dispose()
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [status, riderProgress, distanceKm])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        overflow: 'hidden',
        opacity: 0.85,
      }}
      aria-hidden="true"
    />
  )
}


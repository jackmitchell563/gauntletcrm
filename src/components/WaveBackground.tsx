import { useRef, useEffect } from 'react'
import * as THREE from 'three'

export function WaveBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Setup scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    containerRef.current.appendChild(renderer.domElement)

    // Create three layers of spherical shells
    const layers = [
      { particles: 50, radius: 12, speed: 0.2, amplitude: 1.6, normalFreq: 4 },
      { particles: 40, radius: 10, speed: 0.3, amplitude: 1.2, normalFreq: 3 },
      { particles: 30, radius: 8, speed: 0.4, amplitude: 0.8, normalFreq: 2 }
    ]

    const dotGeometry = new THREE.SphereGeometry(0.08, 16, 16)
    const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 })

    const dots: THREE.Mesh[][] = []
    const allDots: THREE.Mesh[] = []
    let isDisrupted = false
    let disruptionIntensity = 0

    // Create dots in a spherical distribution
    layers.forEach((layer) => {
      const layerDots: THREE.Mesh[] = []
      const phi = Math.PI * (3 - Math.sqrt(5)) // golden angle
      
      for (let i = 0; i < layer.particles * layer.particles / 2; i++) {
        const y = 1 - (i / (layer.particles * layer.particles / 2 - 1)) * 2
        const radius = Math.sqrt(1 - y * y)
        const theta = phi * i

        const x = Math.cos(theta) * radius
        const z = Math.sin(theta) * radius

        const dot = new THREE.Mesh(dotGeometry, dotMaterial.clone())
        // Position on sphere surface
        dot.position.set(
          x * layer.radius,
          y * layer.radius,
          z * layer.radius
        )
        // Store original position for animation
        dot.userData.originalPosition = dot.position.clone()
        dot.userData.phi = Math.atan2(Math.sqrt(x * x + z * z), y)
        dot.userData.theta = Math.atan2(z, x)
        dot.userData.originalColor = new THREE.Color(0x000000)
        dot.userData.originalOpacity = 0.2
        
        scene.add(dot)
        layerDots.push(dot)
        allDots.push(dot)
      }
      dots.push(layerDots)
    })

    // Position camera for better view
    const originalCameraZ = 35
    camera.position.set(0, 5, originalCameraZ)
    camera.lookAt(0, 0, 0)

    // Flicker effect function
    const flicker = () => {
      // Start disruption
      isDisrupted = true
      disruptionIntensity = 1.0

      // Flash red
      allDots.forEach(dot => {
        const material = dot.material as THREE.MeshBasicMaterial
        material.color.setHex(0xff0000)
        material.opacity = 1.0
      })

      // Zoom in smoothly
      const zoomStartTime = Date.now()
      const zoomDuration = 100
      const smoothZoom = () => {
        const elapsed = Date.now() - zoomStartTime
        if (elapsed < zoomDuration) {
          const progress = elapsed / zoomDuration
          camera.position.z = originalCameraZ - (originalCameraZ * 0.33 * progress) // Zoom in by moving 33% closer
          requestAnimationFrame(smoothZoom)
        }
      }
      smoothZoom()

      // Reset after 100ms
      setTimeout(() => {
        // Reset color and opacity
        allDots.forEach(dot => {
          const material = dot.material as THREE.MeshBasicMaterial
          material.color.copy(dot.userData.originalColor)
          material.opacity = dot.userData.originalOpacity
        })

        // Instantly reset camera zoom
        camera.position.z = originalCameraZ

        // Gradually reduce disruption over 400ms
        const startTime = Date.now()
        const smoothDisruption = () => {
          const elapsed = Date.now() - startTime
          if (elapsed < 400) {
            disruptionIntensity = 1.0 - (elapsed / 400)
            requestAnimationFrame(smoothDisruption)
          } else {
            isDisrupted = false
            disruptionIntensity = 0
          }
        }
        smoothDisruption()
      }, 100)

      // Schedule next flicker
      const nextFlicker = 30000 + Math.random() * 20000
      setTimeout(flicker, nextFlicker)
    }

    // Start the flicker effect
    const initialDelay = 30000 + Math.random() * 20000
    setTimeout(flicker, initialDelay)

    // Animation
    let time = 0
    const animate = () => {
      requestAnimationFrame(animate)

      time += 0.112

      dots.forEach((layerDots, layerIndex) => {
        const layer = layers[layerIndex]
        layerDots.forEach((dot) => {
          const originalPos = dot.userData.originalPosition
          const theta = dot.userData.theta
          const phi = dot.userData.phi
          
          // Calculate wave displacement with disruption
          const baseFreq = layer.normalFreq
          const frequency = isDisrupted ? baseFreq * (1.5 + disruptionIntensity * 1.5) : baseFreq
          const amplitude = layer.amplitude * (isDisrupted ? (1 + disruptionIntensity * 11) : 1)
          
          const displacement = 
            Math.sin(time * layer.speed + theta * frequency) * amplitude * 0.3 +
            Math.cos(time * layer.speed + phi * frequency) * amplitude * 0.2
          
          // Apply displacement along the radius
          const direction = originalPos.clone().normalize()
          const newPosition = originalPos.clone().add(
            direction.multiplyScalar(displacement)
          )
          
          dot.position.copy(newPosition)
        })
      })

      // Rotate the entire scene slowly
      scene.rotation.y += 0.0005

      renderer.render(scene, camera)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.98) 100%)',
        pointerEvents: 'none'
      }}
    />
  )
} 
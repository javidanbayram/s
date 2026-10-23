import { useState, useRef, useEffect, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import gsap from 'gsap'
import EyeAnatomy from './EyeAnatomy.jsx'
import IrisTypography, { IRIS_CENTER_Y } from './IrisTypography.jsx'
import MemorySparks from './MemorySparks.jsx'

const BG = '#F7F9FA'

/**
 * Cinematic GSAP Camera Controller with Interactive Drag/Scroll Exploration:
 * - Overview state (Initial): Camera at [0, 0.32, 10.20], framing complete eye portrait.
 * - Zoomed state (OnClick): Smoothly animates camera deep inside the iris to [0, IRIS_CENTER_Y, 1.25].
 * - When zoomed in, OrbitControls activates silky Left-Click Pan and Touch Pan:
 *   Users can drag/slide with hand or mouse in any direction to comfortably read every single word!
 * - Distinguishes drag vs click: dragging scrolls/pans, quick tap/click zooms back out.
 */
function CameraController({ isZoomed, onToggleZoom }) {
  const { camera, gl } = useThree()
  const controlsRef = useRef()
  const pointerDownPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!controlsRef.current) return
    const controls = controlsRef.current

    if (isZoomed) {
      // Enable buttery-smooth screen-space panning with Left-Click & Single Touch
      controls.enablePan = true
      controls.screenSpacePanning = true
      controls.panSpeed = 0.95
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }
      controls.touches = {
        ONE: THREE.TOUCH.PAN,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }
    } else {
      // Lock pan in overview mode
      controls.enablePan = false
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }
    }

    const targetPos = isZoomed
      ? { x: 0, y: IRIS_CENTER_Y, z: 1.25 }
      : { x: 0, y: 0.32, z: 10.20 }

    const targetLook = { x: 0, y: IRIS_CENTER_Y, z: 0 }

    const ctx = gsap.context(() => {
      gsap.to(camera.position, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration: 2.6,
        ease: 'power3.inOut',
        onUpdate: () => {
          camera.updateProjectionMatrix()
        },
      })

      gsap.to(controls.target, {
        x: targetLook.x,
        y: targetLook.y,
        z: targetLook.z,
        duration: 2.6,
        ease: 'power3.inOut',
        onUpdate: () => {
          controls.update()
        },
      })
    })

    return () => ctx.revert()
  }, [isZoomed, camera])

  // Track click vs drag on the canvas domElement
  useEffect(() => {
    const dom = gl.domElement

    const onPointerDown = (e) => {
      pointerDownPos.current = { x: e.clientX, y: e.clientY }
    }

    const onPointerUp = (e) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.current.x, e.clientY - pointerDownPos.current.y)
      // If movement is very small (< 7px), treat as a click to toggle zoom
      if (dist < 7) {
        if (onToggleZoom) onToggleZoom()
      }
    }

    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointerup', onPointerUp)
    return () => {
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointerup', onPointerUp)
    }
  }, [gl, onToggleZoom])

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={true}
      minDistance={0.7}
      maxDistance={14}
      rotateSpeed={0.4}
      dampingFactor={0.06}
      enableDamping
    />
  )
}

export default function OceanExperience({ onHologramChange, onZoomStateChange }) {
  const [isZoomed, setIsZoomed] = useState(false)

  const handleToggleZoom = useCallback(() => {
    setIsZoomed((prev) => {
      const next = !prev
      if (onZoomStateChange) onZoomStateChange(next)
      return next
    })
  }, [onZoomStateChange])

  return (
    <Canvas
      className="ocean-canvas"
      dpr={[1, 2]}
      camera={{ position: [0, 0.32, 10.20], fov: 42, near: 0.05, far: 100 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl }) => gl.setClearColor(BG, 1)}
    >
      <color attach="background" args={[BG]} />

      <CameraController isZoomed={isZoomed} onToggleZoom={handleToggleZoom} />
      <EyeAnatomy />
      <IrisTypography isZoomed={isZoomed} />
      <MemorySparks active={isZoomed} onHologramChange={onHologramChange} />

      <EffectComposer multisampling={0}>
        <Vignette eskil={false} offset={0.35} darkness={0.12} />
      </EffectComposer>
    </Canvas>
  )
}

import { useState, useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'

const EYE_CENTER = new THREE.Vector3(0.0, 2.2, -1.8)
const TILT = 0.12 // matches iris plane tilt

// Poetic, cosmic & profound tributes to Sama's depth and presence
const MEMORY_EASTER_EGGS = [
  {
    id: 'eyes',
    title: '.',
    text: 'The first time you looked at me with those deep ocean eyes, time stopped and the entire universe held its breath.',
    color: '#1E3A5F',
    angle: 0.52,
    radius: 2.85,
    speed: 0.22,
    elevation: 0.35,
  },
  {
    id: 'mind',
    title: '.',
    text: 'In a world full of noise, your brilliant mind is an anchor of profound truth, radiant intellect, and timeless grace.',
    color: '#2C527D',
    angle: 1.88,
    radius: 3.15,
    speed: -0.18,
    elevation: -0.28,
  },
  {
    id: 'depth',
    title: '.',
    text: 'Whenever the world feels chaotic, the calm within your gaze is the sanctuary where all my thoughts find peace.',
    color: '#4A85B2',
    angle: 3.14,
    radius: 2.95,
    speed: 0.25,
    elevation: 0.42,
  },
  {
    id: 'strength',
    title: '.',
    text: 'Yours is an unyielding and noble strength—standing proud like a celestial light against any darkness.',
    color: '#1A3353',
    angle: 4.35,
    radius: 3.22,
    speed: -0.26,
    elevation: -0.38,
  },
  {
    id: 'cosmos',
    title: '.',
    text: 'You are not merely looking at the universe, Sama; in the luminous depth of your eyes, an entire cosmos unfolds.',
    color: '#34608E',
    angle: 5.45,
    radius: 3.05,
    speed: 0.21,
    elevation: 0.22,
  },
  {
    id: 'eternal',
    title: '.',
    text: 'Even if all the oceans turned to stardust, the warmth and brilliance of your soul would still echo through eternity.',
    color: '#1E3A5F',
    angle: 2.65,
    radius: 3.32,
    speed: 0.28,
    elevation: -0.18,
  },
]

/** Generates a soft, glowing radial gradient texture for the spark's aura */
function useSparkTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(10, 17, 22, 0.95)')
    grad.addColorStop(0.3, 'rgba(30, 58, 95, 0.70)')
    grad.addColorStop(0.7, 'rgba(74, 133, 178, 0.25)')
    grad.addColorStop(1, 'rgba(247, 249, 250, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 128)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])
}

/** Individual Interactive Stray Particle (Memory Spark) */
function StrayMemorySpark({ spark, onSelect, haloTexture }) {
  const groupRef = useRef()
  const coreRef = useRef()
  const [hovered, setHovered] = useState(false)

  // Floating orbit trajectory around the eye
  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    const currentAngle = spark.angle + t * spark.speed * 0.4
    const r = spark.radius + Math.sin(t * 0.8 + spark.angle) * 0.12

    // Local coordinates on the tilted eye plane
    const lx = Math.cos(currentAngle) * r
    const ly = Math.sin(currentAngle) * r
    const lz = spark.elevation + Math.sin(t * 1.4 + spark.angle * 2.0) * 0.18

    // Tilt transformation
    const cosT = Math.cos(TILT)
    const sinT = Math.sin(TILT)
    const ty = ly * cosT - lz * sinT
    const tz = ly * sinT + lz * cosT

    groupRef.current.position.set(
      EYE_CENTER.x + lx,
      EYE_CENTER.y + ty,
      EYE_CENTER.z + tz
    )

    // Gentle pulse animation
    if (coreRef.current) {
      const pulse = hovered ? 1.45 : 1.0 + 0.22 * Math.sin(t * 3.5 + spark.angle * 4.0)
      coreRef.current.scale.setScalar(pulse)
    }
  })

  // Cursor change on hover
  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = 'pointer'
    } else {
      document.body.style.cursor = 'auto'
    }
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hovered])

  return (
    <group ref={groupRef}>
      {/* Invisible Raycasting Hit Box (enlarged for easy clicking) */}
      <mesh
        visible={false}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(spark)
        }}
      >
        <sphereGeometry args={[0.32, 8, 8]} />
        <meshBasicMaterial />
      </mesh>

      {/* Luminous Core Sphere */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.048, 16, 16]} />
        <meshBasicMaterial
          color={hovered ? '#ffffff' : spark.color}
          toneMapped={false}
        />
      </mesh>

      {/* Billboard Glowing Aura Disc */}
      <Billboard follow>
        <mesh>
          <planeGeometry args={[hovered ? 0.48 : 0.32, hovered ? 0.48 : 0.32]} />
          <meshBasicMaterial
            map={haloTexture}
            color={spark.color}
            transparent
            opacity={hovered ? 0.95 : 0.65}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </Billboard>
    </group>
  )
}

/** 3D Holographic Memory Projector (Zero React State Re-render in Render Loop) */
function HolographicMemoryDisplay({ memory, onDismiss }) {
  const groupRef = useRef()
  const headerRef = useRef()
  const bodyRef = useRef()
  const subRef = useRef()
  const [renderable, setRenderable] = useState(false)

  useEffect(() => {
    if (!memory) return
    setRenderable(true)
    const g = groupRef.current
    if (!g) return

    // Position directly in front of the camera, framed at eye center
    g.position.set(EYE_CENTER.x, EYE_CENTER.y - 0.15, EYE_CENTER.z + 1.25)
    g.scale.set(0.85, 0.85, 0.85)

    const opacities = { value: 0 }

    const applyOpacity = () => {
      const v = opacities.value
      if (headerRef.current) {
        headerRef.current.fillOpacity = v * 0.92
        headerRef.current.outlineOpacity = v * 0.72
      }
      if (bodyRef.current) {
        bodyRef.current.fillOpacity = v * 0.98
        bodyRef.current.outlineOpacity = v * 0.88
      }
      if (subRef.current) {
        subRef.current.fillOpacity = v * 0.65
      }
    }

    // GSAP Hologram Animation: Elegant cinematic entrance, holding float, and ethereal dissolve
    const tl = gsap.timeline({
      onComplete: () => {
        setRenderable(false)
        if (onDismiss) onDismiss()
      },
    })

    // 1. Bright flash & float upwards with smooth back ease
    tl.to(
      g.position,
      { y: EYE_CENTER.y + 0.12, duration: 4.8, ease: 'power2.out' },
      0
    )
    tl.to(
      g.scale,
      { x: 1, y: 1, z: 1, duration: 0.8, ease: 'back.out(1.4)' },
      0
    )
    tl.to(
      opacities,
      {
        value: 1.0,
        duration: 0.65,
        ease: 'power3.out',
        onUpdate: applyOpacity,
      },
      0
    )

    // 2. Ethereal dissolve after 3.6s
    tl.to(
      opacities,
      {
        value: 0.0,
        duration: 1.2,
        ease: 'power2.inOut',
        onUpdate: applyOpacity,
        delay: 3.4,
      },
      '-=1.2'
    )

    return () => tl.kill()
  }, [memory, onDismiss])

  if (!renderable || !memory) return null

  return (
    <group ref={groupRef}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        {/* Holographic Header Rune */}
        {memory.title && memory.title.trim() !== '.' && (
          <Text
            ref={headerRef}
            position={[0, 0.32, 0]}
            fontSize={0.055}
            color="#00f0ff"
            fillOpacity={0}
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.08}
            outlineWidth={0.0025}
            outlineColor="#0055d4"
            outlineOpacity={0}
          >
            {`✦ ${memory.title.toUpperCase()} ✦`}
          </Text>
        )}

        {/* Glowing Holographic Body Text */}
        <Text
          ref={bodyRef}
          position={[0, 0.08, 0]}
          fontSize={0.082}
          color="#0A1116"
          fillOpacity={0}
          anchorX="center"
          anchorY="middle"
          maxWidth={2.8}
          textAlign="center"
          lineHeight={1.35}
          letterSpacing={0.025}
          outlineWidth={0.0024}
          outlineColor="#FFFFFF"
          outlineOpacity={0}
        >
          {memory.text}
        </Text>

        {/* Ambient Hologram Scanline Frame */}
        <Text
          ref={subRef}
          position={[0, -0.22, 0]}
          fontSize={0.038}
          color="#1E3A5F"
          fillOpacity={0}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
        >
          — SAMA'S MEMORY STREAM —
        </Text>
      </Billboard>
    </group>
  )
}

/** Master Component for Stray Sparks & Holographic Displays */
export default function MemorySparks({ active = true, onHologramChange }) {
  const haloTexture = useSparkTexture()
  const [activeMemory, setActiveMemory] = useState(null)

  const handleSelectSpark = (spark) => {
    setActiveMemory(spark)
    if (onHologramChange) {
      onHologramChange(spark)
    }
  }

  const handleDismiss = () => {
    setActiveMemory(null)
    if (onHologramChange) {
      onHologramChange(null)
    }
  }

  if (!active) return null

  return (
    <group>
      {/* 6 Stray Floating Memory Sparks orbiting the Iris */}
      {MEMORY_EASTER_EGGS.map((spark) => (
        <StrayMemorySpark
          key={spark.id}
          spark={spark}
          haloTexture={haloTexture}
          onSelect={handleSelectSpark}
        />
      ))}

      {/* Holographic 3D Floating Memory Display */}
      <HolographicMemoryDisplay
        memory={activeMemory}
        onDismiss={handleDismiss}
      />
    </group>
  )
}

import { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'

/**
 * Ultra-Dense Bold Micro-Typography Blue Iris Core for Sama:
 * - 14 concentric tracks packed with 180+ bold English secret words.
 * - Bold watercolor ink weighting (#1E3A5F stroke, vibrant blue gradient fills).
 * - Full & rich from afar (never looks empty).
 * - Strict circular bounding: NO word ever exceeds R_LIMBUS or enters R_PUPIL.
 */

export const SECRET_WORDS = [
  'Sama',
  'Beautiful',
  'Intellectual',
  'Strong',
  'Brilliant',
  'Independent',
  'Confident',
  'Unique',
  'Determined',
  'Bold',
  'Profound',
  'Inspiring',
]

export const IRIS_CENTER_Y = 0.18
export const R_PUPIL = 0.28
export const R_LIMBUS = 1.18

// Generate smooth circular watercolor droplet texture for stroma
function useInkDropletTexture() {
  return useMemo(() => {
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.60, 'rgba(255,255,255,0.85)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, 64)
    const tex = new THREE.CanvasTexture(canvas)
    tex.generateMipmaps = true
    return tex
  }, [])
}

// Accurate anatomical color mapping matching the vibrant blue palette
function getIrisTextColor(rNorm, wordIndex) {
  const r = THREE.MathUtils.clamp(rNorm, 0, 1)

  const pupilDark = new THREE.Color('#0A1116')
  const baseMidBlue = new THREE.Color('#4A85B2')
  const highlightMisty = new THREE.Color('#7AB0D6')
  const limbalNavy = new THREE.Color('#1E3A5F')

  if (r < 0.14) {
    return pupilDark.clone().lerp(limbalNavy, r / 0.14)
  } else if (r < 0.45) {
    const t = (r - 0.14) / (0.45 - 0.14)
    return baseMidBlue.clone().lerp(highlightMisty, Math.sin(t * Math.PI))
  } else if (r < 0.80) {
    return wordIndex % 2 === 0 ? baseMidBlue : baseMidBlue.clone().lerp(highlightMisty, 0.40)
  } else {
    const t = (r - 0.80) / (1.0 - 0.80)
    return baseMidBlue.clone().lerp(limbalNavy, t)
  }
}

/**
 * Precomputes 14 dense concentric typography tracks with strict circular bounding:
 * Ensures the eye looks richly saturated and full from far away without empty gaps.
 */
function useDenseBoundedIrisNodes() {
  return useMemo(() => {
    const nodes = []
    // 14 concentric tracks stepping tightly across the stroma
    const TRACK_RADII = [
      0.35, 0.41, 0.47, 0.53, 0.59, 0.65, 0.71, 0.77, 0.83, 0.89, 0.95, 1.01, 1.06, 1.10
    ]

    let globalWordIdx = 0
    let nodeId = 0

    TRACK_RADII.forEach((r, trackIdx) => {
      const rNorm = (r - R_PUPIL) / (R_LIMBUS - R_PUPIL)

      // Concave dip toward pupil + collarette ridge
      const concaveDip = -0.22 * Math.pow(1.0 - rNorm, 1.4)
      const collarette = Math.exp(-Math.pow(rNorm - 0.355, 2) / (2 * 0.045 * 0.045)) * 0.06
      const zDepth = concaveDip + collarette

      // Base font size: bold and prominent so it looks dense and solid from afar
      const baseFontSize = 0.024 + rNorm * 0.009

      // Staggered start angle for organic phyllotaxis distribution
      let currentTheta = (trackIdx * 0.52) % (2 * Math.PI)
      const endTheta = currentTheta + 2 * Math.PI

      while (currentTheta < endTheta - 0.05) {
        const word = SECRET_WORDS[globalWordIdx % SECRET_WORDS.length]
        globalWordIdx++

        const isHero = word === 'Sama'
        const fontSize = isHero ? baseFontSize * 1.25 : baseFontSize

        const charWidth = fontSize * 0.52
        const wordPhysicalLength = word.length * charWidth + 0.016 // tight snug packing
        const angularSpan = wordPhysicalLength / r

        const midTheta = currentTheta + angularSpan * 0.5
        const localX = r * Math.cos(midTheta)
        const localY = r * Math.sin(midTheta)
        const localZ = zDepth

        // STRICT CIRCULAR BOUNDING BOX CHECK
        const halfW = (word.length * charWidth) * 0.5
        const halfH = fontSize * 0.5
        const maxCornerDist = Math.hypot(Math.abs(localX) + halfW, Math.abs(localY) + halfH)
        const minInnerDist = Math.hypot(Math.max(0, Math.abs(localX) - halfW), Math.max(0, Math.abs(localY) - halfH))

        currentTheta += angularSpan

        // Enforce bounds: strictly inside R_LIMBUS and outside R_PUPIL
        if (maxCornerDist > R_LIMBUS - 0.028) {
          continue
        }
        if (minInnerDist < R_PUPIL + 0.020) {
          continue
        }

        const color = getIrisTextColor(rNorm, globalWordIdx)

        nodes.push({
          id: nodeId++,
          word,
          localX,
          localY,
          localZ,
          rNorm,
          color: `#${color.getHexString()}`,
          size: fontSize,
        })
      }
    })

    return nodes
  }, [])
}

/** Precomputes procedural watercolor stroma particle glaze strictly within iris circle */
function useIrisStromaParticles() {
  return useMemo(() => {
    const COUNT = 4500
    const points = []
    const cols = []

    const baseMidBlue = new THREE.Color('#4A85B2')
    const highlightMisty = new THREE.Color('#7AB0D6')
    const limbalNavy = new THREE.Color('#1E3A5F')
    const pupilDark = new THREE.Color('#0A1116')
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))

    const R_OUTER_SAFE = R_LIMBUS - 0.020

    for (let i = 0; i < COUNT; i++) {
      const t = i / COUNT
      const theta = i * goldenAngle
      const r = Math.sqrt(R_PUPIL * R_PUPIL + t * (R_OUTER_SAFE * R_OUTER_SAFE - R_PUPIL * R_PUPIL))
      const rNorm = (r - R_PUPIL) / (R_LIMBUS - R_PUPIL)

      const concaveDip = -0.24 * Math.pow(1.0 - rNorm, 1.4)
      const collarette = Math.exp(-Math.pow(rNorm - 0.355, 2) / (2 * 0.045 * 0.045)) * 0.07
      const fibers = Math.sin(theta * 48 + r * 16) * 0.012 * rNorm
      const z = concaveDip + collarette + fibers - 0.012

      points.push(r * Math.cos(theta), r * Math.sin(theta), z)

      let col
      if (rNorm < 0.15) {
        col = pupilDark.clone().lerp(limbalNavy, rNorm / 0.15)
      } else if (rNorm < 0.45) {
        col = baseMidBlue.clone().lerp(highlightMisty, Math.sin(((rNorm - 0.15) / 0.30) * Math.PI))
      } else if (rNorm < 0.82) {
        col = baseMidBlue.clone().lerp(highlightMisty, Math.random() * 0.32)
      } else {
        col = baseMidBlue.clone().lerp(limbalNavy, (rNorm - 0.82) / 0.18)
      }
      cols.push(col.r, col.g, col.b)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
    return geo
  }, [])
}

export default function IrisTypography({ isZoomed }) {
  const groupRef = useRef()
  const rotGroupRef = useRef()
  const textScaleGroupRef = useRef()

  const [hovered, setHovered] = useState(false)

  const nodes = useDenseBoundedIrisNodes()
  const stromaGeo = useIrisStromaParticles()
  const dropletTexture = useInkDropletTexture()

  // Pointer cursor styling
  useEffect(() => {
    if (isZoomed) {
      document.body.style.cursor = 'grab'
    } else {
      document.body.style.cursor = hovered ? 'pointer' : 'default'
    }
    return () => {
      document.body.style.cursor = 'default'
    }
  }, [hovered, isZoomed])

  // GSAP animation for text growth: "basandan sonra boyusun"
  useEffect(() => {
    if (!textScaleGroupRef.current) return
    const targetScale = isZoomed ? 2.30 : 1.0

    const ctx = gsap.context(() => {
      gsap.to(textScaleGroupRef.current.scale, {
        x: targetScale,
        y: targetScale,
        z: targetScale,
        duration: 2.5,
        ease: 'power3.inOut',
      })
    })

    return () => ctx.revert()
  }, [isZoomed])

  // Living micro-pulsation (Hippus) and subtle ocular rotation
  useFrame((state) => {
    if (!rotGroupRef.current) return
    const t = state.clock.elapsedTime

    rotGroupRef.current.rotation.z = t * 0.016

    const hippus = Math.sin(t * 0.82) * 0.016 + Math.sin(t * 1.75) * 0.006
    const scale = 1.0 + hippus
    rotGroupRef.current.scale.set(scale, scale, 1.0)
  })

  return (
    <group
      ref={groupRef}
      position={[0, IRIS_CENTER_Y, 0]}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <group ref={rotGroupRef}>
        {/* 1. Underlying Soft Circular Watercolor Blue Stroma Glaze */}
        <points geometry={stromaGeo}>
          <pointsMaterial
            map={dropletTexture}
            size={0.042}
            vertexColors
            transparent
            opacity={0.68}
            depthWrite={false}
            blending={THREE.NormalBlending}
            sizeAttenuation
          />
        </points>

        {/* 2. 14 Dense Concentric Micro-Typography Words in English */}
        <group ref={textScaleGroupRef}>
          {nodes.map((node) => (
            <group
              key={node.id}
              position={[node.localX, node.localY, node.localZ]}
            >
              <Billboard follow lockX={false} lockY={false} lockZ={false}>
                <Text
                  fontSize={node.size}
                  color={node.color}
                  fontWeight="900"
                  strokeWidth={0.0026}
                  strokeColor="#1E3A5F"
                  fillOpacity={0.98}
                  anchorX="center"
                  anchorY="middle"
                  letterSpacing={0.025}
                >
                  {node.word}
                </Text>
              </Billboard>
            </group>
          ))}
        </group>

        {/* 3. Limbal Ring Outer Circle Boundary (#1E3A5F) */}
        <mesh position={[0, 0, -0.01]}>
          <ringGeometry args={[R_LIMBUS - 0.012, R_LIMBUS + 0.014, 128]} />
          <meshBasicMaterial color="#1E3A5F" transparent opacity={0.55} />
        </mesh>

        {/* 4. Central Pupil Aperture Disk (#0A1116) */}
        <mesh position={[0, 0, -0.25]}>
          <circleGeometry args={[R_PUPIL * 0.98, 64]} />
          <meshBasicMaterial color="#0A1116" />
        </mesh>
      </group>
    </group>
  )
}

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Procedural Eye Anatomy for Sama (Enhanced Bold Ink Definition):
 * 1. Palpebral Aperture: Multi-layered dense almond contour
 * 2. Sweeping Eyelashes: Thick, curved quadratic Bezier upper & lower lashes
 * 3. Directional Eyebrow: 420 feathered bold hair strokes
 * 4. Canthi Sclera ink stipples
 * Colors: Deep velvety charcoal (#0A1116) and midnight navy (#1E3A5F) for striking bold contrast on #F7F9FA.
 */

const PALPEBRAL_WIDTH = 2.8 // half-width from center to canthus
const EYE_CENTER_Y = 0.18

// Upper eyelid curve equation
function getUpperLid(x) {
  const u = THREE.MathUtils.clamp((x + PALPEBRAL_WIDTH) / (2 * PALPEBRAL_WIDTH), 0, 1)
  const y = EYE_CENTER_Y + 1.16 * Math.sin(Math.PI * Math.pow(u, 0.92)) * (1.0 - 0.12 * (u - 0.5))
  const z = -0.32 * (1.0 - Math.sin(Math.PI * u))
  return { y, z, u }
}

// Lower eyelid curve equation
function getLowerLid(x) {
  const u = THREE.MathUtils.clamp((x + PALPEBRAL_WIDTH) / (2 * PALPEBRAL_WIDTH), 0, 1)
  const y = EYE_CENTER_Y - 1.06 * Math.sin(Math.PI * Math.pow(u, 1.08)) * (1.0 + 0.08 * (u - 0.5))
  const z = -0.28 * (1.0 - Math.sin(Math.PI * u))
  return { y, z, u }
}

// Eyebrow curve equation
function getEyebrow(x) {
  const u = THREE.MathUtils.clamp((x + 3.2) / 6.5, 0, 1)
  const arch = Math.sin(Math.PI * Math.pow(u, 0.72))
  const tailDrop = Math.pow(Math.max(0, u - 0.65), 2) * 1.25
  const y = 2.10 + arch * 0.76 - tailDrop
  const z = -0.18 * (1.0 - arch)
  return { y, z, u }
}

export default function EyeAnatomy() {
  const anatomyGroupRef = useRef()

  const { geometry } = useMemo(() => {
    const points = []
    const cols = []

    const charcoal = new THREE.Color('#0A1116')
    const deepNavy = new THREE.Color('#1E3A5F')
    const softInk = new THREE.Color('#223344')
    const scleraTint = new THREE.Color('#88A0B2')

    // ── 1. Palpebral Almond Aperture Margin Lines (Triple Density) ─
    const LID_SAMPLES = 260
    for (let i = 0; i < LID_SAMPLES; i++) {
      const x = -PALPEBRAL_WIDTH + (i / (LID_SAMPLES - 1)) * (2 * PALPEBRAL_WIDTH)

      // Upper lid margin (thick 3-line ink stroke)
      const up = getUpperLid(x)
      points.push(x, up.y, up.z)
      cols.push(charcoal.r, charcoal.g, charcoal.b)

      points.push(x, up.y + 0.016, up.z - 0.008)
      cols.push(deepNavy.r, deepNavy.g, deepNavy.b)

      points.push(x, up.y + 0.032, up.z - 0.016)
      cols.push(charcoal.r, charcoal.g, charcoal.b)

      // Lower lid margin (thick 2-line ink stroke)
      const low = getLowerLid(x)
      points.push(x, low.y, low.z)
      cols.push(deepNavy.r, deepNavy.g, deepNavy.b)

      points.push(x, low.y - 0.016, low.z - 0.008)
      cols.push(charcoal.r, charcoal.g, charcoal.b)
    }

    // ── 2. Sweeping Upper Eyelashes (Bold Curved Hairs) ────────
    const UPPER_LASH_COUNT = 160
    for (let i = 0; i < UPPER_LASH_COUNT; i++) {
      const u = (i + 0.5) / UPPER_LASH_COUNT
      const x = -PALPEBRAL_WIDTH + u * (2 * PALPEBRAL_WIDTH)
      const root = getUpperLid(x)

      const lengthProfile = Math.sin(Math.PI * Math.pow(u, 0.85))
      const lashLength = (0.36 + lengthProfile * 0.58) * (0.88 + Math.random() * 0.28)
      const flareAngle = Math.PI * 0.5 - (u - 0.45) * 0.95 + (Math.random() - 0.5) * 0.12

      const p0 = new THREE.Vector3(x, root.y, root.z)
      const p1 = new THREE.Vector3(
        x + Math.cos(flareAngle) * (lashLength * 0.45),
        root.y + Math.sin(flareAngle) * (lashLength * 0.40),
        root.z + 0.24 + Math.random() * 0.08
      )
      const p2 = new THREE.Vector3(
        x + Math.cos(flareAngle) * lashLength,
        root.y + Math.sin(flareAngle) * lashLength,
        root.z + 0.08 + Math.random() * 0.05
      )

      const SEGMENTS = 9
      for (let s = 1; s <= SEGMENTS; s++) {
        const t = s / SEGMENTS
        const omt = 1 - t
        const bx = omt * omt * p0.x + 2 * omt * t * p1.x + t * t * p2.x
        const by = omt * omt * p0.y + 2 * omt * t * p1.y + t * t * p2.y
        const bz = omt * omt * p0.z + 2 * omt * t * p1.z + t * t * p2.z
        points.push(bx, by, bz)

        const col = t > 0.8 ? softInk : (i % 2 === 0 ? charcoal : deepNavy)
        cols.push(col.r, col.g, col.b)

        // Extra thickness at the root
        if (s <= 3) {
          points.push(bx + 0.008, by + 0.006, bz)
          cols.push(charcoal.r, charcoal.g, charcoal.b)
        }
      }
    }

    // ── 3. Lower Eyelashes (Bold, Defined Downward Lashes) ─────
    const LOWER_LASH_COUNT = 90
    for (let i = 0; i < LOWER_LASH_COUNT; i++) {
      const u = (i + 0.5) / LOWER_LASH_COUNT
      const x = -PALPEBRAL_WIDTH + u * (2 * PALPEBRAL_WIDTH)
      const root = getLowerLid(x)

      const lengthProfile = Math.sin(Math.PI * Math.pow(u, 1.1))
      const lashLength = (0.20 + lengthProfile * 0.28) * (0.88 + Math.random() * 0.25)
      const flareAngle = -Math.PI * 0.5 - (u - 0.5) * 0.75

      const p0 = new THREE.Vector3(x, root.y, root.z)
      const p1 = new THREE.Vector3(
        x + Math.cos(flareAngle) * (lashLength * 0.5),
        root.y + Math.sin(flareAngle) * (lashLength * 0.5),
        root.z + 0.15
      )
      const p2 = new THREE.Vector3(
        x + Math.cos(flareAngle) * lashLength,
        root.y + Math.sin(flareAngle) * lashLength,
        root.z + 0.04
      )

      const SEGMENTS = 6
      for (let s = 1; s <= SEGMENTS; s++) {
        const t = s / SEGMENTS
        const omt = 1 - t
        const bx = omt * omt * p0.x + 2 * omt * t * p1.x + t * t * p2.x
        const by = omt * omt * p0.y + 2 * omt * t * p1.y + t * t * p2.y
        const bz = omt * omt * p0.z + 2 * omt * t * p1.z + t * t * p2.z
        points.push(bx, by, bz)
        cols.push(deepNavy.r, deepNavy.g, deepNavy.b)
      }
    }

    // ── 4. Elegant Arched Eyebrow (Dense 420 Bold Feather Strokes) ─
    const BROW_STROKES = 420
    for (let i = 0; i < BROW_STROKES; i++) {
      const u = (i + 0.5) / BROW_STROKES
      const xCenter = -3.2 + u * 6.5
      const center = getEyebrow(xCenter)

      const browWidth = (0.32 - u * 0.16) * (0.8 + Math.random() * 0.4)
      const normalOffset = (Math.random() - 0.5) * browWidth

      let growthAngle
      if (u < 0.25) {
        growthAngle = THREE.MathUtils.degToRad(68 + (Math.random() - 0.5) * 16)
      } else if (u < 0.70) {
        growthAngle = THREE.MathUtils.degToRad(24 - (u - 0.25) * 35 + (Math.random() - 0.5) * 14)
      } else {
        growthAngle = THREE.MathUtils.degToRad(-26 - (u - 0.70) * 45 + (Math.random() - 0.5) * 12)
      }

      const hairLength = (0.24 + Math.random() * 0.18) * (1.0 - u * 0.35)
      const rootX = xCenter + (Math.random() - 0.5) * 0.09
      const rootY = center.y + normalOffset
      const rootZ = center.z + (Math.random() - 0.5) * 0.04

      const STROKE_PTS = 6
      for (let s = 0; s < STROKE_PTS; s++) {
        const t = s / (STROKE_PTS - 1)
        const curveCurvature = Math.sin(t * Math.PI) * 0.035
        const px = rootX + Math.cos(growthAngle) * (hairLength * t)
        const py = rootY + Math.sin(growthAngle) * (hairLength * t) + curveCurvature
        const pz = rootZ + (Math.random() - 0.5) * 0.02
        points.push(px, py, pz)

        const col = t > 0.8 ? softInk : (Math.random() > 0.35 ? charcoal : deepNavy)
        cols.push(col.r, col.g, col.b)
      }
    }

    // ── 5. Canthi Sclera Fine Ink Stipples ───────────────────
    const CANTHUS_PTS = 180
    for (let c = 0; c < CANTHUS_PTS; c++) {
      const isLeft = c % 2 === 0
      const x = isLeft ? -2.7 + Math.random() * 1.4 : 1.3 + Math.random() * 1.4
      const up = getUpperLid(x)
      const low = getLowerLid(x)
      const v = 0.15 + Math.random() * 0.7
      points.push(x, low.y + (up.y - low.y) * v, -0.35 + (Math.random() - 0.5) * 0.08)
      cols.push(scleraTint.r, scleraTint.g, scleraTint.b)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
    return { geometry: geo }
  }, [])

  useFrame((state) => {
    if (!anatomyGroupRef.current) return
    const t = state.clock.elapsedTime
    anatomyGroupRef.current.position.y = Math.sin(t * 0.8) * 0.008
  })

  const dropletTexture = useMemo(() => {
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.60, 'rgba(255,255,255,0.9)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, 64)
    const tex = new THREE.CanvasTexture(canvas)
    tex.generateMipmaps = true
    return tex
  }, [])

  return (
    <group ref={anatomyGroupRef}>
      <points geometry={geometry}>
        <pointsMaterial
          map={dropletTexture}
          size={0.048}
          vertexColors
          transparent
          opacity={0.96}
          depthWrite={false}
          blending={THREE.NormalBlending}
          sizeAttenuation
        />
      </points>
    </group>
  )
}

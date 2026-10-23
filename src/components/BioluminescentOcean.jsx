import { useEffect, useMemo, useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import {
  MAX_RIPPLES,
  oceanVertexShader,
  oceanFragmentShader,
} from '../shaders/ocean.js'

const PLANE_WIDTH = 32
const PLANE_DEPTH = 32
const PLANE_Z_OFFSET = -7 // center ocean toward horizon

// Sama's Eye Anatomical Radius Dimensions
const R_PUPIL = 0.58
const R_LIMBUS = 2.25

/** Builds ocean particles with corresponding 3D anatomical coordinates on Sama's Iris */
function useOceanGeometry(resolution) {
  return useMemo(() => {
    const count = resolution * resolution
    const positions = new Float32Array(count * 3)
    const randoms = new Float32Array(count)
    const irisLocal = new Float32Array(count * 3)
    const irisData = new Float32Array(count * 3)

    const cellX = PLANE_WIDTH / resolution
    const cellZ = PLANE_DEPTH / resolution
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)) // Vogel spiral for natural phyllotaxis distribution

    let i = 0
    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        // ── 1. Base Ocean Particle Plane ─────────────────────
        positions[i * 3 + 0] = (x / resolution - 0.5) * PLANE_WIDTH + (Math.random() - 0.5) * cellX * 0.95
        positions[i * 3 + 1] = 0
        positions[i * 3 + 2] = (z / resolution - 0.5) * PLANE_DEPTH + PLANE_Z_OFFSET + (Math.random() - 0.5) * cellZ * 0.95
        randoms[i] = Math.random()

        // ── 2. Anatomical 3D Human Iris Geometry (Sama's Eye) ──
        const t = i / count
        const theta = i * goldenAngle
        const r = Math.sqrt(R_PUPIL * R_PUPIL + t * (R_LIMBUS * R_LIMBUS - R_PUPIL * R_PUPIL))
        const rNorm = (r - R_PUPIL) / (R_LIMBUS - R_PUPIL)

        // Anatomical features:
        // A. Shallow concave cone dipping inward toward center pupil (recessing into -Z):
        const concaveDip = -0.42 * Math.pow(1.0 - rNorm, 1.4)

        // B. Collarette: raised circular ridge at rNorm ~ 0.355
        const collarette = Math.exp(-Math.pow(rNorm - 0.355, 2) / (2 * 0.045 * 0.045)) * 0.18

        // C. Radial trabeculae & structural fibrous furrows
        const fiber1 = Math.sin(theta * 64 + Math.sin(theta * 8) * 2.4) * 0.038 * rNorm
        const fiber2 = Math.sin(theta * 128 + r * 18) * 0.020 * rNorm
        const fiber3 = Math.cos(theta * 32 - r * 10) * 0.014 * (1.0 - rNorm)

        // D. Fuchs' Crypts: subtle organic pit depressions near the collarette
        const cryptPit = -Math.pow(Math.cos(theta * 48) * Math.sin(theta * 24), 2) * 0.050 * Math.exp(-Math.pow(rNorm - 0.38, 2) / 0.015)

        // E. Contraction rings: concentric folds in the outer ciliary zone
        const contractionRings = Math.sin(rNorm * 36) * 0.014 * Math.max(0, rNorm - 0.42)

        const fiberTotal = fiber1 + fiber2 + fiber3
        const zDepth = concaveDip + collarette + cryptPit + contractionRings + fiberTotal * 0.35

        const rEff = r + fiberTotal * 0.65
        const localX = rEff * Math.cos(theta)
        const localY = rEff * Math.sin(theta)
        const localZ = zDepth

        irisLocal[i * 3 + 0] = localX
        irisLocal[i * 3 + 1] = localY
        irisLocal[i * 3 + 2] = localZ

        irisData[i * 3 + 0] = rNorm              // normalized radius [0, 1]
        irisData[i * 3 + 1] = theta              // polar angle
        irisData[i * 3 + 2] = fiberTotal * 14.0  // striation texture intensity

        i++
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))
    geo.setAttribute('aIrisLocal', new THREE.BufferAttribute(irisLocal, 3))
    geo.setAttribute('aIrisData', new THREE.BufferAttribute(irisData, 3))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.5, -PLANE_WIDTH / 4), PLANE_WIDTH * 1.5)
    return geo
  }, [resolution])
}

export default function BioluminescentOcean({
  onAntiGravityTrigger,
  onEyeTrigger,
  lodFactorRef,
  eyeMouseRef,
}) {
  const { gl, size } = useThree()

  // Particle count optimized for 60FPS on both mobile and desktop
  const resolution = size.width < 768 ? 260 : 380
  const geometry = useOceanGeometry(resolution)

  // Ripple ring buffer
  const ripples = useMemo(
    () => Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -1000, 0)),
    []
  )
  const rippleIndex = useRef(0)

  // Shader Uniforms
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 42 },
      uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2) },
      uIntro: { value: 1 },
      uProgress: { value: 0 },     // 0 = ocean, 1 = floating droplets
      uFormEye: { value: 0 },      // 0 = floating, 1 = 3D Iris
      uZoomProgress: { value: 0 }, // 0 = far, 1 = deep micro-zoom into text
      uRipples: { value: ripples },
      uMouse: { value: new THREE.Vector3(0, 0, 0) },
      uEyeMouse: { value: new THREE.Vector4(0, 0, 0, 0) }, // xyz = 3D world pos, w = active
      uColorDeep: { value: new THREE.Color('#7AB0D6') },
      uColorMid: { value: new THREE.Color('#4A85B2') },
      uColorBright: { value: new THREE.Color('#1E3A5F') },
      // Sama's Vibrant Blue Palette
      uIrisPupil: { value: new THREE.Color('#0A1116') },      // Pupil / Deep Center (Near black, subtle blue tint)
      uIrisMid: { value: new THREE.Color('#4A85B2') },        // Base Iris Color (Strong, vibrant mid-blue)
      uIrisHighlight: { value: new THREE.Color('#7AB0D6') },  // Highlight Color (Clear, bright light blue)
      uIrisLimbal: { value: new THREE.Color('#1E3A5F') },     // Limbal Ring (Deep navy blue)
    }),
    [ripples]
  )

  // Update uPixelRatio on resize
  useEffect(() => {
    const pr = Math.min(
      (gl && typeof gl.getPixelRatio === 'function' ? gl.getPixelRatio() : 1) ||
      (typeof window !== 'undefined' ? window.devicePixelRatio : 1) ||
      1,
      2
    )
    uniforms.uPixelRatio.value = pr
  }, [gl, size, uniforms])

  // Interaction State & Transition Controllers
  const s = useMemo(
    () => ({
      raycaster: new THREE.Raycaster(),
      plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      hit: new THREE.Vector3(),
      target: new THREE.Vector3(0, 0, 0),
      smooth: new THREE.Vector3(0, 0, 0),
      prev: new THREE.Vector3(0, 0, 0),
      lastSpawn: new THREE.Vector3(0, 0, 0),
      energy: 0,
      active: false,
      clickQueued: false,
      nextAmbient: 1.5,
      totalInteractionTime: 0,
      totalInteractionDistance: 0,
      triggeredAntiGravity: false,
      triggeredEye: false,
      eyeTimer: null,
    }),
    []
  )

  const spawnRipple = (x, z, time, strength) => {
    ripples[rippleIndex.current].set(x, z, time, strength)
    rippleIndex.current = (rippleIndex.current + 1) % MAX_RIPPLES
  }




  // Trigger Phase 3: The Geometric Transition (Sama's Eye)
  const triggerEyeFormation = useCallback(() => {
    if (s.triggeredEye) return
    s.triggeredEye = true

    if (s.eyeTimer) {
      clearTimeout(s.eyeTimer)
      s.eyeTimer = null
    }

    if (onEyeTrigger) {
      onEyeTrigger()
    }

    gsap.to(uniforms.uFormEye, {
      value: 1,
      duration: 5.8,
      ease: 'power3.inOut',
    })
  }, [s, onEyeTrigger, uniforms])

  // Trigger Phase 2: Anti-Gravity Levitation
  const triggerAntiGravity = useCallback(() => {
    if (s.triggeredAntiGravity) return
    s.triggeredAntiGravity = true

    if (onAntiGravityTrigger) {
      onAntiGravityTrigger()
    }

    gsap.to(uniforms.uProgress, {
      value: 1,
      duration: 5.2,
      ease: 'power3.inOut',
    })

    // After 3.5s of rising, magnetic eye formation smoothly begins
    s.eyeTimer = setTimeout(() => {
      triggerEyeFormation()
    }, 3500)
  }, [s, onAntiGravityTrigger, uniforms, triggerEyeFormation])

  useEffect(() => {
    return () => {
      if (s.eyeTimer) clearTimeout(s.eyeTimer)
    }
  }, [s])

  // Pointer listeners
  useEffect(() => {
    const el = gl.domElement
    const onMove = () => {
      s.active = true
    }
    const onLeave = () => {
      s.active = false
    }
    const onDown = () => {
      s.active = true
      s.clickQueued = true
      if (!s.triggeredAntiGravity) {
        triggerAntiGravity()
      } else if (!s.triggeredEye) {
        triggerEyeFormation()
      }
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('pointercancel', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('pointercancel', onLeave)
    }
  }, [gl, s, triggerEyeFormation])

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const t = state.clock.elapsedTime
    uniforms.uTime.value = t

    if (lodFactorRef) {
      uniforms.uZoomProgress.value = lodFactorRef.current
    }

    // Update 3D eye cursor position
    if (eyeMouseRef && eyeMouseRef.current) {
      uniforms.uEyeMouse.value.set(
        eyeMouseRef.current.x,
        eyeMouseRef.current.y,
        eyeMouseRef.current.z,
        eyeMouseRef.current.w || 0
      )
    }

    // Project pointer onto water plane
    s.raycaster.setFromCamera(state.pointer, state.camera)
    if (s.raycaster.ray.intersectPlane(s.plane, s.hit)) {
      s.target.copy(s.hit)
      s.target.x = THREE.MathUtils.clamp(s.target.x, -PLANE_WIDTH / 2, PLANE_WIDTH / 2)
      s.target.z = THREE.MathUtils.clamp(s.target.z, PLANE_Z_OFFSET - PLANE_DEPTH / 2, PLANE_Z_OFFSET + PLANE_DEPTH / 2)
    }

    // Smooth fluid follow
    s.smooth.lerp(s.target, 1 - Math.exp(-delta * 8.5))
    const moveDist = s.smooth.distanceTo(s.prev)
    const speed = moveDist / Math.max(delta, 1e-4)
    s.prev.copy(s.smooth)

    // Wake energy calculation
    const targetEnergy = s.active ? THREE.MathUtils.clamp(speed * 0.16, 0.2, 1.4) : 0
    const rate = targetEnergy > s.energy ? 6 : 1.5
    s.energy += (targetEnergy - s.energy) * (1 - Math.exp(-delta * rate))
    uniforms.uMouse.value.set(s.smooth.x, s.smooth.z, s.energy)

    // Ripple trail along active movement
    if (s.active && speed > 0.25 && s.smooth.distanceTo(s.lastSpawn) > 0.38) {
      spawnRipple(s.smooth.x, s.smooth.z, t, THREE.MathUtils.clamp(0.45 + speed * 0.08, 0.4, 1.25))
      s.lastSpawn.copy(s.smooth)
    }

    // Click / touch pulse
    if (s.clickQueued) {
      spawnRipple(s.target.x, s.target.z, t, 1.9)
      s.clickQueued = false
    }

    // Ambient ocean blooms
    if (t > s.nextAmbient) {
      const x = (Math.random() - 0.5) * PLANE_WIDTH * 0.8
      const z = PLANE_Z_OFFSET + (Math.random() - 0.6) * PLANE_DEPTH * 0.7
      spawnRipple(x, z, t, 0.3 + Math.random() * 0.25)
      s.nextAmbient = t + 1.8 + Math.random() * 2.4
    }

    // Interaction threshold detection:
    // Once user has moved over fluid for ~2.2s or after 10s idle fallback
    if (!s.triggeredAntiGravity) {
      if (s.active && speed > 0.1) {
        s.totalInteractionTime += delta
        s.totalInteractionDistance += moveDist
      }

      if (
        s.totalInteractionTime > 2.2 ||
        s.totalInteractionDistance > 14.0 ||
        t > 10.0
      ) {
        triggerAntiGravity()
      }
    }
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={oceanVertexShader}
        fragmentShader={oceanFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  )
}

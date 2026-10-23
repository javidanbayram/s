import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'

// Secret message attributes forming the hyper-realistic iris for Sama
const secretMessages = [
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

const EYE_CENTER = new THREE.Vector3(0.0, 2.2, -1.8)
const TILT = 0.12 // matches shader tilt ~7°
const R_PUPIL = 0.58
const R_LIMBUS = 2.25

// Deep navy blue text material for maximum readability (#1E3A5F)
function getIrisTextColor(rNorm) {
  const r = THREE.MathUtils.clamp(rNorm, 0, 1)
  const pupilDark = new THREE.Color('#0A1116')
  const deepNavy = new THREE.Color('#1E3A5F')
  return pupilDark.clone().lerp(deepNavy, 0.35 + r * 0.65)
}

/** Precomputes text node coordinates matching the exact 3D anatomical iris structure */
function useIrisTextNodes(count = 640) {
  return useMemo(() => {
    const nodes = []
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < count; i++) {
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

      const word = secretMessages[i % secretMessages.length]
      const color = getIrisTextColor(rNorm)

      const isHero = word === 'Sama'
      // Bolder, increased scale so text instances define the eye geometry clearly
      const lengthFactor = (word.length - 4) * 0.0011
      const baseSize = isHero ? 0.052 : Math.max(0.028, 0.040 - lengthFactor) + (i % 3) * 0.002

      nodes.push({
        id: i,
        word,
        localX,
        localY,
        localZ,
        rNorm,
        color: `#${color.getHexString()}`,
        size: baseSize,
      })
    }
    return nodes
  }, [count])
}

export default function IrisMemoryTexts({ lodFactorRef, lodFactor = 0, onMouseWorldUpdate }) {
  const { gl } = useThree()
  const groupRef = useRef()
  const rotGroupRef = useRef()
  const itemRefs = useRef([])
  const textMeshRefs = useRef([])
  const nodes = useIrisTextNodes(640)

  // Pre-allocated physics state (zero garbage collection pressure)
  const count = nodes.length
  const physics = useMemo(
    () => ({
      dispX: new Float32Array(count),
      dispY: new Float32Array(count),
      dispZ: new Float32Array(count),
      velX: new Float32Array(count),
      velY: new Float32Array(count),
      velZ: new Float32Array(count),
      raycaster: new THREE.Raycaster(),
      plane: new THREE.Plane(
        new THREE.Vector3(0, Math.sin(TILT), Math.cos(TILT)).normalize(),
        0
      ),
      mouseWorld: new THREE.Vector3(),
      mouseLocal: new THREE.Vector3(),
      hovered: false,
    }),
    [count]
  )

  // Configure plane coplanar point
  useEffect(() => {
    physics.plane.constant = -physics.plane.normal.dot(EYE_CENTER)
  }, [physics])

  // Pointer hover detection
  useEffect(() => {
    const el = gl.domElement
    const onEnter = () => { physics.hovered = true }
    const onLeave = () => { physics.hovered = false }
    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [gl, physics])

  // Real-time interactive text physics & magnetic spring snap-back
  useFrame((state, rawDelta) => {
    if (!rotGroupRef.current || !groupRef.current) return
    const delta = Math.min(rawDelta, 0.05)
    const t = state.clock.elapsedTime

    const currentLOD = lodFactorRef ? lodFactorRef.current : lodFactor

    // Toggle visibility smoothly without React re-renders
    if (currentLOD <= 0.005) {
      if (groupRef.current.visible) groupRef.current.visible = false
      return
    }
    if (!groupRef.current.visible) groupRef.current.visible = true

    // 1. Synchronized alive ocular rotation & hippus pupillary micro-pulsation
    const rotAngle = t * 0.045
    rotGroupRef.current.rotation.z = rotAngle
    const hippus = Math.sin(t * 0.82) * 0.040 + Math.sin(t * 1.75) * 0.018 - Math.cos(t * 0.35) * 0.014
    const dilation = 1.0 + hippus
    rotGroupRef.current.scale.set(dilation, dilation, 1.0)
    rotGroupRef.current.updateMatrixWorld()

    // 2. Project 2D pointer into 3D world space on the Iris plane
    physics.raycaster.setFromCamera(state.pointer, state.camera)
    const hasIntersection = physics.raycaster.ray.intersectPlane(physics.plane, physics.mouseWorld)

    if (hasIntersection) {
      physics.mouseLocal.copy(physics.mouseWorld)
      rotGroupRef.current.worldToLocal(physics.mouseLocal)
      if (onMouseWorldUpdate) {
        onMouseWorldUpdate(physics.mouseWorld, physics.hovered ? 1.0 : 0.0)
      }
    } else {
      if (onMouseWorldUpdate) {
        onMouseWorldUpdate(physics.mouseWorld, 0.0)
      }
    }

    // 3. Magnetic Repulsion & Spring Snap-back Loop
    const springK = 44.0     // magnetic spring pull back to rest vertex
    const damping = 9.5      // fluid viscosity (stops oscillations smoothly)
    const repelRadius = 0.46 // local space repulsion radius
    const isInteracting = physics.hovered && hasIntersection && currentLOD > 0.01

    const { dispX, dispY, dispZ, velX, velY, velZ, mouseLocal } = physics

    for (let i = 0; i < count; i++) {
      const node = nodes[i]
      const curX = node.localX + dispX[i]
      const curY = node.localY + dispY[i]
      const curZ = node.localZ + dispZ[i]

      const dx = curX - mouseLocal.x
      const dy = curY - mouseLocal.y
      const dz = curZ - mouseLocal.z
      const distSq = dx * dx + dy * dy + dz * dz

      let targetDx = 0
      let targetDy = 0
      let targetDz = 0

      // Repulsion force: words gently ripple away like droplets on water
      if (isInteracting && distSq < repelRadius * repelRadius && distSq > 1e-6) {
        const d = Math.sqrt(distSq)
        const normDist = d / repelRadius
        const force = Math.pow(1 - normDist, 2) * 0.42
        const wave = Math.sin(d * 18 - t * 8.5) * 0.040 * (1 - normDist)
        const totalForce = force + wave
        const invD = 1 / d

        targetDx = dx * invD * totalForce
        targetDy = dy * invD * totalForce
        targetDz = dz * invD * totalForce + force * 0.16
      }

      // Spring-damper physics
      const ax = -springK * (dispX[i] - targetDx) - damping * velX[i]
      const ay = -springK * (dispY[i] - targetDy) - damping * velY[i]
      const az = -springK * (dispZ[i] - targetDz) - damping * velZ[i]

      velX[i] += ax * delta
      velY[i] += ay * delta
      velZ[i] += az * delta

      dispX[i] += velX[i] * delta
      dispY[i] += velY[i] * delta
      dispZ[i] += velZ[i] * delta

      // Fast direct transform update (zero React reconciliation)
      const item = itemRefs.current[i]
      if (item) {
        item.position.set(
          node.localX + dispX[i],
          node.localY + dispY[i],
          node.localZ + dispZ[i]
        )
      }
    }
  })

  return (
    <group ref={groupRef} position={[EYE_CENTER.x, EYE_CENTER.y, EYE_CENTER.z]} rotation={[-TILT, 0, 0]}>
      <group ref={rotGroupRef}>
        {nodes.map((node, i) => (
          <group
            key={node.id}
            ref={(el) => (itemRefs.current[i] = el)}
            position={[node.localX, node.localY, node.localZ]}
          >
            <Billboard follow lockX={false} lockY={false} lockZ={false}>
              <Text
                ref={(el) => (textMeshRefs.current[i] = el)}
                fontSize={node.size}
                color={node.color}
                fontWeight="bold"
                strokeWidth={0.0012}
                strokeColor="#1E3A5F"
                fillOpacity={0.98}
                anchorX="center"
                anchorY="middle"
                letterSpacing={0.03}
                outlineWidth={0.0016}
                outlineColor="#FFFFFF"
                outlineOpacity={0.92}
              >
                {node.word}
              </Text>
            </Billboard>
          </group>
        ))}
      </group>
    </group>
  )
}

import { useRef, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Prefix with Vite's base URL so the asset resolves under the deploy sub-path
// (e.g. /Mofil/models/... on GitHub Pages) as well as at root in dev.
const MODEL_URL = `${import.meta.env.BASE_URL}models/monk-optimized.glb`

/**
 * The shadow-monk character, framed as a bust (head → chest).
 *
 * The model is a static sculpt (no rig / no animations), so motion is driven
 * by rotating + bobbing the whole group here in Three.js. The parent scene
 * passes a `scrollRef` (0..1 progress) and a `targetRotation` that we ease
 * toward on each frame.
 */
export default function MonkModel({ scrollRef, groupRef }) {
  const { scene } = useGLTF(MODEL_URL)
  const innerRef = useRef()
  const bobRef = useRef(0)

  // Enhance materials once: deepen shadows, add a touch of sheen so the
  // dark-fantasy rim light reads well.
  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        o.frustumCulled = false
        const m = o.material
        if (m) {
          m.envMapIntensity = 0.6
          if (m.metalness !== undefined) m.metalness = Math.min(m.metalness + 0.1, 1)
          if (m.roughness !== undefined) m.roughness = Math.max(m.roughness - 0.05, 0.3)
          m.needsUpdate = true
        }
      }
    })
  }, [scene])

  // Per-frame idle animation: subtle breathing bob + ease toward target yaw.
  useFrame((state, delta) => {
    bobRef.current += delta
    if (innerRef.current) {
      // gentle vertical "breathing"
      innerRef.current.position.y = BASE_Y + Math.sin(bobRef.current * 0.8) * 0.015
    }
    if (groupRef?.current) {
      const scroll = scrollRef?.current ?? 0
      // Base slow idle spin + scroll-driven turn. One full extra turn across
      // the whole page keeps it dramatic but readable for a bust.
      const targetYaw =
        Math.sin(bobRef.current * 0.15) * 0.12 + scroll * Math.PI * 2
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y,
        targetYaw,
        3,
        delta
      )
    }
  })

  return (
    <group ref={groupRef}>
      {/* innerRef holds the framing transform: scale up and push the model
          down so the camera sees head→chest (a bust crop). */}
      <group ref={innerRef} position={[0, BASE_Y, 0]} scale={MODEL_SCALE}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

// Framing constants — the model is ~0.98m tall. We scale it up and offset it
// downward so the camera, aimed at the chest/head, crops it as a bust.
const MODEL_SCALE = 3.4
const BASE_Y = -2.55

useGLTF.preload(MODEL_URL)

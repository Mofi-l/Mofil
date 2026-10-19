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
        if (m && !m.userData.__tuned) {
          // The model ships as one fully-metallic material for the whole
          // character, so the robe reflected the environment and read as a lit
          // grey/brown. Crush the albedo toward black and make the cloth fully
          // matte so it reads as true ninja black — folds just barely catch the
          // key/rim light, flats fall to black. We also cut the environment
          // contribution so it stops picking up grey from the night preset.
          if (m.color) m.color.multiplyScalar(0.18) // ~82% darker albedo
          if (m.metalness !== undefined) m.metalness = 0.05 // matte cloth
          if (m.roughness !== undefined) m.roughness = 0.92 // soft, non-shiny
          m.envMapIntensity = 0.25
          m.needsUpdate = true
          m.userData.__tuned = true
        }
      }
    })
  }, [scene])

  // Per-frame idle animation + scroll-driven staging.
  //
  // The page has 5 "stages" (hero, about, skills, projects, contact). We read
  // a continuous stage value (0..4) from scrollRef and interpolate the
  // character's horizontal position + yaw so the motion motivates where the
  // content sits:
  //
  //   stage 0 (hero)     front,  centered
  //   stage 1 (about)    turns RIGHT, slides LEFT   → content on the right
  //   stage 2 (skills)   turns LEFT,  slides RIGHT  → content on the left
  //   stage 3 (projects) faces BACK,  centered
  //   stage 4 (contact)  front,  centered
  //
  // Keyframes per stage: [xOffset (world units), yaw (radians)]
  useFrame((state, delta) => {
    bobRef.current += delta

    const scroll = scrollRef?.current ?? 0
    const stageCount = STAGES.length - 1
    const sf = scroll * stageCount // continuous stage 0..4
    const i = Math.min(Math.floor(sf), stageCount - 1)
    const f = smoothstep(sf - i) // eased 0..1 between the two keyframes

    const [x0, y0] = STAGES[i]
    const [x1, y1] = STAGES[i + 1]
    const targetX = x0 + (x1 - x0) * f
    const targetYaw = y0 + (y1 - y0) * f

    if (groupRef?.current) {
      const g = groupRef.current
      g.position.x = THREE.MathUtils.damp(g.position.x, targetX, 4, delta)
      // small idle sway layered on the staged yaw
      const yawWithSway = targetYaw + Math.sin(bobRef.current * 0.4) * 0.03
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, yawWithSway, 4, delta)
    }
    if (innerRef.current) {
      // gentle vertical "breathing"
      innerRef.current.position.y = BASE_Y + Math.sin(bobRef.current * 0.8) * 0.015
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

// Per-section staging keyframes: [horizontal offset, yaw].
//  +x = screen right, -x = screen left.
//  yaw sign is set so the character turns TOWARD the content (across the
//  frame), not away from it:
//    slid left  → content on right → turn toward right (+yaw)
//    slid right → content on left  → turn toward left  (-yaw)
//  yaw: 0 = front, Math.PI = facing away (back).
const STAGES = [
  [0, 0], // hero     — front, center
  [-1.7, 0.6], // about    — slide left,  look right → content right
  [1.7, -0.6], // skills   — slide right, look left  → content left
  [0, Math.PI], // projects — face back, center
  [0, 0], // contact  — front, center
]

// Smootherstep easing (0..1) for buttery transitions between stages.
function smoothstep(t) {
  const x = Math.min(Math.max(t, 0), 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

useGLTF.preload(MODEL_URL)

import { useRef, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Prefix with Vite's base URL so the asset resolves under the deploy sub-path
// (e.g. /Mofil/models/... on GitHub Pages) as well as at root in dev.
const MODEL_URL = `${import.meta.env.BASE_URL}models/monk-optimized.glb`

// Reusable scratch vectors for projecting the head to screen space.
const _headWorld = new THREE.Vector3()
const _headProj = new THREE.Vector3()
const _mouthWorld = new THREE.Vector3()
const _mouthProj = new THREE.Vector3()

/**
 * The shadow-monk character, framed as a bust (head → chest).
 *
 * The model is a static sculpt (no rig / no animations), so motion is driven
 * by rotating + bobbing the whole group here in Three.js. The parent scene
 * passes a `scrollRef` (0..1 progress) and a `targetRotation` that we ease
 * toward on each frame.
 */
export default function MonkModel({ scrollRef, groupRef, onReady, extinguishRef, facePosRef }) {
  const { scene } = useGLTF(MODEL_URL)
  const innerRef = useRef()
  const bobRef = useRef(0)
  const readyRef = useRef(false)
  const headRef = useRef(null) // the "head_joint" bone, for the nod
  // Cursor in normalized device coords (−1..1). Drives the head nod when the
  // torch is brought up near the face.
  const ndcRef = useRef({ x: 0, y: -1, active: false })

  useEffect(() => {
    const onMove = (e) => {
      ndcRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      ndcRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
      ndcRef.current.active = true
    }
    const onLeave = () => {
      ndcRef.current.active = false
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  // Locate the head joint (added during the auto-rig step).
  useEffect(() => {
    scene.traverse((o) => {
      if (o.name === 'head_joint') headRef.current = o
    })
  }, [scene])

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

    // Signal readiness after the first rendered frame — the model is now
    // actually visible (geometry + textures uploaded), not just downloaded.
    if (!readyRef.current) {
      readyRef.current = true
      onReady?.()
    }

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

    // ── Head bow toward the torch ──
    // When the torch (cursor) comes up to the character's face, the head/hood
    // bows DOWN — a deep bow that drops the face so the light rakes over the
    // hood (real skinned deformation; only the head moves). We anchor the
    // trigger on the head joint's ACTUAL screen position (projected each
    // frame) so it works wherever the character is framed.
    if (headRef.current) {
      const ndc = ndcRef.current
      // World position of the head joint → normalized device coords.
      headRef.current.getWorldPosition(_headWorld)
      _headProj.copy(_headWorld).project(state.camera)

      // Publish the MOUTH position in screen pixels. The head joint sits at the
      // neck; the mouth is higher, so raise the point in world space (world +Y
      // is up on screen) before projecting — this stays correct as the camera
      // dollies, unlike a fixed pixel offset.
      if (facePosRef) {
        _mouthWorld.copy(_headWorld)
        _mouthWorld.y += 0.5 // world units up from neck → mouth/face
        _mouthProj.copy(_mouthWorld).project(state.camera)
        const sx = (_mouthProj.x * 0.5 + 0.5) * window.innerWidth
        const sy = (-(_mouthProj.y) * 0.5 + 0.5) * window.innerHeight
        facePosRef.current = { x: sx, y: sy, visible: _mouthProj.z < 1 }
      }

      const dx = ndc.x - _headProj.x
      const dy = ndc.y - _headProj.y
      const dist = Math.hypot(dx, dy)
      const RADIUS = 0.42 // how close (in NDC) the torch must get to engage
      let prox = ndc.active ? Math.max(0, 1 - dist / RADIUS) : 0
      prox = prox * prox * (3 - 2 * prox) // smoothstep ease

      // "Blow out, then bow" sequence:
      //  - The flame extinguishes quickly as the torch nears the face
      //    (sharper curve, reaches 1 before full proximity).
      //  - The head bows a touch behind the snuff, as if lowering after the
      //    breath puts the flame out.
      if (extinguishRef) {
        const snuff = Math.min(1, prox * 1.6) // flame dies early/fast
        extinguishRef.current = THREE.MathUtils.damp(
          extinguishRef.current ?? 0,
          snuff,
          10,
          delta
        )
      }
      // Bow follows once the flame is mostly out.
      const ext = extinguishRef?.current ?? prox
      const bowDrive = prox * Math.max(0, (ext - 0.3) / 0.7) // lag behind snuff
      const targetBow = bowDrive * 0.785 // radians (~45° — a natural bow)
      headRef.current.rotation.x = THREE.MathUtils.damp(
        headRef.current.rotation.x,
        targetBow,
        5,
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

// Per-section staging keyframes: [horizontal offset, yaw]. One entry per
// section, in order: hero, about, experience, skills, projects, contact.
//
//  +x = screen right, -x = screen left.
//
//  Yaw is a CONTINUOUS, monotonically-increasing path so the character keeps
//  turning the SAME direction and physically pivots around (through his back)
//  between sections — instead of swinging back through the front each time.
//  Facing equivalents (mod 2π): 0 = front, +1.15 = right profile,
//  π = back, 2π-1.15 (5.13) = left profile, 2π = front.
//  Each side-content section places the character on the OPPOSITE side,
//  facing across the frame toward its panel.
const R = 1.15 // profile turn amount (~66°)
const TAU = Math.PI * 2
const STAGES = [
  [0, 0], //          hero       — front, center
  [-1.7, R], //          about      — slide left,  face right → content right
  [1.7, TAU - R], //  experience — slide right, face left  → content left  (turns around via back)
  [-1.7, TAU + R], //  skills     — slide left,  face right → content right (continues turning)
  [0, 2 * TAU], //          projects   — front, center (completes a full turn)
  [0, 2 * TAU], //          contact    — front, center
]

// Smootherstep easing (0..1) for buttery transitions between stages.
function smoothstep(t) {
  const x = Math.min(Math.max(t, 0), 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

useGLTF.preload(MODEL_URL)

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
const _v = new THREE.Vector3()
const _qYaw = new THREE.Quaternion()
const _qBow = new THREE.Quaternion()
const _AXIS_BOW = new THREE.Vector3(1, 0, 0) // bone-local X = world X (pitch)
const _AXIS_YAW = new THREE.Vector3(0, 0, 1) // rig_root-local Z = world Y (yaw)

// Neck point under the face, in the glTF scene's own (unscaled) space. The face
// sits ~0.08 left of the model's centre line, where the head joint is, so the
// joint itself can't be used as a yaw pivot.
const NECK_PIVOT = new THREE.Vector3(-0.079, 0.799, 0.0)

export default function MonkModel({ scrollRef, groupRef, onReady, extinguishRef }) {
  const { scene } = useGLTF(MODEL_URL)
  const innerRef = useRef()
  const bobRef = useRef(0)
  const readyRef = useRef(false)
  const headRef = useRef(null) // the "head_joint" bone, for the nod
  // Cursor in normalized device coords (−1..1). Drives the head nod when the
  // torch is brought up near the face.
  const ndcRef = useRef({ x: 0, y: -1, active: false })
  // Head-look pivot, built once the first frame has world matrices.
  const rigRef = useRef(null)
  const lookRef = useRef({ yaw: 0, pitch: 0 })
  const layoutRef = useRef(STAGES.map(() => ({ ndc: 0, narrow: false })))

  // Re-measure the free space beside each panel when the layout can change.
  useEffect(() => {
    const measure = () => {
      layoutRef.current = measureStages()
    }
    measure()
    const t = setTimeout(measure, 800) // after web fonts settle
    window.addEventListener('resize', measure)
    document.fonts?.ready?.then(measure)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
    }
  }, [])

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
    const sf = scroll * stageCount // continuous stage 0..5
    const i = Math.min(Math.floor(sf), stageCount - 1)
    const f = smoothstep(sf - i) // eased 0..1 between the two keyframes
    // Resolve each keyframe's world x from its measured screen position: the
    // visible half-width at the model's depth turns NDC into world units.
    const cam = state.camera
    const halfW = (z) => (cam.position.z - z) * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect
    const resolve = (k) => {
      const st = STAGES[k]
      const lay = layoutRef.current[k] ?? { ndc: 0, narrow: false }
      const z = lay.narrow && st.side !== 'center' ? NARROW_Z : st.z
      const yaw = st.yaw
      const x = lay.ndc * halfW(z) - BODY_OFFSET_X * Math.cos(yaw)
      return { x, y: st.y, z, yaw }
    }
    const a = resolve(i)
    const b = resolve(i + 1)
    const lerp = (k) => a[k] + (b[k] - a[k]) * f

    if (groupRef?.current) {
      const g = groupRef.current
      g.position.x = THREE.MathUtils.damp(g.position.x, lerp('x'), 4, delta)
      g.position.y = THREE.MathUtils.damp(g.position.y, lerp('y'), 4, delta)
      g.position.z = THREE.MathUtils.damp(g.position.z, lerp('z'), 3, delta)
      // small idle sway layered on the staged yaw
      const yawWithSway = lerp('yaw') + Math.sin(bobRef.current * 0.4) * 0.03
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, yawWithSway, 4, delta)
    }
    if (innerRef.current) {
      // Breathing: a slow chest rise (tiny scale) plus the existing bob.
      const br = Math.sin(bobRef.current * 1.25)
      innerRef.current.position.y = BASE_Y + Math.sin(bobRef.current * 0.8) * 0.015
      innerRef.current.scale.set(
        MODEL_SCALE * (1 + br * 0.0035),
        MODEL_SCALE * (1 + br * 0.006),
        MODEL_SCALE * (1 + br * 0.0035)
      )
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

      // ── Look toward the torch ──
      // Before the torch is close enough to bow, the monk tracks it with his
      // head (small yaw + tilt). Fades out as the bow takes over.
      const look = lookRef.current
      const follow = ndc.active ? 1 - Math.min(1, bowDrive * 2) : 0
      const wantYaw = THREE.MathUtils.clamp(dx * 0.35, -0.28, 0.28) * follow
      const wantPitch = THREE.MathUtils.clamp(-dy * 0.18, -0.12, 0.1) * follow
      look.yaw = THREE.MathUtils.damp(look.yaw, wantYaw, 3, delta)
      look.pitch = THREE.MathUtils.damp(look.pitch, wantPitch + targetBow, 5, delta)

      const rig = rigRef.current ?? (rigRef.current = buildRig(scene, headRef.current))
      if (rig) {
        // Compose: bow about the head joint, then yaw about the neck pivot under
        // the face, so the head turns in place instead of swinging sideways.
        _qBow.setFromAxisAngle(_AXIS_BOW, look.pitch)
        _qYaw.setFromAxisAngle(_AXIS_YAW, look.yaw)
        const bone = headRef.current
        bone.quaternion.copy(_qYaw).multiply(_qBow)
        _v.copy(rig.restPos).sub(rig.pivot).applyQuaternion(_qYaw).add(rig.pivot)
        bone.position.copy(_v)

      }
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

// Per-section staging, one entry per section: hero, about, experience,
// skills, projects, contact.
//
// Instead of spinning a full turn between sections, the monk moves to the
// empty side of each panel and turns toward it, as if reading along with the
// visitor. Over the full-width project grid he steps back into the fog, then
// comes forward beside the "Summon" card.
//
//   side: where he stands. 'left' / 'right' = centre of the free space beside
//         that section's panel (measured from the DOM, so it adapts to the
//         window width); 'center' = middle of the screen.
//   y, z: vertical offset / depth (− = further away), world units
//   yaw:  radians. A continuous, increasing path (as before) so he keeps
//         turning the same way and pivots round through his back between
//         sections: 0 = front, +R = right profile, TAU-R = left profile.
const R = 1.15 // profile turn (~66°)
const TAU = Math.PI * 2
const STAGES = [
  { side: 'center', y: -0.18, z: 0, yaw: 0 }, //       hero: a touch low so the staff clears the title
  { side: 'left', y: 0, z: 0, yaw: R }, //             about: faces right, toward the panel
  { side: 'right', y: 0, z: -0.3, yaw: TAU - R }, //   experience: faces left, toward the panel
  { side: 'left', y: 0, z: -0.3, yaw: TAU + R }, //    skills: faces right, toward the grid
  { side: 'center', y: 0.1, z: -3.2, yaw: 2 * TAU }, // projects: front, stepped back behind the cards
  { side: 'left', y: -0.2, z: 0.25, yaw: 2 * TAU }, // contact: front, beside the card
]

// If the free space beside a panel is narrower than this (fraction of the
// viewport width, e.g. phones), he stands centred and further back instead.
const MIN_GAP = 0.22
const NARROW_Z = -2.2
// Nav dots on the right edge eat into the right-hand gap.
const RIGHT_RESERVE_PX = 110
// The body's visual centre sits left of the model origin (world units at yaw 0).
const BODY_OFFSET_X = -0.28

// Screen-space target per stage: { ndc: −1..1 horizontal centre, narrow }.
function measureStages() {
  const W = window.innerWidth
  const sections = document.querySelectorAll('.section')
  return STAGES.map((st, i) => {
    if (st.side === 'center') return { ndc: 0, narrow: false }
    const panel = sections[i]?.querySelector('.panel')
    if (!panel) return { ndc: 0, narrow: true }
    const r = panel.getBoundingClientRect()
    const [lo, hi] = st.side === 'left' ? [0, r.left] : [r.right, W - RIGHT_RESERVE_PX]
    if ((hi - lo) / W < MIN_GAP) return { ndc: 0, narrow: true }
    return { ndc: ((lo + hi) / 2 / W) * 2 - 1, narrow: false }
  })
}

// Smootherstep easing (0..1) for buttery transitions between stages.
function smoothstep(t) {
  const x = Math.min(Math.max(t, 0), 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

// Builds the head-look pivot. Runs once, on the first frame (world matrices
// are valid then).
function buildRig(scene, bone) {
  if (!bone || !bone.parent) return null
  scene.updateMatrixWorld(true)
  const pivot = bone.parent.worldToLocal(scene.localToWorld(NECK_PIVOT.clone()))
  return { restPos: bone.position.clone(), pivot }
}

useGLTF.preload(MODEL_URL)

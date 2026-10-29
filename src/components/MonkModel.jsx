import { useRef, useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ENTRANCE_CLIP, CLEAR_T, END_T } from './entrance'
import { GRAB_CLIP, BLOW_CLIP, GRAB, BLOW } from './spark'

// Prefix with Vite's base URL so the asset resolves under the deploy sub-path
// (e.g. /Mofil/models/... on GitHub Pages) as well as at root in dev.
const MODEL_URL = `${import.meta.env.BASE_URL}models/monk-rigged.glb`

// Reusable scratch vectors for projecting the head to screen space.
const _headWorld = new THREE.Vector3()
const _headProj = new THREE.Vector3()
const _qLook = new THREE.Quaternion()
const _qPitch = new THREE.Quaternion()
const _qParent = new THREE.Quaternion()
const _qRoot = new THREE.Quaternion()
const _AXIS_PITCH = new THREE.Vector3(1, 0, 0) // model-space pitch (the monk faces +Z)
const _AXIS_YAW = new THREE.Vector3(0, 1, 0) // model-space yaw
const _anchor = new THREE.Vector3()
const _fwd = new THREE.Vector3()
const _up = new THREE.Vector3()
const _p = new THREE.Vector3()
const _q = new THREE.Vector3()
const _scale = new THREE.Vector3()

export default function MonkModel({ scrollRef, groupRef, onReady, sparkRef, introRef, onIntroDone }) {
  const { scene, animations } = useGLTF(MODEL_URL)
  const mixer = useMemo(() => new THREE.AnimationMixer(scene), [scene])
  const bobRef = useRef(0)
  const readyRef = useRef(false)
  const headRef = useRef(null) // the "head" bone, for the look
  const bonesRef = useRef(null) // chest + right hand, for the spark zones and the fist
  // Cursor in normalized device coords (−1..1), for the head look.
  const ndcRef = useRef({ x: 0, y: -1, active: false })
  const lookRef = useRef({ yaw: 0, pitch: 0 })
  const pointsRef = useRef({ head: {}, ref: {}, mouth: {}, a: {}, b: {}, fist: {} }) // screen px
  const layoutRef = useRef(STAGES.map(() => ({ ndc: 0, narrow: false })))
  const onIntroDoneRef = useRef(onIntroDone)
  useEffect(() => {
    onIntroDoneRef.current = onIntroDone
  }, [onIntroDone])

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

  useEffect(() => {
    headRef.current = scene.getObjectByName('head') ?? null
    // GLTFLoader strips the dots from Blender bone names (hand.R → handR).
    const bone = (n) => scene.getObjectByName(n) ?? scene.getObjectByName(n.replace('.', ''))
    const chest = bone('chest')
    const hand = bone('hand.R')
    const knuckles = bone('fing1.R')
    bonesRef.current = chest && hand && knuckles ? { chest, hand, knuckles } : null
  }, [scene])

  // Idle loops underneath; each section can play one move over it (SECTION_CLIPS), and the hero
  // opens with the Entrance clip (drop, strike, sweep, rise).
  const clipsRef = useRef(null)
  useEffect(() => {
    const idleClip = THREE.AnimationClip.findByName(animations, 'Idle')
    if (!idleClip) return undefined
    const idle = mixer.clipAction(idleClip).play()
    const once = {}
    for (const name of ONE_SHOTS) {
      const clip = THREE.AnimationClip.findByName(animations, name)
      if (!clip) continue
      const a = mixer.clipAction(clip)
      a.setLoop(THREE.LoopOnce, 1)
      a.clampWhenFinished = true
      once[name] = a
    }
    const c = { scene, idle, once, current: null, stage: -1, settled: 0, played: -1, entrance: 'pending' }
    // The entrance plays once per page load: a remount (hot reload, WebGL context restore) starts standing.
    if (introRef?.current?.done) {
      c.entrance = 'done'
      c.introDone = true
    }
    c.finishIntro = () => {
      if (c.introDone) return
      c.introDone = true
      if (introRef) introRef.current = { t: null, wide: 0, done: true }
      onIntroDoneRef.current?.()
    }
    clipsRef.current = c

    const onFinished = (e) => {
      if (e.action !== c.current) return
      if (e.action === once[ENTRANCE]) c.finishIntro()
      backToIdle(c, FADE_OUT)
    }
    mixer.addEventListener('finished', onFinished)
    return () => {
      mixer.removeEventListener('finished', onFinished)
      mixer.stopAllAction()
      mixer.uncacheRoot(scene)
      scene.visible = true
      clipsRef.current = null
    }
  }, [animations, mixer, scene, introRef])

  // Materials are authored in Blender (robe, hood cloth, bronze staff, katana). The night
  // environment is turned down, and the warm ember lights turn the robe and hood brown,
  // so those two are darkened further to read as black cloth.
  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        o.frustumCulled = false
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        for (const m of mats) {
          if (m && !m.userData.__tuned) {
            m.envMapIntensity = 0.25
            if (CLOTH.test(m.name)) {
              // Matte black cloth: the warm specular highlight, not the albedo, is what read as brown.
              m.color?.multiplyScalar(CLOTH_TINT)
              m.metalnessMap = null
              m.roughnessMap = null
              m.metalness = 0.05
              m.roughness = 0.92
            }
            m.needsUpdate = true
            m.userData.__tuned = true
          }
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
    // Clamped so a long frame (tab switch, slow first frame) can't skip through a clip.
    mixer.update(Math.min(delta, 0.1))

    // Signal readiness after the first rendered frame — the model is now
    // actually visible (geometry + textures uploaded), not just downloaded.
    if (!readyRef.current) {
      readyRef.current = true
      onReady?.()
    }

    const scroll = scrollRef?.current ?? 0
    const stageCount = STAGES.length - 1
    const sf = scroll * stageCount // continuous stage 0..5
    updateMoves(clipsRef.current, sf, delta)
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

    // Entrance progress for the camera and the dust: clip time, how wide the framing is, and the
    // ground point under the body in world space.
    const c = clipsRef.current
    let wide = 0
    if (c && introRef && !c.introDone) {
      const land = c.once[ENTRANCE]
      const t = c.entrance === 'done' && land ? land.time : null
      wide = t == null ? 1 : 1 - smoothstep((t - CLEAR_T) / (END_T - CLEAR_T))
      scene.updateWorldMatrix(true, false)
      _anchor.set(GROUND_X, 0, GROUND_Z)
      scene.localToWorld(_anchor)
      introRef.current = { t, wide, anchor: _anchor.clone() }
    }

    // ── Spark reactions + head look ──
    const head = headRef.current
    if (head) {
      const { left, top, width, height } = state.size
      const toPx = (v, out) => {
        _q.copy(v).project(cam)
        out.x = left + ((_q.x + 1) / 2) * width
        out.y = top + ((1 - _q.y) / 2) * height
        return out
      }
      const s = scene.getWorldScale(_scale).x // world units per model metre
      scene.getWorldQuaternion(_qRoot)
      _fwd.set(0, 0, 1).applyQuaternion(_qRoot)
      _up.set(0, 1, 0).applyQuaternion(_qRoot)
      head.getWorldPosition(_headWorld)

      const spark = sparkRef?.current
      const bones = bonesRef.current
      let reacting = false
      if (spark && bones && c) {
        const pts = pointsRef.current
        toPx(_headWorld, pts.head)
        toPx(_p.copy(_headWorld).addScaledVector(_up, 0.1 * s), pts.ref)
        const unit = Math.hypot(pts.ref.x - pts.head.x, pts.ref.y - pts.head.y) * 10 // px per model metre
        toPx(_p.copy(_headWorld).addScaledVector(_up, MOUTH[0] * s).addScaledVector(_fwd, MOUTH[1] * s), pts.mouth)
        toPx(_p.copy(_headWorld).addScaledVector(_up, ZONE_B[0] * s).addScaledVector(_fwd, ZONE_B[1] * s), pts.b)
        bones.chest.getWorldPosition(_p)
        toPx(_p.addScaledVector(_up, ZONE_A[0] * s).addScaledVector(_fwd, ZONE_A[1] * s), pts.a)
        bones.hand.getWorldPosition(_p)
        bones.knuckles.getWorldPosition(_q)
        toPx(_p.lerp(_q, FIST_AT), pts.fist)
        const hero = c.introDone && c.stage === 0 && sf < SETTLE_RANGE
        reactToSpark(c, spark, pts, unit, hero)
        reacting = c.current === c.once[GRAB_CLIP] || c.current === c.once[BLOW_CLIP]
      }

      // The head follows the cursor a little, except while a clip owns the head.
      const ndc = ndcRef.current
      _headProj.copy(_headWorld).project(cam)
      const dx = ndc.x - _headProj.x
      const dy = ndc.y - _headProj.y
      const look = lookRef.current
      const follow = ndc.active && !reacting ? 1 - wide : 0
      const wantYaw = THREE.MathUtils.clamp(dx * 0.35, -0.28, 0.28) * follow
      const wantPitch = THREE.MathUtils.clamp(-dy * 0.18, -0.12, 0.1) * follow
      look.yaw = THREE.MathUtils.damp(look.yaw, wantYaw, 3, delta)
      look.pitch = THREE.MathUtils.damp(look.pitch, wantPitch, 5, delta)

      // Layer the look on top of the clip pose: a model-space rotation about the neck, moved
      // into the head bone's parent space (parent⁻¹ · R · parent) so it works at any body pose.
      _qLook.setFromAxisAngle(_AXIS_YAW, look.yaw).multiply(_qPitch.setFromAxisAngle(_AXIS_PITCH, look.pitch))
      head.parent.updateWorldMatrix(true, false)
      head.parent.getWorldQuaternion(_qParent).premultiply(_qRoot.invert())
      _qLook.premultiply(_qRoot.copy(_qParent).invert()).multiply(_qParent)
      head.quaternion.premultiply(_qLook)
    }
  })

  return (
    <group ref={groupRef}>
      {/* Framing transform: scale up and push the model
          down so the camera sees head→chest (a bust crop). */}
      <group position={[0, BASE_Y, 0]} scale={MODEL_SCALE}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

// Framing constants — the model is ~0.98m tall. We scale it up and offset it
// downward so the camera, aimed at the chest/head, crops it as a bust.
const MODEL_SCALE = 3.4
// Spark points, model metres from a joint: [up, forward] and a zone radius. The face zone sits in
// front of the chin (from the neck joint), the chest zone in front of the chest joint; the fist
// is FIST_AT of the way from the wrist to the knuckles.
const MOUTH = [0.0, 0.1]
const ZONE_B = [-0.04, 0.15, 0.085]
const ZONE_A = [0.03, 0.17, 0.12]
const FIST_AT = 0.6
const RELIGHT_MARGIN = 1.3 // the spark relights once it is this far outside both zones
const COOLDOWN = 0.8 // s after a relight before the next reaction
const REACT_FADE = 0.12
// Ground point under the body (model space, metres) where the landing dust starts.
const GROUND_X = -0.08
const GROUND_Z = 0.1
// Body (Tripo atlas) and hood materials, darkened in the page lighting.
const CLOTH = /^(tripo_mat|HoodCloth)/
const CLOTH_TINT = 0.45
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

// Section moves: played once each time the visitor settles on that section (contact: a bow).
const SECTION_CLIPS = { 5: 'Bow' }
const ENTRANCE = ENTRANCE_CLIP
const ONE_SHOTS = [ENTRANCE, GRAB_CLIP, BLOW_CLIP, ...Object.values(SECTION_CLIPS)]
const ENTRANCE_DELAY = 0.9 // s after the first frame: the loader fades and the empty scene shows first
const SETTLE = 0.6 // s spent near a section before its move plays
const SETTLE_RANGE = 0.2 // how close (in stages) to the section counts as settled
const FADE_IN = 0.4
const FADE_OUT = 0.5
const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function playMove(c, name, fade = FADE_IN) {
  const next = c.once[name]
  if (!next || next === c.current) return
  const from = c.current ?? c.idle
  next.reset().setEffectiveWeight(1).play()
  from.crossFadeTo(next, fade, false)
  c.current = next
}

function backToIdle(c, fade) {
  if (!c.current) return
  c.idle.reset().setEffectiveWeight(1).play()
  c.current.crossFadeTo(c.idle, fade, false)
  c.current = null
}

function updateMoves(c, sf, delta) {
  if (!c) return
  const stage = Math.round(sf)

  // Entrance: hidden until the loader has faded (the airborne first pose hangs into the top of
  // the frame), then he drops in.
  if (c.entrance === 'pending') {
    const land = c.once[ENTRANCE]
    if (!land || REDUCED_MOTION || stage !== 0) {
      c.entrance = 'done'
      c.finishIntro()
    } else {
      land.reset().setEffectiveWeight(1).play()
      land.paused = true
      c.idle.stop()
      c.scene.visible = false
      c.current = land
      c.entrance = 0
      c.played = 0
      return
    }
  }
  if (typeof c.entrance === 'number') {
    c.entrance += delta
    if (c.entrance >= ENTRANCE_DELAY) {
      c.once[ENTRANCE].paused = false
      c.scene.visible = true
      c.entrance = 'done'
    }
    return
  }

  if (stage !== c.stage) {
    c.stage = stage
    c.settled = 0
    // Leaving a section cuts its move short so the next one starts from Idle.
    if (c.current && c.played !== stage) {
      if (c.current === c.once[ENTRANCE]) c.finishIntro()
      backToIdle(c, FADE_IN)
    }
    if (c.played !== stage) c.played = -1
  }
  if (REDUCED_MOTION || Math.abs(sf - stage) > SETTLE_RANGE) {
    c.settled = 0
    return
  }
  c.settled += delta
  const name = SECTION_CLIPS[stage]
  if (name && c.played !== stage && c.settled >= SETTLE) {
    c.played = stage
    playMove(c, name)
  }
}

// Starts Grab (chest zone) or Blow (face zone) when the lit spark enters a zone, and hands the
// spark back ('free') once it has been dark long enough and has left both zones.
function reactToSpark(c, spark, pts, unit, hero) {
  spark.mouth = pts.mouth
  spark.fist = pts.fist
  const dA = Math.hypot(spark.x - pts.a.x, spark.y - pts.a.y) / unit
  const dB = Math.hypot(spark.x - pts.b.x, spark.y - pts.b.y) / unit
  const now = performance.now()
  if (spark.mode === 'free') {
    if (!hero || c.current || REDUCED_MOTION || !spark.lit || !spark.mouse || now < spark.readyAt) return
    const zone = dB < ZONE_B[2] ? 'blow' : dA < ZONE_A[2] ? 'grab' : null
    if (!zone) return
    spark.mode = zone
    spark.start = now
    playMove(c, zone === 'grab' ? GRAB_CLIP : BLOW_CLIP, REACT_FADE)
    return
  }
  const dark = (spark.mode === 'grab' ? GRAB : BLOW).dark * 1000
  const away = dA > ZONE_A[2] * RELIGHT_MARGIN && dB > ZONE_B[2] * RELIGHT_MARGIN
  if (now - spark.start > dark && (away || !hero)) {
    spark.mode = 'free'
    spark.relit = now
    spark.readyAt = now + COOLDOWN * 1000
  }
}

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

useGLTF.preload(MODEL_URL)

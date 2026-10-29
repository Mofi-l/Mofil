import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LAND_T, SWEEP_T0, SWEEP_T1 } from './entrance'

const MAX = 160
const PEAK_ALPHA = 0.32
const COLOR = new THREE.Color(0.25, 0.235, 0.225)

// Soft, lumpy puff: a few overlapping radial blobs.
function makePuffTexture() {
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const r = i === 0 ? 0 : s * (0.12 + 0.08 * Math.sin(i * 2.3))
    const x = s / 2 + Math.cos(a) * r
    const y = s / 2 + Math.sin(a) * r
    const rad = s * (i === 0 ? 0.42 : 0.26)
    const grd = g.createRadialGradient(x, y, 0, x, y, rad)
    grd.addColorStop(0, 'rgba(255,255,255,0.55)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, s, s)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.NoColorSpace
  return t
}

const vert = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aRot;
  uniform float uScale;
  varying float vAlpha;
  varying float vRot;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / -mv.z;
    vAlpha = aAlpha;
    vRot = aRot;
  }
`
const frag = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  varying float vAlpha;
  varying float vRot;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float c = cos(vRot), s = sin(vRot);
    p = mat2(c, -s, s, c) * p + 0.5;
    float a = texture2D(uMap, p).a * vAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
  }
`

/**
 * Landing dust for the entrance, driven by introRef.current = { t, anchor } from MonkModel:
 * a ring bursts out from the feet as he lands, the staff strike pushes two jets out to the left
 * and right at the same moment, and the upward sweep blows everything out and up until it's gone.
 */
export default function DustBurst({ introRef }) {
  const { size, camera, gl } = useThree()
  const lastT = useRef(-1)
  const parts = useRef([])
  const pointsRef = useRef(null)

  const { geom, mat } = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3))
    geom.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(MAX), 1))
    geom.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(MAX), 1))
    geom.setAttribute('aRot', new THREE.BufferAttribute(new Float32Array(MAX), 1))
    geom.setDrawRange(0, 0)
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: { uMap: { value: makePuffTexture() }, uColor: { value: COLOR }, uScale: { value: 1 } },
      transparent: true,
      depthWrite: false,
    })
    return { geom, mat }
  }, [])

  useFrame((_, delta) => {
    const pts = pointsRef.current
    if (!pts) return
    const intro = introRef?.current
    const t = intro?.t ?? null
    const list = parts.current
    const dt = Math.min(delta, 0.05)

    if (t != null && intro.anchor) {
      const o = intro.anchor
      if (lastT.current < LAND_T && t >= LAND_T) spawnLanding(list, o)
      if (lastT.current < SWEEP_T0 && t >= SWEEP_T0) blowAway(list, o, SWEEP_T0, SWEEP_T1)
    } else if (list.length && !list.blown) {
      // The entrance was cut short: clear what's left rather than leave it hanging.
      blowAway(list, list.origin, 0, 0.3)
    }
    lastT.current = t ?? -1

    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i]
      p.age += dt
      if (p.blowAt != null) p.blowAge = (p.blowAge ?? -p.blowAt) + dt
      if (p.blowAge != null && p.blowAge > 0 && !p.pushed) {
        p.vel.add(p.push)
        p.pushed = true
      }
      const fade = p.blowAge != null && p.blowAge > 0 ? 1 - smooth(p.blowAge / p.blowLen) : 1
      if (fade <= 0 || p.age > 6) {
        list.splice(i, 1)
        continue
      }
      p.vel.multiplyScalar(Math.exp(-p.drag * dt))
      p.vel.y += p.lift * dt
      p.pos.addScaledVector(p.vel, dt)
      if (p.pos.y < p.floor) p.pos.y = p.floor
      p.size = p.size1 - (p.size1 - p.size0) * Math.exp(-p.age * p.grow)
      p.alpha = PEAK_ALPHA * p.peak * smooth(p.age / 0.12) * fade
      p.rot += p.spin * dt
    }
    if (!list.length) list.blown = false

    const { geometry, material } = pts
    const pos = geometry.attributes.position.array
    const sz = geometry.attributes.aSize.array
    const al = geometry.attributes.aAlpha.array
    const ro = geometry.attributes.aRot.array
    const n = Math.min(list.length, MAX)
    for (let i = 0; i < n; i++) {
      const p = list[i]
      pos[i * 3] = p.pos.x
      pos[i * 3 + 1] = p.pos.y
      pos[i * 3 + 2] = p.pos.z
      sz[i] = p.size
      al[i] = p.alpha
      ro[i] = p.rot
    }
    geometry.setDrawRange(0, n)
    for (const k of ['position', 'aSize', 'aAlpha', 'aRot']) geometry.attributes[k].needsUpdate = true
    material.uniforms.uScale.value =
      (size.height * gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
  })

  return <points ref={pointsRef} geometry={geom} material={mat} frustumCulled={false} renderOrder={2} />
}

function puff(o, vel, opts) {
  return {
    pos: new THREE.Vector3(o.x + (opts.dx ?? 0), o.y + (opts.dy ?? 0.15), o.z + (opts.dz ?? 0)),
    vel,
    age: -(opts.delay ?? 0),
    size0: opts.size0,
    size1: opts.size1,
    size: opts.size0,
    grow: opts.grow ?? 1.4,
    drag: opts.drag ?? 2.2,
    lift: opts.lift ?? 0.12,
    floor: o.y + 0.05,
    peak: (opts.peak ?? 1) * (0.55 + Math.random() * 0.45),
    rot: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.6,
    alpha: 0,
  }
}

function spawnLanding(list, o) {
  list.length = 0
  list.origin = o.clone()
  list.blown = false
  // Ring kicked out by the feet.
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + Math.random() * 0.2
    const sp = 1.6 + Math.random() * 2.2
    const v = new THREE.Vector3(Math.cos(a) * sp, 0.25 + Math.random() * 0.6, Math.sin(a) * sp * 0.7)
    list.push(puff(o, v, { size0: 0.5, size1: 1.5 + Math.random() * 0.9, dx: Math.cos(a) * 0.3, dz: Math.sin(a) * 0.2 }))
  }
  // Dense core around the feet.
  for (let i = 0; i < 16; i++) {
    const v = new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.5)
    list.push(puff(o, v, { size0: 0.8, size1: 2.0 + Math.random() * 0.8, peak: 0.8, dy: 0.3 }))
  }
  // The staff strike: two jets pushed out to each side along the ground, both at once.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 28; i++) {
      const sp = 3.5 + Math.random() * 3.5
      const v = new THREE.Vector3(side * sp, 0.1 + Math.random() * 0.35, (Math.random() - 0.5) * 0.9)
      list.push(
        puff(o, v, { size0: 0.35, size1: 1.0 + Math.random() * 0.8, drag: 1.8, dx: side * 0.2, dy: 0.08, delay: Math.random() * 0.05 })
      )
    }
  }
}

// Every puff gets shoved out from under him and up, a touch staggered by distance, and fades out.
function blowAway(list, o, t0, t1) {
  if (!o) return
  list.blown = true
  const span = Math.max(0.05, t1 - t0)
  for (const p of list) {
    const d = new THREE.Vector3(p.pos.x - o.x, 0, p.pos.z - o.z)
    const dist = d.length()
    if (dist < 1e-3) d.set(Math.random() - 0.5, 0, Math.random() - 0.5)
    d.normalize()
    const near = Math.max(0, 1 - dist / 4)
    p.push = new THREE.Vector3(d.x * (3 + 4 * near), 1.2 + 2.0 * near, d.z * (2 + 2 * near))
    p.blowAt = span * 0.5 * (dist / 4)
    p.blowLen = span * 0.6 + 0.3
    p.blowAge = null
    p.pushed = false
    p.drag = 1.2
  }
}

function smooth(x) {
  const t = Math.min(Math.max(x, 0), 1)
  return t * t * (3 - 2 * t)
}

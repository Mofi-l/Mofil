import { useEffect, useRef } from 'react'
import { GRAB, BLOW } from './spark'

/**
 * Screen-space "torch" cursor.
 *
 *  - The flame eases toward the pointer (it lags slightly), leaving a smooth
 *    tapered light trail along its recent path — bright/wide at the head,
 *    thin/faint at the tail. Faster movement stretches the trail longer.
 *  - A layered flame head (soft outer glow + warm mid + bright inner core)
 *    with organic, wave-driven flicker reads as a small living flame rather
 *    than a plain dot.
 *  - A few embers peel off as it moves.
 *  - After ~30s fully idle the flame burns down and dies out over a few
 *    seconds; moving the pointer relights it instantly.
 *  - Spark reactions (sparkRef.mode, set by MonkModel): 'grab' pulls the
 *    spark into the closing fist, flares and leaves a wisp of smoke; 'blow'
 *    sends a breeze from the mouth that makes it flicker and go dark. Back to
 *    'free', it relights on the cursor with a small pop.
 *
 * Full-screen <canvas> above the 3D scene; additive blending for fire/trail.
 */
export default function TorchCursor({ sparkRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)

    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    // Raw pointer + eased flame position (the flame chases the pointer).
    const pointer = { x: w / 2, y: h / 2 }
    const flame = { x: w / 2, y: h / 2, vx: 0, vy: 0 }
    let hasPointer = false
    let lastMoveAt = performance.now()

    const onMove = (e) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      lastMoveAt = performance.now()
      hasPointer = true
      const sp = sparkRef?.current
      if (sp) sp.mouse = e.pointerType === 'mouse' || e.pointerType === 'pen'
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    // Trail: ring of recent flame positions, newest first. Rendered as a
    // smooth tapered streak so motion feels fluid.
    const TRAIL_MAX = 26
    const trail = []

    const fire = [] // embers
    const smoke = [] // wisps from a snuffed spark
    const gust = [] // breeze streaks

    const BURN_START_MS = 30000
    const BURN_FADE_MS = 6000

    const spawnFire = (x, y, speed, burn) => {
      const n = Math.max(0, Math.round((0.4 + Math.min(2.0, speed * 0.1)) * burn))
      for (let i = 0; i < n; i++) {
        fire.push({
          x: x + (Math.random() - 0.5) * 4,
          y: y + (Math.random() - 0.5) * 4,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4 - 0.25,
          life: 0,
          maxLife: 320 + Math.random() * 260,
          size: 1.2 + Math.random() * 1.8,
          hue: 18 + Math.random() * 22,
        })
      }
    }

    const spawnSmoke = (x, y, n, spread) => {
      for (let i = 0; i < n; i++) {
        smoke.push({
          x: x + (Math.random() - 0.5) * spread,
          y,
          vx: (Math.random() - 0.5) * 0.012,
          vy: -0.028 - Math.random() * 0.02,
          life: 0,
          maxLife: 900 + Math.random() * 700,
          size: 1.6 + Math.random() * 1.4,
          phase: Math.random() * 6.28,
        })
      }
    }
    // Breath: a soft widening plume of air (faint puffs that grow and slow as they travel) with a
    // few long wind lines sweeping through it, from the mouth toward the spark.
    const spawnBreath = (from, to) => {
      const d = Math.hypot(to.x - from.x, to.y - from.y) || 1
      const base = Math.atan2(to.y - from.y, to.x - from.x)
      const ang = base + (Math.random() - 0.5) * 0.4
      const sp = BLOW.speed * (0.75 + Math.random() * 0.35)
      gust.push({
        kind: 'puff',
        x: from.x, y: from.y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        life: 0, maxLife: (d / sp) * 1.25 + 200,
        r1: 12 + d * 0.12 + Math.random() * 6,
      })
    }
    const spawnWindLine = (from, to) => {
      const d = Math.hypot(to.x - from.x, to.y - from.y) || 1
      gust.push({
        kind: 'line',
        x0: from.x, y0: from.y, x1: to.x, y1: to.y, d,
        bend: (Math.random() - 0.5) * 0.35 * d,
        off: (Math.random() - 0.5) * 8,
        life: 0, maxLife: (d / BLOW.speed) * 1.4 + 160,
      })
    }

    let mode = 'free'
    let relitAt = -1e9
    let snuffed = false // the blown spark has gone out (smoke and embers spawned once)
    let last = performance.now()
    let raf

    const frame = (now) => {
      const dt = Math.min(48, now - last)
      last = now
      const t = now / 1000

      // Ease the flame toward the pointer (frame-rate independent). A softer
      // factor gives a longer, smoother lag/trail.
      const ease = 1 - Math.pow(0.0022, dt / 16.67)
      const fx = flame.x + (pointer.x - flame.x) * ease
      const fy = flame.y + (pointer.y - flame.y) * ease
      flame.vx = fx - flame.x
      flame.vy = fy - flame.y
      flame.x = fx
      flame.y = fy
      const flameSpeed = Math.hypot(flame.vx, flame.vy)

      const idleFor = now - lastMoveAt
      let burn = 1
      if (idleFor > BURN_START_MS) {
        burn = Math.max(0, 1 - (idleFor - BURN_START_MS) / BURN_FADE_MS)
      }
      // ── Spark reactions ──
      const spark = sparkRef?.current
      const next = spark?.mode ?? 'free'
      if (next !== mode) {
        if (next === 'free') relitAt = now
        trail.length = 0
        snuffed = false
        mode = next
      }
      const e = spark ? (now - spark.start) / 1000 : 0
      let sx = flame.x
      let sy = flame.y
      let flare = 0
      if (mode === 'grab') {
        const f = spark.fist
        const k = f ? smooth((e - GRAB.pull) / (GRAB.catch - GRAB.pull)) : 0
        sx += (f ? f.x - sx : 0) * k
        sy += (f ? f.y - sy : 0) * k
        if (e >= GRAB.catch) {
          const u = (e - GRAB.catch) / GRAB.flare
          flare = u < 1 ? Math.sin(Math.min(1, u * 2.5) * Math.PI * 0.5) * (1 - u) : 0
          burn = u < 1 ? 1 - u * u : 0
        }
        if (f && e > GRAB.wisp[0] && e < GRAB.wisp[1]) {
          const left = 1 - (e - GRAB.wisp[0]) / (GRAB.wisp[1] - GRAB.wisp[0])
          if (Math.random() < dt * 0.02 * left) spawnSmoke(f.x, f.y - 4, 1, 6)
        }
      } else if (mode === 'blow') {
        const m = spark.mouth
        const dist = m ? Math.hypot(flame.x - m.x, flame.y - m.y) : 0
        const hit = BLOW.gust[0] + dist / BLOW.speed / 1000
        if (m && e > BLOW.gust[0] && e < BLOW.gust[1]) {
          const n = Math.floor(dt * 0.18 + Math.random())
          for (let i = 0; i < n; i++) spawnBreath(m, flame)
          if (Math.random() < dt * 0.012) spawnWindLine(m, flame)
        }
        if (e > hit && m) {
          const u = Math.min(1, (e - hit) / BLOW.fade)
          const ux = (flame.x - m.x) / (dist || 1)
          const uy = (flame.y - m.y) / (dist || 1)
          sx += ux * 12 * smooth(u)
          sy += uy * 12 * smooth(u)
          burn *= u < 1 ? (1 - u) * (0.45 + Math.random() * 0.55) : 0
          if (u >= 1 && !snuffed) {
            snuffed = true
            spawnSmoke(sx, sy, 3, 3)
            for (let i = 0; i < 4; i++) {
              fire.push({
                x: sx, y: sy,
                vx: ux * (0.08 + Math.random() * 0.1) + (Math.random() - 0.5) * 0.05,
                vy: uy * (0.08 + Math.random() * 0.1) + (Math.random() - 0.5) * 0.05,
                life: 0, maxLife: 260 + Math.random() * 200, size: 1 + Math.random(), hue: 22 + Math.random() * 14,
              })
            }
          }
        }
      }
      const pop = Math.max(0, 1 - (now - relitAt) / RELIGHT_MS)
      if (mode === 'free') burn *= 1 - pop * pop * pop
      if (spark) {
        spark.x = flame.x
        spark.y = flame.y
        spark.lit = hasPointer && mode === 'free' && burn > 0.5
      }

      // Record the trail head (the spark held in the fist or blown out leaves none).
      if (hasPointer && mode === 'free') {
        trail.unshift({ x: flame.x, y: flame.y })
        if (trail.length > TRAIL_MAX) trail.pop()
      }

      // Embers while moving + faint idle flicker.
      if (hasPointer && burn > 0.02 && mode === 'free') {
        if (flameSpeed > 0.4) spawnFire(flame.x, flame.y, flameSpeed, burn)
        else if (Math.random() < 0.14 * burn) spawnFire(flame.x, flame.y, 1, burn)
      }

      ctx.clearRect(0, 0, w, h)

      // ── Smoke wisps and breeze, normal blending (smoke must not glow) ──
      for (let i = smoke.length - 1; i >= 0; i--) {
        const p = smoke[i]
        p.life += dt
        const tt = p.life / p.maxLife
        if (tt >= 1) { smoke.splice(i, 1); continue }
        p.x += (p.vx + Math.sin(p.phase + p.life * 0.004) * 0.012) * dt
        p.y += p.vy * dt
        const r = p.size * (1 + tt * 2.2)
        const a = 0.22 * Math.sin(Math.min(1, tt * 4) * Math.PI * 0.5) * (1 - tt)
        drawGlow(ctx, p.x, p.y, r, [
          [0, `rgba(185,182,178,${a})`],
          [1, 'rgba(150,150,150,0)'],
        ])
      }
      ctx.lineCap = 'round'
      for (let i = gust.length - 1; i >= 0; i--) {
        const p = gust[i]
        p.life += dt
        const tt = p.life / p.maxLife
        if (tt >= 1) { gust.splice(i, 1); continue }
        const env = Math.sin(Math.min(1, tt * 3) * Math.PI * 0.5) * (1 - tt) * (1 - tt)
        if (p.kind === 'puff') {
          const drag = Math.pow(0.9985, dt)
          p.vx *= drag
          p.vy *= drag
          p.x += p.vx * dt
          p.y += p.vy * dt
          drawGlow(ctx, p.x, p.y, 3 + p.r1 * Math.sqrt(tt), [
            [0, `rgba(205,214,228,${0.06 * env})`],
            [1, 'rgba(205,214,228,0)'],
          ])
        } else {
          // Head runs along a gentle curve; the tail follows a little behind.
          const head = Math.min(1, tt * 1.35)
          const tail = Math.max(0, head - 0.45)
          const nx = -(p.y1 - p.y0) / p.d
          const ny = (p.x1 - p.x0) / p.d
          const at = (u) => {
            const k = p.bend * u * (1 - u) * 4 + p.off * (1 + u)
            return [p.x0 + (p.x1 - p.x0) * u + nx * k, p.y0 + (p.y1 - p.y0) * u + ny * k]
          }
          const steps = 10
          ctx.lineWidth = 0.9
          for (let j = 0; j < steps; j++) {
            const u0 = tail + ((head - tail) * j) / steps
            const u1 = tail + ((head - tail) * (j + 1)) / steps
            const [ax, ay] = at(u0)
            const [bx, by] = at(u1)
            ctx.strokeStyle = `rgba(215,224,236,${0.13 * env * ((j + 1) / steps)})`
            ctx.beginPath()
            ctx.moveTo(ax, ay)
            ctx.lineTo(bx, by)
            ctx.stroke()
          }
        }
      }

      ctx.globalCompositeOperation = 'lighter'
      if (hasPointer && burn > 0.02 && trail.length > 1) {
        // Longer, thinner streak when moving fast; tight glow when slow.
        const stretch = Math.min(1, flameSpeed / 22)
        const used = Math.max(2, Math.round(trail.length * (0.35 + stretch * 0.65)))
        for (let i = used - 1; i >= 0; i--) {
          const p = trail[i]
          const u = i / used // 0 head → 1 tail
          const fade = (1 - u) * (1 - u) // ease-out taper
          const r = (3 + (1 - u) * 7) * (0.5 + burn * 0.5)
          const a = 0.26 * fade * burn
          const hue = 30 - u * 12 // amber head → deep orange tail
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
          g.addColorStop(0, `hsla(${hue}, 100%, 60%, ${a})`)
          g.addColorStop(1, 'hsla(20,100%,40%,0)')
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // ── Embers, additive ──
      for (let i = fire.length - 1; i >= 0; i--) {
        const p = fire[i]
        p.life += dt
        const tt = p.life / p.maxLife
        if (tt >= 1) { fire.splice(i, 1); continue }
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy -= 0.0008 * dt
        const alpha = (1 - tt) * 0.5
        const size = p.size * (1 - tt * 0.5)
        const hue = p.hue - tt * 14
        const light = 55 - tt * 25
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2.4)
        g.addColorStop(0, `hsla(${hue}, 100%, ${light}%, ${alpha})`)
        g.addColorStop(0.4, `hsla(${hue - 6}, 100%, ${light - 15}%, ${alpha * 0.5})`)
        g.addColorStop(1, 'hsla(0,0%,0%,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, size * 2.4, 0, Math.PI * 2)
        ctx.fill()
      }

      // ── Flame head: layered glow with organic, wave-driven flicker. The
      // body stretches slightly into a teardrop pointing up + opposite motion.
      if (hasPointer && pop > 0 && mode === 'free') {
        drawGlow(ctx, flame.x, flame.y, 6 + (1 - pop) * 18, [
          [0, `rgba(255,200,120,${0.35 * pop})`],
          [1, 'rgba(255,120,30,0)'],
        ])
      }
      if (flare > 0) {
        drawGlow(ctx, sx, sy, 10 + flare * 26, [
          [0, `rgba(255,236,190,${0.75 * flare})`],
          [0.35, `rgba(255,160,60,${0.4 * flare})`],
          [1, 'rgba(255,90,0,0)'],
        ])
      }
      if (hasPointer && burn > 0.02) {
        // Smooth multi-wave flicker (no harsh jitter).
        const flick =
          0.86 +
          Math.sin(t * 17) * 0.06 +
          Math.sin(t * 31 + 1.3) * 0.04 +
          Math.sin(t * 7) * 0.04
        const base = (0.45 + burn * 0.55) * flick

        // Outer soft halo
        drawGlow(ctx, sx, sy, 16 * base, [
          [0, `rgba(255,150,60,${0.14 * burn})`],
          [1, 'rgba(255,90,0,0)'],
        ])
        // Warm mid flame
        drawGlow(ctx, sx, sy - 1 * base, 8 * base, [
          [0, `rgba(255,180,90,${0.34 * burn})`],
          [0.6, `rgba(255,120,30,${0.22 * burn})`],
          [1, 'rgba(255,80,0,0)'],
        ])
        // Bright inner core (hot white-gold), nudged up for a flame tip
        drawGlow(ctx, sx, sy - 2 * base, 3.6 * base, [
          [0, `rgba(255,244,210,${0.6 * burn})`],
          [1, 'rgba(255,180,80,0)'],
        ])
      }

      ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [sparkRef])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 3,
        pointerEvents: 'none',
      }}
    />
  )
}

const RELIGHT_MS = 320

function smooth(t) {
  const x = Math.min(Math.max(t, 0), 1)
  return x * x * (3 - 2 * x)
}

// Small helper: radial-gradient filled circle.
function drawGlow(ctx, x, y, r, stops) {
  if (r <= 0) return
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  for (const [offset, color] of stops) g.addColorStop(offset, color)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

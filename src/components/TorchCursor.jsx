import { useEffect, useRef } from 'react'

/**
 * Screen-space "torch" cursor.
 *
 *  - While the pointer moves, it drags a subtle glowing fire tail (a few warm
 *    embers that spawn along the path and fade out behind the cursor).
 *  - When the pointer goes idle, the flame settles and smoke wisps rise from
 *    the cursor's resting position (a torch held still, smoking).
 *  - After ~30s fully idle, the flame burns down and dies out over a few
 *    seconds. Moving the pointer relights it instantly.
 *
 * Drawn on a full-screen <canvas> above the 3D scene, with additive blending
 * for the fire and normal blending for smoke.
 */
export default function TorchCursor() {
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

    // Pointer state
    const pointer = { x: w / 2, y: h / 2, px: w / 2, py: h / 2 }
    let hasPointer = false
    let lastMoveAt = performance.now()

    const onMove = (e) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      lastMoveAt = performance.now()
      hasPointer = true
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    // Particle pools
    /** fire embers: {x,y,vx,vy,life,maxLife,size,hue} */
    const fire = []
    /** smoke puffs: {x,y,vx,vy,life,maxLife,size,rot} */
    const smoke = []

    const IDLE_MS = 320 // cursor considered idle after this gap
    const BURN_START_MS = 30000 // after 30s idle the flame begins to burn down
    const BURN_FADE_MS = 6000 // ...and dies out over this long

    const spawnFire = (x, y, speed, burn) => {
      // Calmer tail: fewer embers, and even fewer as the torch burns down.
      const n = Math.max(0, Math.round((0.5 + Math.min(2.5, speed * 0.12)) * burn))
      for (let i = 0; i < n; i++) {
        fire.push({
          x: x + (Math.random() - 0.5) * 4,
          y: y + (Math.random() - 0.5) * 4,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4 - 0.25, // slight upward bias
          life: 0,
          maxLife: 320 + Math.random() * 260,
          size: 1.3 + Math.random() * 2.0,
          hue: 18 + Math.random() * 22, // orange → amber
        })
      }
    }

    const spawnSmoke = (x, y) => {
      smoke.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y - 2,
        vx: (Math.random() - 0.5) * 0.14,
        vy: -0.25 - Math.random() * 0.25, // rise
        life: 0,
        maxLife: 1400 + Math.random() * 1200,
        size: 10 + Math.random() * 14,
        rot: Math.random() * Math.PI,
      })
    }

    let smokeAccumulator = 0
    let last = performance.now()
    let raf

    const frame = (now) => {
      const dt = Math.min(48, now - last)
      last = now

      // distance moved since last frame → torch speed
      const dx = pointer.x - pointer.px
      const dy = pointer.y - pointer.py
      const speed = Math.hypot(dx, dy)
      pointer.px = pointer.x
      pointer.py = pointer.y

      const idleFor = now - lastMoveAt
      const idle = idleFor > IDLE_MS

      // Burn-down: full flame until 30s idle, then fade to a dead ember over
      // the next few seconds. Any pointer move resets lastMoveAt → burn = 1.
      let burn = 1
      if (idleFor > BURN_START_MS) {
        burn = Math.max(0, 1 - (idleFor - BURN_START_MS) / BURN_FADE_MS)
      }

      // Spawn fire while moving (and a faint flicker even at rest), scaled by
      // the burn factor so a long-idle torch stops throwing embers.
      if (hasPointer && burn > 0.02) {
        if (speed > 0.5) spawnFire(pointer.x, pointer.y, speed, burn)
        else if (Math.random() < 0.18 * burn) spawnFire(pointer.x, pointer.y, 1, burn)
      }

      // Spawn smoke only when idle, from the resting cursor spot. As the torch
      // burns down the smoke also thins out.
      if (hasPointer && idle) {
        smokeAccumulator += dt
        if (smokeAccumulator > 90 && Math.random() < 0.4 + burn * 0.6) {
          smokeAccumulator = 0
          spawnSmoke(pointer.x, pointer.y)
        }
      }

      // Clear
      ctx.clearRect(0, 0, w, h)

      // ── Smoke (behind the flame), normal blending ──
      ctx.globalCompositeOperation = 'source-over'
      for (let i = smoke.length - 1; i >= 0; i--) {
        const p = smoke[i]
        p.life += dt
        const t = p.life / p.maxLife
        if (t >= 1) {
          smoke.splice(i, 1)
          continue
        }
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx += (Math.random() - 0.5) * 0.004 * dt // waver
        const grow = p.size * (1 + t * 1.8)
        // fade in then out
        const alpha = Math.sin(Math.min(t, 1) * Math.PI) * 0.14
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, grow)
        g.addColorStop(0, `rgba(120,124,132,${alpha})`)
        g.addColorStop(1, 'rgba(120,124,132,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, grow, 0, Math.PI * 2)
        ctx.fill()
      }

      // ── Fire tail, additive blending ──
      ctx.globalCompositeOperation = 'lighter'
      for (let i = fire.length - 1; i >= 0; i--) {
        const p = fire[i]
        p.life += dt
        const t = p.life / p.maxLife
        if (t >= 1) {
          fire.splice(i, 1)
          continue
        }
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy -= 0.0008 * dt // embers drift up as they cool
        const alpha = (1 - t) * 0.5
        const size = p.size * (1 - t * 0.5)
        // hue shifts from orange toward dark red as the ember cools
        const hue = p.hue - t * 14
        const light = 55 - t * 25
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2.6)
        g.addColorStop(0, `hsla(${hue}, 100%, ${light}%, ${alpha})`)
        g.addColorStop(0.4, `hsla(${hue - 6}, 100%, ${light - 15}%, ${alpha * 0.5})`)
        g.addColorStop(1, 'hsla(0,0%,0%,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, size * 2.6, 0, Math.PI * 2)
        ctx.fill()
      }

      // Soft core flame at the cursor itself (the torch head) — subtle, and it
      // burns down to nothing after a long idle.
      if (hasPointer && burn > 0.02) {
        const flicker = 0.8 + Math.random() * 0.2
        const coreR = 7 * flicker * (0.4 + burn * 0.6)
        const g = ctx.createRadialGradient(
          pointer.x, pointer.y, 0,
          pointer.x, pointer.y, coreR
        )
        g.addColorStop(0, `rgba(255,236,196,${0.5 * flicker * burn})`)
        g.addColorStop(0.45, `rgba(255,140,45,${0.38 * flicker * burn})`)
        g.addColorStop(1, 'rgba(255,70,0,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(pointer.x, pointer.y, coreR, 0, Math.PI * 2)
        ctx.fill()
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
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 3, // above the 3D canvas + vignette, below content panels (z 2 content is pointer-events only)
        pointerEvents: 'none',
      }}
    />
  )
}

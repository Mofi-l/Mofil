import { useEffect, useRef } from 'react'

/**
 * Screen-space "torch" cursor.
 *
 *  - While the pointer moves, it drags a glowing fire tail (warm particles
 *    that spawn along the path and fade out behind the cursor, like embers
 *    streaming off a swung torch).
 *  - When the pointer goes idle, the flame settles and smoke wisps begin to
 *    rise from the cursor's resting position (a torch held still, smoking).
 *
 * Drawn on a full-screen <canvas> above the 3D scene but below the content
 * panels, with additive blending for the fire and normal blending for smoke.
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

    const spawnFire = (x, y, speed) => {
      // more embers when moving faster (torch swung harder)
      const n = 1 + Math.min(6, Math.floor(speed * 0.25))
      for (let i = 0; i < n; i++) {
        fire.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6 - 0.3, // slight upward bias
          life: 0,
          maxLife: 380 + Math.random() * 320,
          size: 2 + Math.random() * 3.5,
          hue: 18 + Math.random() * 24, // orange → amber
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

      const idle = now - lastMoveAt > IDLE_MS

      // Spawn fire while moving (and a tiny flicker even at rest).
      if (hasPointer) {
        if (speed > 0.5) spawnFire(pointer.x, pointer.y, speed)
        else if (Math.random() < 0.3) spawnFire(pointer.x, pointer.y, 1)
      }

      // Spawn smoke only when idle, from the resting cursor spot.
      if (hasPointer && idle) {
        smokeAccumulator += dt
        if (smokeAccumulator > 90) {
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
        const alpha = (1 - t) * 0.9
        const size = p.size * (1 - t * 0.5)
        // hue shifts from orange toward dark red as the ember cools
        const hue = p.hue - t * 14
        const light = 60 - t * 25
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3)
        g.addColorStop(0, `hsla(${hue}, 100%, ${light}%, ${alpha})`)
        g.addColorStop(0.4, `hsla(${hue - 6}, 100%, ${light - 15}%, ${alpha * 0.5})`)
        g.addColorStop(1, 'hsla(0,0%,0%,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // Bright core flame at the cursor itself (the torch head).
      if (hasPointer) {
        const flicker = 0.75 + Math.random() * 0.25
        const coreR = 10 * flicker
        const g = ctx.createRadialGradient(
          pointer.x, pointer.y, 0,
          pointer.x, pointer.y, coreR
        )
        g.addColorStop(0, `rgba(255,240,200,${0.9 * flicker})`)
        g.addColorStop(0.4, `rgba(255,150,40,${0.7 * flicker})`)
        g.addColorStop(1, 'rgba(255,80,0,0)')
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

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Subtle background smoke/haze: a handful of large, soft, low-opacity puffs
 * that drift slowly upward and gently fade in and out (so the haze seems to
 * rise and clear). Sits behind the character and stays deliberately faint —
 * atmosphere, not a weather effect.
 */
function makeSoftTexture() {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.25)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

export default function Smoke({ count = 14 }) {
  const pointsRef = useRef()
  const matRef = useRef()
  const texture = useMemo(makeSoftTexture, [])

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 12
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = -0.5 - Math.random() * 4 // around/behind the character, close enough to beat the fog
      speeds[i] = 0.15 + Math.random() * 0.25
    }
    return { positions, speeds }
  }, [count])

  useFrame((state, delta) => {
    const geo = pointsRef.current?.geometry
    if (geo) {
      const arr = geo.attributes.position.array
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] += speeds[i] * delta * 0.35 // slow rise
        arr[i * 3 + 0] += Math.sin(arr[i * 3 + 1] * 0.3 + i) * delta * 0.03
        if (arr[i * 3 + 1] > 6) {
          arr[i * 3 + 1] = -6
          arr[i * 3 + 0] = (Math.random() - 0.5) * 13
        }
      }
      geo.attributes.position.needsUpdate = true
    }
    // Breathe the whole haze in and out so it reads as rising + clearing.
    if (matRef.current) {
      const t = state.clock.getElapsedTime()
      matRef.current.opacity = 0.14 + (Math.sin(t * 0.18) * 0.5 + 0.5) * 0.12
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        map={texture}
        size={6}
        color={new THREE.Color('#848ea2')}
        transparent
        opacity={0.2}
        depthWrite={false}
        fog={false}
        blending={THREE.NormalBlending}
        sizeAttenuation
      />
    </points>
  )
}

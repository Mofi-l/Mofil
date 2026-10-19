import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Slow-drifting embers / dust motes to give the scene a smoky,
 * dark-fantasy atmosphere. Pure points, very cheap to render.
 */
export default function Embers({ count = 300 }) {
  const pointsRef = useRef()

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 14
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1
      speeds[i] = 0.1 + Math.random() * 0.3
    }
    return { positions, speeds }
  }, [count])

  useFrame((_, delta) => {
    const geo = pointsRef.current?.geometry
    if (!geo) return
    const arr = geo.attributes.position.array
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * delta * 0.4
      // slight horizontal sway
      arr[i * 3 + 0] += Math.sin(arr[i * 3 + 1] + i) * delta * 0.02
      // recycle to the bottom once it floats off the top
      if (arr[i * 3 + 1] > 5) {
        arr[i * 3 + 1] = -5
        arr[i * 3 + 0] = (Math.random() - 0.5) * 14
      }
    }
    geo.attributes.position.needsUpdate = true
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
        size={0.035}
        color={new THREE.Color('#ff6b35')}
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

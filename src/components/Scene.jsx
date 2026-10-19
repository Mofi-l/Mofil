import { Suspense, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import MonkModel from './MonkModel'
import Embers from './Embers'

/**
 * Camera rig: eases the camera toward per-section framing based on the
 * shared scroll progress (0..1). Each section nudges the camera a little —
 * subtle dolly + orbit, matching the reference portfolio's restrained moves
 * rather than hard spins.
 */
function CameraRig({ scrollRef }) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3(0, 0.2, 0))

  useFrame((_, delta) => {
    const s = scrollRef.current ?? 0

    // Camera orbits slightly and dollies in/out across the page.
    const angle = s * Math.PI * 0.5 - Math.PI * 0.1
    const radius = 4.2 - s * 0.8
    const desiredX = Math.sin(angle) * radius
    const desiredZ = Math.cos(angle) * radius
    const desiredY = 0.25 + s * 0.35

    camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredX, 2.5, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredY, 2.5, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredZ, 2.5, delta)

    // Always look at the upper chest / head region (bust framing).
    target.current.set(0, 0.35, 0)
    camera.lookAt(target.current)
  })

  return null
}

export default function Scene({ scrollRef }) {
  const groupRef = useRef()

  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      camera={{ position: [0, 0.3, 4.2], fov: 38, near: 0.1, far: 100 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
      }}
    >
      {/* Deep fog fades the lower body + background into the void,
          reinforcing the chest-up bust framing. */}
      <color attach="background" args={['#07070a']} />
      <fog attach="fog" args={['#07070a', 4, 11]} />

      {/* Lighting: cold key, warm ember rim, blood-red accent from below. */}
      <ambientLight intensity={0.25} color="#4a5568" />
      <directionalLight
        position={[3, 4, 2]}
        intensity={1.6}
        color="#aab4c8"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <spotLight
        position={[-4, 2, -2]}
        angle={0.6}
        penumbra={1}
        intensity={2.2}
        color="#ff6b35"
      />
      <pointLight position={[0, -1.5, 2]} intensity={1.2} color="#c1121f" />

      <Suspense fallback={null}>
        <MonkModel scrollRef={scrollRef} groupRef={groupRef} />
        <Environment preset="night" />
        <ContactShadows
          position={[0, -2.4, 0]}
          opacity={0.5}
          scale={10}
          blur={2.5}
          far={4}
          color="#000000"
        />
      </Suspense>

      <Embers count={280} />
      <CameraRig scrollRef={scrollRef} />
    </Canvas>
  )
}

import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import MonkModel from './MonkModel'
import Embers from './Embers'
import Smoke from './Smoke'

/**
 * A soft light that eases toward the cursor, in front of the character, so
 * moving the mouse rakes extra light across the robe and reveals more detail.
 * The canvas sits behind the HTML overlay, so we read the pointer from a
 * window listener rather than R3F's own (canvas-only) pointer events.
 */
function CursorLight() {
  const lightRef = useRef()
  const ndc = useRef({ x: 0, y: 0.1 })
  const target = useRef(new THREE.Vector3(0, 0.4, 2.6))

  useEffect(() => {
    const onMove = (e) => {
      ndc.current.x = (e.clientX / window.innerWidth) * 2 - 1
      ndc.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((_, delta) => {
    if (!lightRef.current) return
    // Map the cursor to a region just in front of the bust.
    target.current.set(ndc.current.x * 3.4, 0.4 + ndc.current.y * 2.4, 2.6)
    const a = 1 - Math.pow(0.0015, delta) // frame-rate independent easing
    lightRef.current.position.lerp(target.current, a)
  })

  return (
    <pointLight
      ref={lightRef}
      intensity={18}
      distance={14}
      decay={2}
      color="#e9f0ff"
    />
  )
}

/**
 * Camera rig: stays mostly steady so the *character's* own motion (sliding
 * left/right and turning) reads as the movement — rather than the camera
 * orbiting. Only a gentle dolly-in across the page adds depth.
 */
function CameraRig({ scrollRef }) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3(0, 0.35, 0))

  useFrame((_, delta) => {
    const s = scrollRef.current ?? 0

    const desiredX = 0
    const desiredY = 0.3
    const desiredZ = 4.3 - s * 0.5 // subtle dolly-in

    camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredX, 2.5, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredY, 2.5, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredZ, 2.5, delta)

    // Keep aimed at the bust center; the character moves within the frame.
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
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.22 }}
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
      <fog attach="fog" args={['#07070a', 4.5, 13]} />

      {/* Lighting: brighter cold key for form, a cool rim/back light to carve
          the silhouette out of the void (so the character reads even on bright
          displays / in bright rooms), warm ember rim + blood-red accent below. */}
      <ambientLight intensity={0.6} color="#585863" />
      <directionalLight
        position={[3, 4, 2]}
        intensity={4.0}
        color="#d0d8e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      />
      {/* Silver rim/back light behind the figure for edge separation + detail
          (near-neutral so it reads as moonlit silver on black cloth, not blue). */}
      <directionalLight position={[-2.5, 3.5, -4]} intensity={3.6} color="#bfc0c8" />
      <spotLight
        position={[-4, 2, -2]}
        angle={0.6}
        penumbra={1}
        intensity={2.4}
        color="#ff6b35"
      />
      <pointLight position={[0, -1.5, 2]} intensity={1.3} color="#c1121f" />

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

      <Smoke count={14} />
      <Embers count={280} />
      <CursorLight />
      <CameraRig scrollRef={scrollRef} />
    </Canvas>
  )
}

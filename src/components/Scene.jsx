import { Suspense, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import MonkModel from './MonkModel'
import Embers from './Embers'
import Smoke from './Smoke'
import DustBurst from './DustBurst'

/**
 * Camera rig: stays mostly steady so the *character's* own motion (sliding
 * left/right and turning) reads as the movement — rather than the camera
 * orbiting. Only a gentle dolly-in across the page adds depth.
 */
function CameraRig({ scrollRef, introRef }) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3(0, 0.35, 0))

  useFrame((_, delta) => {
    const s = scrollRef.current ?? 0

    // During the entrance the camera pulls back to frame the whole body and the landing dust,
    // then eases into the bust framing as he stands.
    const wide = introRef?.current?.wide ?? 0
    const desiredX = 0
    const desiredY = THREE.MathUtils.lerp(0.3, INTRO_CAM.y, wide)
    const desiredZ = THREE.MathUtils.lerp(4.3 - s * 0.5, INTRO_CAM.z, wide) // subtle dolly-in
    if (introRef?.current?.t == null && wide === 1) {
      camera.position.set(desiredX, desiredY, desiredZ) // hidden before the drop: cut, don't glide
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredX, 2.5, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredY, 2.5, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredZ, 2.5, delta)

    // Keep aimed at the bust center; the character moves within the frame.
    target.current.set(0, THREE.MathUtils.lerp(0.35, INTRO_CAM.targetY, wide), 0)
    camera.lookAt(target.current)
  })

  return null
}

const INTRO_CAM = { y: -1.0, z: 7.0, targetY: -1.1 }

export default function Scene({ scrollRef, onReady, sparkRef, introRef, onIntroDone }) {
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
        shadow-normalBias={0.02}
      />
      {/* Silver rim/back light behind the figure for edge separation + detail
          (near-neutral so it reads as moonlit silver on black cloth, not blue). */}
      {/* Casts shadows so the hood blocks it from lighting the face inside. */}
      <directionalLight
        position={[-2.5, 3.5, -4]}
        intensity={3.6}
        color="#bfc0c8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <spotLight
        position={[-4, 2, -2]}
        angle={0.6}
        penumbra={1}
        intensity={2.4}
        color="#ff6b35"
      />
      <pointLight position={[0, -1.5, 2]} intensity={1.3} color="#c1121f" />

      <Suspense fallback={null}>
        <MonkModel
          scrollRef={scrollRef}
          groupRef={groupRef}
          onReady={onReady}
          sparkRef={sparkRef}
          introRef={introRef}
          onIntroDone={onIntroDone}
        />
        <DustBurst introRef={introRef} />
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
      <CameraRig scrollRef={scrollRef} introRef={introRef} />
    </Canvas>
  )
}

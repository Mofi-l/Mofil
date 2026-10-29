import { useEffect, useRef, useState } from 'react'
import Scene from './components/Scene'
import Overlay from './components/Overlay'
import TorchCursor from './components/TorchCursor'
import { createSpark } from './components/spark'
import { sections } from './content'
import './App.css'

export default function App() {
  // Shared scroll progress (0..1) read by the 3D scene every frame.
  // A ref (not state) avoids re-rendering React on every scroll tick.
  const scrollRef = useRef(0)
  // Cursor spark shared by TorchCursor (position, lit) and MonkModel (zones, reaction, fist and
  // mouth on screen).
  const sparkRef = useRef(createSpark())
  const [active, setActive] = useState(0)
  const [loaded, setLoaded] = useState(false)
  // The hero text waits for the entrance (drop, dust, sweep, rise). MonkModel reports progress in
  // introRef for the camera and dust, and calls revealIntro once he is standing.
  const introRef = useRef({ t: null, wide: 1 })
  const [revealed, setRevealed] = useState(false)
  const revealIntro = () => setRevealed(true)

  // Track scroll progress + active section.
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - doc.clientHeight
      const p = max > 0 ? doc.scrollTop / max : 0
      scrollRef.current = Math.min(Math.max(p, 0), 1)

      // Active section = whichever is nearest the viewport center.
      const mid = doc.scrollTop + doc.clientHeight / 2
      let idx = 0
      for (let i = 0; i < sections.length; i++) {
        const el = document.getElementById(sections[i].id)
        if (el && el.offsetTop <= mid) idx = i
      }
      setActive(idx)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Hide the loader only once the character has actually rendered its first
  // frame (geometry + textures on the GPU), so there's no gap between the
  // loader disappearing and the character appearing. MonkModel fires onReady.
  const handleReady = () => setLoaded(true)

  // Safety net: never let the loader stick if an asset stalls.
  useEffect(() => {
    const safety = setTimeout(() => setLoaded(true), 12000)
    return () => clearTimeout(safety)
  }, [])

  // Visitors who scroll, click or press a key during the entrance get the text straight away; a
  // timeout guarantees it appears even if the clip never finishes.
  useEffect(() => {
    if (!loaded || revealed) return undefined
    const skip = () => setRevealed(true)
    const opts = { passive: true, once: true }
    const events = ['wheel', 'touchmove', 'keydown', 'pointerdown']
    events.forEach((e) => window.addEventListener(e, skip, opts))
    const safety = setTimeout(skip, 8000)
    return () => {
      events.forEach((e) => window.removeEventListener(e, skip, opts))
      clearTimeout(safety)
    }
  }, [loaded, revealed])

  const navigate = (i) => {
    const el = document.getElementById(sections[i].id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <Scene
        scrollRef={scrollRef}
        onReady={handleReady}
        sparkRef={sparkRef}
        introRef={introRef}
        onIntroDone={revealIntro}
      />
      <div className="vignette" />
      <Overlay active={active} onNavigate={navigate} revealed={revealed} />
      <TorchCursor sparkRef={sparkRef} />

      <div className={`loader ${loaded ? 'is-hidden' : ''}`}>
        <div className="loader__ring" />
        <div className="loader__text">Entering the shadows…</div>
      </div>
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import Scene from './components/Scene'
import Overlay from './components/Overlay'
import { sections } from './content'
import './App.css'

export default function App() {
  // Shared scroll progress (0..1) read by the 3D scene every frame.
  // A ref (not state) avoids re-rendering React on every scroll tick.
  const scrollRef = useRef(0)
  const [active, setActive] = useState(0)
  const [loaded, setLoaded] = useState(false)

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

  // Hold the loader until the 3D model has actually finished loading, so the
  // character is on screen the instant the content is revealed (no pop-in).
  const { active: loadingActive, progress } = useProgress()
  useEffect(() => {
    if (loaded) return
    if (!loadingActive && progress >= 100) {
      const t = setTimeout(() => setLoaded(true), 300) // brief grace for the fade
      return () => clearTimeout(t)
    }
  }, [loadingActive, progress, loaded])

  // Safety net: never let the loader stick if an asset stalls.
  useEffect(() => {
    const safety = setTimeout(() => setLoaded(true), 9000)
    return () => clearTimeout(safety)
  }, [])

  const navigate = (i) => {
    const el = document.getElementById(sections[i].id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <Scene scrollRef={scrollRef} />
      <div className="vignette" />
      <Overlay active={active} onNavigate={navigate} />

      <div className={`loader ${loaded ? 'is-hidden' : ''}`}>
        <div className="loader__ring" />
        <div className="loader__text">Entering the shadows…</div>
      </div>
    </>
  )
}

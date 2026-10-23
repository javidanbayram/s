import { useState, useCallback } from 'react'
import OceanExperience from './components/OceanExperience.jsx'

export default function App() {
  const [isZoomed, setIsZoomed] = useState(false)
  const [activeHologram, setActiveHologram] = useState(null)

  let hintText = "click Sama's blue eye to zoom into her essence"
  if (isZoomed) {
    if (activeHologram) {
      hintText = '✦ an eternal memory unfolds ✦'
    } else {
      hintText = 'drag to explore words ✦ click to return'
    }
  }

  return (
    <main className="stage">
      <h1 className="visually-hidden">Memory Ocean — for Sama</h1>
      <OceanExperience
        onZoomStateChange={setIsZoomed}
        onHologramChange={setActiveHologram}
      />
      <p className="hint" key={hintText} aria-hidden="true">
        {hintText}
      </p>
    </main>
  )
}

import { useState } from 'react'
import OceanExperience from './components/OceanExperience.jsx'
import CinematicPreloader from './components/CinematicPreloader.jsx'
import KineticCursor from './components/KineticCursor.jsx'

export default function App() {
  const [isZoomed, setIsZoomed] = useState(false)
  const [activeHologram, setActiveHologram] = useState(null)
  const [isRevealed, setIsRevealed] = useState(false)

  let hintText = "click Sama's blue eye to zoom into her essence"
  if (isZoomed) {
    if (activeHologram) {
      hintText = '✦ an eternal memory unfolds ✦'
    } else {
      hintText = 'drag to explore words ✦ click to return'
    }
  }

  return (
    <>
      <CinematicPreloader
        onFadeOutStart={() => setIsRevealed(true)}
      />
      <KineticCursor />
      <main className={`stage ${isRevealed ? 'revealed' : ''}`}>
        <h1 className="visually-hidden">Memory Ocean — for Sama</h1>
        <OceanExperience
          onZoomStateChange={setIsZoomed}
          onHologramChange={setActiveHologram}
        />
        {isRevealed && (
          <p className="hint" key={hintText} aria-hidden="true">
            {hintText}
          </p>
        )}
      </main>
    </>
  )
}


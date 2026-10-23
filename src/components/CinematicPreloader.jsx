import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

/**
 * Cinematic Typewriter Pre-loader:
 * - Pure white full-screen overlay (highest z-index).
 * - Smooth typewriter effect for: "Səni necə gördüyümü sənə göstərmək istədim..."
 *   in tiny, elegant typography (#1E3A5F).
 * - Holds text for 2 seconds after typing completes.
 * - Smoothly dissolves overlay and text, seamlessly unveiling the 3D eye scene.
 */
export default function CinematicPreloader({ onFadeOutStart, onComplete }) {
  const overlayRef = useRef(null)
  const textContainerRef = useRef(null)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const [removed, setRemoved] = useState(false)

  const FULL_TEXT = 'Səni necə gördüyümü sənə göstərmək istədim...'

  useEffect(() => {
    const progress = { count: 0 }
    let charInterval

    const ctx = gsap.context(() => {
      const tl = gsap.timeline()

      // 1. Initial breathing pause (0.5s)
      tl.to({}, { duration: 0.5 })

      // 2. Typewriter animation (~2.4s)
      tl.to(progress, {
        count: FULL_TEXT.length,
        duration: FULL_TEXT.length * 0.058,
        ease: 'none',
        onUpdate: () => {
          const currentCount = Math.floor(progress.count)
          setDisplayedText(FULL_TEXT.slice(0, currentCount))
        },
        onComplete: () => {
          setDisplayedText(FULL_TEXT)
          setIsTyping(false)
        },
      })

      // 3. Hold text for exactly 2 seconds
      tl.to({}, { duration: 2.0 })

      // 4. Fade out text smoothly
      tl.to(textContainerRef.current, {
        opacity: 0,
        y: -10,
        filter: 'blur(4px)',
        duration: 1.2,
        ease: 'power2.inOut',
        onStart: () => {
          if (onFadeOutStart) onFadeOutStart()
        },
      })

      // 5. Dissolve pure white overlay
      tl.to(
        overlayRef.current,
        {
          opacity: 0,
          duration: 1.5,
          ease: 'power2.inOut',
          onComplete: () => {
            setRemoved(true)
            if (onComplete) onComplete()
          },
        },
        '-=0.6'
      )
    })

    return () => ctx.revert()
  }, [onFadeOutStart, onComplete])

  if (removed) return null

  return (
    <div ref={overlayRef} className="preloader-overlay">
      <div ref={textContainerRef} className="preloader-content">
        <p className="preloader-typewriter-text">
          {displayedText}
          {isTyping && <span className="preloader-caret">|</span>}
        </p>
      </div>
    </div>
  )
}

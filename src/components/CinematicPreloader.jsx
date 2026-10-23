import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import SamaSignature from './SamaSignature.jsx'

/**
 * Cinematic Pre-loader with Handwritten "Sama" Signature Bridge:
 * 1. Initial Typewriter Text:
 *    - Types: "Səni necə gördüyümü sənə göstərmək istədim..."
 *    - Holds for 2 seconds, then smoothly fades out.
 * 2. Handwritten "Sama" Calligraphy Bridge:
 *    - Animates SVG stroke-dashoffset to draw the name "Sama" letter-by-letter
 *      along with its elegant vintage flourish in dark blue (#1E3A5F).
 *    - Holds for 1.3 seconds, then smoothly fades out.
 * 3. 3D Eye Canvas Unveil:
 *    - Pure white overlay dissolves, seamlessly fading in the 3D eye scene.
 */
export default function CinematicPreloader({ onFadeOutStart, onComplete }) {
  const overlayRef = useRef(null)
  const textContainerRef = useRef(null)
  const signatureContainerRef = useRef(null)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const [removed, setRemoved] = useState(false)

  const FULL_TEXT = 'Səni necə gördüyümü sənə göstərmək istədim...'

  useEffect(() => {
    const progress = { count: 0 }

    const ctx = gsap.context(() => {
      // Initialize SVG mask strokes for handwriting animation
      const strokes = signatureContainerRef.current?.querySelectorAll('.sama-mask-stroke')
      if (strokes) {
        strokes.forEach((stroke) => {
          const len = stroke.getTotalLength()
          stroke.style.strokeDasharray = len
          stroke.style.strokeDashoffset = len
        })
      }

      const tl = gsap.timeline()

      // ==========================================
      // PHASE 1: Typewriter Preloader Text
      // ==========================================
      // 1. Initial breathing pause (0.4s)
      tl.to({}, { duration: 0.4 })

      // 2. Typewriter animation (~2.4s)
      tl.to(progress, {
        count: FULL_TEXT.length,
        duration: FULL_TEXT.length * 0.055,
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

      // 3. Hold typewriter text for 2.0 seconds
      tl.to({}, { duration: 2.0 })

      // 4. Fade out typewriter text smoothly
      tl.to(textContainerRef.current, {
        opacity: 0,
        y: -12,
        filter: 'blur(5px)',
        duration: 1.0,
        ease: 'power2.inOut',
      })

      // ==========================================
      // PHASE 2: Handwritten "Sama" SVG Animation
      // ==========================================
      // 5. Brief gentle pause before calligraphy begins (0.3s)
      tl.to({}, { duration: 0.3 })

      // 6. Make signature container visible
      tl.to(signatureContainerRef.current, {
        opacity: 1,
        duration: 0.2,
      })

      // 7. Write strokes in handwriting sequence (S -> a -> m -> a -> flourish)
      // S: Left loop flourish, then tall ascender and down-stem
      tl.to('.sama-mask-stroke.s-loop', {
        strokeDashoffset: 0,
        duration: 0.48,
        ease: 'power1.inOut',
      })
      tl.to(
        '.sama-mask-stroke.s-stem',
        {
          strokeDashoffset: 0,
          duration: 0.52,
          ease: 'power1.inOut',
        },
        '-=0.18'
      )

      // First letter 'a'
      tl.to(
        '.sama-mask-stroke.letter-a1',
        {
          strokeDashoffset: 0,
          duration: 0.44,
          ease: 'power1.inOut',
        },
        '-=0.1'
      )

      // Letter 'm' (3 distinct cursive arches)
      tl.to(
        '.sama-mask-stroke.letter-m1',
        {
          strokeDashoffset: 0,
          duration: 0.28,
          ease: 'power1.inOut',
        },
        '-=0.08'
      )
      tl.to(
        '.sama-mask-stroke.letter-m2',
        {
          strokeDashoffset: 0,
          duration: 0.28,
          ease: 'power1.inOut',
        },
        '-=0.08'
      )
      tl.to(
        '.sama-mask-stroke.letter-m3',
        {
          strokeDashoffset: 0,
          duration: 0.32,
          ease: 'power1.inOut',
        },
        '-=0.08'
      )

      // Second letter 'a'
      tl.to(
        '.sama-mask-stroke.letter-a2',
        {
          strokeDashoffset: 0,
          duration: 0.44,
          ease: 'power1.inOut',
        },
        '-=0.08'
      )

      // Vintage flourish banner & acanthus scrolls
      tl.to(
        '.sama-mask-stroke.flourish-bar',
        {
          strokeDashoffset: 0,
          duration: 0.45,
          ease: 'power1.inOut',
        },
        '-=0.1'
      )
      tl.to(
        '.sama-mask-stroke.flourish-left',
        {
          strokeDashoffset: 0,
          duration: 0.5,
          ease: 'power1.inOut',
        },
        '-=0.2'
      )
      tl.to(
        '.sama-mask-stroke.flourish-mid',
        {
          strokeDashoffset: 0,
          duration: 0.55,
          ease: 'power1.inOut',
        },
        '-=0.22'
      )

      // Complete full coverage
      tl.to('.sama-mask-full', {
        opacity: 1,
        duration: 0.15,
      })

      // 8. Hold "Sama" signature on screen for 1.3 seconds
      tl.to({}, { duration: 1.3 })

      // 9. Fade out "Sama" signature smoothly
      tl.to(signatureContainerRef.current, {
        opacity: 0,
        y: -14,
        filter: 'blur(5px)',
        duration: 1.1,
        ease: 'power2.inOut',
      })

      // ==========================================
      // PHASE 3: Dissolve Overlay & Unveil 3D Eye
      // ==========================================
      // 10. Dissolve pure white overlay smoothly and trigger 3D scene fade-in
      tl.to(
        overlayRef.current,
        {
          opacity: 0,
          duration: 1.5,
          ease: 'power2.inOut',
          onStart: () => {
            if (onFadeOutStart) onFadeOutStart()
          },
          onComplete: () => {
            setRemoved(true)
            if (onComplete) onComplete()
          },
        },
        '-=0.4'
      )
    })

    return () => ctx.revert()
  }, [onFadeOutStart, onComplete])

  if (removed) return null

  return (
    <div ref={overlayRef} className="preloader-overlay">
      {/* 1. Typewriter Initial Sentence */}
      <div ref={textContainerRef} className="preloader-content">
        <p className="preloader-typewriter-text">
          {displayedText}
          {isTyping && <span className="preloader-caret">|</span>}
        </p>
      </div>

      {/* 2. Handwritten "Sama" Calligraphy Bridge */}
      <SamaSignature ref={signatureContainerRef} className="sama-signature-wrapper" />
    </div>
  )
}

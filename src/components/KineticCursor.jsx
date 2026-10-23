import { useEffect, useRef } from 'react'

/**
 * Kinetic Watercolor Cursor:
 * - Hides default browser cursor.
 * - Primary cursor: crisp tiny dark blue dot (#1E3A5F) with zero lag.
 * - Trailing physics: leaves a fluid trail of soft watercolor blue dots (#6B8FA8 and #9DBDD6)
 *   that fade to opacity 0 and shrink to scale 0 over 400-600ms.
 * - High-performance HTML5 Canvas with requestAnimationFrame (60+ FPS).
 */
export default function KineticCursor() {
  const canvasRef = useRef(null)

  useEffect(() => {
    // Only enable on pointer/mouse devices (not touch-only screens)
    if (typeof window === 'undefined' || window.matchMedia('(pointer: coarse)').matches) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const onResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    // Mouse tracking state
    const mouse = {
      x: -100,
      y: -100,
      prevX: -100,
      prevY: -100,
      active: false,
      isDown: false,
    }

    // Trailing watercolor droplets pool
    const particles = []
    const PALETTE = ['#6B8FA8', '#9DBDD6']

    const addParticle = (x, y, speed) => {
      const sizeBase = Math.min(8.5, 3.5 + speed * 0.18)
      particles.push({
        x: x + (Math.random() - 0.5) * 3,
        y: y + (Math.random() - 0.5) * 3,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        maxRadius: sizeBase * (0.85 + Math.random() * 0.35),
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        life: 1.0,
        // Decay over 400 - 600ms (~24 - 36 frames at 60fps)
        decay: 1.0 / (24 + Math.random() * 12),
        alpha: 0.52 + Math.random() * 0.18,
      })
    }

    const onPointerMove = (e) => {
      mouse.active = true
      const newX = e.clientX
      const newY = e.clientY

      if (mouse.prevX > 0 && mouse.prevY > 0) {
        const dx = newX - mouse.prevX
        const dy = newY - mouse.prevY
        const dist = Math.hypot(dx, dy)
        const speed = Math.min(dist, 25)

        // Interpolate trail points for smooth continuous watercolor stroke
        const steps = Math.max(1, Math.min(6, Math.floor(dist / 7)))
        for (let i = 1; i <= steps; i++) {
          const interpX = mouse.prevX + (dx * i) / steps
          const interpY = mouse.prevY + (dy * i) / steps
          addParticle(interpX, interpY, speed)
        }
      }

      mouse.x = newX
      mouse.y = newY
      mouse.prevX = newX
      mouse.prevY = newY
    }

    const onPointerDown = () => {
      mouse.isDown = true
      // Micro watercolor splash on click
      for (let i = 0; i < 6; i++) {
        addParticle(mouse.x, mouse.y, 16)
      }
    }

    const onPointerUp = () => {
      mouse.isDown = false
    }

    const onMouseLeave = () => {
      mouse.active = false
      mouse.prevX = -100
      mouse.prevY = -100
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    document.addEventListener('mouseleave', onMouseLeave)

    // Animation render loop
    let animId
    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // 1. Draw Trailing Watercolor Droplets
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life -= p.decay
        p.x += p.vx
        p.y += p.vy

        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        // Smooth shrink and fade over lifetime
        const currentRadius = p.maxRadius * Math.pow(p.life, 0.85)
        const currentOpacity = p.alpha * p.life

        ctx.save()
        ctx.beginPath()
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = currentOpacity
        ctx.shadowColor = p.color
        ctx.shadowBlur = currentRadius * 0.8
        ctx.fill()
        ctx.restore()
      }

      // 2. Draw Primary Sharp Dark Blue Dot (#1E3A5F)
      if (mouse.active && mouse.x > 0 && mouse.y > 0) {
        ctx.save()
        ctx.beginPath()
        const primaryDotRadius = mouse.isDown ? 4.2 : 3.0
        ctx.arc(mouse.x, mouse.y, primaryDotRadius, 0, Math.PI * 2)
        ctx.fillStyle = '#1E3A5F'
        ctx.globalAlpha = 0.95
        ctx.shadowColor = 'rgba(30, 58, 95, 0.4)'
        ctx.shadowBlur = 3
        ctx.fill()

        // Subtle outer watercolor halo ring
        ctx.beginPath()
        ctx.arc(mouse.x, mouse.y, primaryDotRadius + (mouse.isDown ? 4 : 2.5), 0, Math.PI * 2)
        ctx.strokeStyle = '#6B8FA8'
        ctx.lineWidth = 0.8
        ctx.globalAlpha = 0.4
        ctx.stroke()
        ctx.restore()
      }

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="kinetic-cursor-canvas"
      aria-hidden="true"
    />
  )
}

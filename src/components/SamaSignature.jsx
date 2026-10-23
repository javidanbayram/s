import { forwardRef } from 'react'
import { SAMA_PATH_D } from './samaPathData.js'

/**
 * SamaSignature component:
 * Exact Spencerian calligraphy with vintage acanthus flourish ornament,
 * rendered in dark blue (#1E3A5F) with an internal SVG mask allowing
 * letter-by-letter handwriting stroke-dashoffset animation.
 */
const SamaSignature = forwardRef(function SamaSignature({ className = '' }, ref) {
  return (
    <div ref={ref} className={`sama-signature-container ${className}`}>
      <svg
        viewBox="0 0 842 606"
        xmlns="http://www.w3.org/2000/svg"
        className="sama-signature-svg"
        aria-label="Sama"
      >
        <defs>
          <mask id="sama-write-mask">
            {/* 1. S: Left loop flourish */}
            <path
              className="sama-mask-stroke s-loop"
              strokeWidth="85"
              d="M 270 220 C 180 200, 135 240, 145 285 C 155 330, 230 330, 280 290"
            />

            {/* 2. S: Ascender loop & down-stem */}
            <path
              className="sama-mask-stroke s-stem"
              strokeWidth="85"
              d="M 312 135 C 330 155, 320 200, 310 240 C 295 315, 275 335, 220 325"
            />

            {/* 3. Letter 'a' (first) */}
            <path
              className="sama-mask-stroke letter-a1"
              strokeWidth="90"
              d="M 320 270 C 350 235, 415 235, 410 270 C 405 320, 335 320, 340 270 C 345 235, 400 235, 410 270 L 410 310 C 410 325, 425 320, 450 275"
            />

            {/* 4. Letter 'm' (3 arches) */}
            <path
              className="sama-mask-stroke letter-m1"
              strokeWidth="85"
              d="M 445 275 C 470 235, 500 235, 500 280 L 500 315"
            />
            <path
              className="sama-mask-stroke letter-m2"
              strokeWidth="85"
              d="M 495 275 C 525 235, 555 235, 555 280 L 555 315"
            />
            <path
              className="sama-mask-stroke letter-m3"
              strokeWidth="85"
              d="M 550 275 C 580 235, 615 235, 615 280 L 615 315 C 615 325, 630 315, 645 275"
            />

            {/* 5. Letter 'a' (second) */}
            <path
              className="sama-mask-stroke letter-a2"
              strokeWidth="90"
              d="M 635 275 C 665 235, 715 235, 710 270 C 705 320, 640 320, 645 270 C 650 235, 700 235, 710 270 L 710 310 C 710 325, 735 315, 765 295"
            />

            {/* 6. Flourish horizontal banner */}
            <path
              className="sama-mask-stroke flourish-bar"
              strokeWidth="75"
              d="M 490 350 L 765 350 C 785 350, 785 310, 755 310 C 725 310, 705 330, 690 350"
            />

            {/* 7. Flourish decorative acanthus leaves */}
            <path
              className="sama-mask-stroke flourish-left"
              strokeWidth="120"
              d="M 280 340 C 200 330, 110 325, 60 340 C 40 350, 70 380, 120 390 C 180 400, 240 430, 310 445"
            />
            <path
              className="sama-mask-stroke flourish-mid"
              strokeWidth="120"
              d="M 280 370 C 330 355, 410 355, 460 350 C 530 355, 615 365, 635 375 C 635 390, 560 415, 460 425 C 380 435, 330 450, 280 430 C 250 415, 255 390, 280 370"
            />

            {/* 8. Full coverage guarantee */}
            <rect
              className="sama-mask-full"
              x="0"
              y="0"
              width="842"
              height="606"
              fill="white"
              opacity="0"
            />
          </mask>
        </defs>

        <path
          d={SAMA_PATH_D}
          fill="#1E3A5F"
          fillRule="evenodd"
          mask="url(#sama-write-mask)"
        />
      </svg>
    </div>
  )
})

export default SamaSignature

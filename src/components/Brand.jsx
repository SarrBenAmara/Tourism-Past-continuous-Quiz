import { useEffect, useState } from 'react'
import sceneDesktop from '../assets/img/scene-desktop.webp'
import sceneMobile from '../assets/img/scene-mobile.webp'
import personaHold from '../assets/img/persona.webp'
import personaPoint from '../assets/img/persona-point.webp'

export function Mountain(props) {
  return (
    <svg viewBox="0 0 240 110" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="mt-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c4ae8" />
          <stop offset="1" stopColor="#3d1596" />
        </linearGradient>
        <linearGradient id="mt-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a2bc9" />
          <stop offset="1" stopColor="#2d0c7a" />
        </linearGradient>
      </defs>
      <path d="M0 110 L58 52 L80 66 L120 8 L160 56 L180 44 L240 110Z" fill="url(#mt-a)" />
      <path d="M120 8 L160 56 L180 44 L240 110 L140 110 Z" fill="url(#mt-b)" opacity=".7" />
      <path d="M120 8 L136 28 L128 26 L122 34 L114 26 L106 30Z" fill="#fff" />
      <path d="M58 52 L66 60 L60 60 L54 64 L50 60Z" fill="#efe8ff" />
    </svg>
  )
}

export function Plane(props) {
  return (
    <svg viewBox="0 0 120 70" aria-hidden="true" {...props}>
      <path d="M2 64 C 20 60, 30 52, 42 44" stroke="#fff" strokeWidth="3" strokeDasharray="6 6" fill="none" strokeLinecap="round" opacity=".9" />
      <g transform="rotate(-22 80 30)">
        <path d="M44 32 C 44 28, 50 26, 58 26 L104 26 C 114 26, 118 30, 118 32 C 118 34, 114 38, 104 38 L58 38 C 50 38, 44 36, 44 32Z" fill="#fff" />
        <path d="M78 26 L66 6 L74 6 L94 26Z" fill="#e8ecff" />
        <path d="M78 38 L66 58 L74 58 L94 38Z" fill="#d7dcff" />
        <path d="M50 26 L44 14 L50 14 L58 26Z" fill="#ff3d6e" />
        <path d="M112 29 C 115 30, 115 34, 112 35 L108 35 L108 29Z" fill="#7aa5ff" />
        {[66, 72, 78, 84, 90, 96].map((x) => (
          <circle key={x} cx={x} cy="31" r="1.6" fill="#7aa5ff" />
        ))}
      </g>
    </svg>
  )
}

export function Pin(props) {
  return (
    <svg viewBox="0 0 40 54" aria-hidden="true" {...props}>
      <path d="M20 2 C 9 2, 2 10, 2 20 C 2 33, 20 52, 20 52 C 20 52, 38 33, 38 20 C 38 10, 31 2, 20 2Z" fill="#f2264b" stroke="#fff" strokeWidth="3" />
      <circle cx="20" cy="19" r="7" fill="#fff" />
    </svg>
  )
}

export function Trophy(props) {
  return (
    <svg viewBox="0 0 120 130" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="tr-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3a0" />
          <stop offset=".45" stopColor="#ffc83d" />
          <stop offset="1" stopColor="#e07800" />
        </linearGradient>
      </defs>
      <path d="M28 14 H8 C 8 40, 18 52, 34 54" stroke="url(#tr-g)" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M92 14 H112 C 112 40, 102 52, 86 54" stroke="url(#tr-g)" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M26 6 H94 V40 C 94 62, 80 76, 60 76 C 40 76, 26 62, 26 40Z" fill="url(#tr-g)" stroke="#b35a00" strokeWidth="3" />
      <path d="M38 14 C 38 40, 42 56, 52 64" stroke="#fffbe0" strokeWidth="6" fill="none" opacity=".7" strokeLinecap="round" />
      <rect x="52" y="76" width="16" height="18" fill="#f0a000" />
      <path d="M34 94 H86 L92 112 H28Z" fill="url(#tr-g)" stroke="#b35a00" strokeWidth="3" />
      <rect x="22" y="112" width="76" height="14" rx="4" fill="#6a22e0" stroke="#3d0a8f" strokeWidth="3" />
      <path d="M60 22 L64 32 L75 33 L67 40 L69 51 L60 45 L51 51 L53 40 L45 33 L56 32Z" fill="#fff" opacity=".95" />
    </svg>
  )
}

/** The "Tourism Quiz Challenge" wordmark. variant: hero (stacked) | bar (one line) | phone (stacked, compact) */
export function Logo({ variant = 'hero', className = '' }) {
  const stacked = variant !== 'bar'
  const words = [
    ['Tourism', 'white'],
    ['Quiz', 'white'],
    ['Challenge', 'gold'],
  ]
  const W = ([t, c]) => (
    <span key={t} className="logo__word" data-text={t}>
      <span className={`logo__fill logo__fill--${c}`}>{t}</span>
    </span>
  )
  return (
    <h1 className={`logo logo--${variant} ${className}`} aria-label="Tourism Quiz Challenge" style={{ margin: 0 }}>
      <Mountain className="logo__mountain" />
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <Plane className="logo__plane" />
        <Pin className="logo__pin" />
        {stacked ? (
          <>
            <span className="logo__line">{W(words[0])}</span>
            <span className="logo__line">
              {W(words[1])} {W(words[2])}
            </span>
          </>
        ) : (
          <span className="logo__line">
            {W(words[0])} {W(words[1])} {W(words[2])}
          </span>
        )}
      </span>
    </h1>
  )
}

/** Full-screen scenery. `mobile` uses the light phone background (fast on older phones). */
export function Scene({ mobile = false, persona = null, children }) {
  return (
    <div className={`scene ${mobile ? 'scene--mobile' : ''}`}>
      <div className="scene__bg" aria-hidden="true">
        {!mobile && <img src={sceneDesktop} alt="" decoding="async" />}
      </div>
      {mobile && (
        <div className="scene__bottom" aria-hidden="true">
          <img src={sceneMobile} alt="" decoding="async" />
        </div>
      )}
      {persona && <Persona pose={persona} />}
      {children}
    </div>
  )
}

export function Persona({ pose = 'hold' }) {
  return (
    <div className={`persona ${pose === 'point' ? 'persona--point' : ''}`} aria-hidden="true">
      <img src={pose === 'point' ? personaPoint : personaHold} alt="" />
    </div>
  )
}

/** Desktop layouts on wide screens, phone layout on narrow/portrait screens. */
export function useIsPhone() {
  const q = '(max-width: 760px), (orientation: portrait) and (max-width: 1000px)'
  const get = () => typeof window !== 'undefined' && window.matchMedia(q).matches
  const [v, setV] = useState(get)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setV(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return v
}

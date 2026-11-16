import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { Compass, Camera, Binoculars, Map as MapIcon, Volume2, VolumeX, Maximize, Minimize, Home, Crown } from 'lucide-react'
import { TEAMS, ANSWER_LETTERS, rankColor } from '../lib/gameLogic.js'
import { isMuted, setMuted, onMuteChange } from '../lib/sound.js'
import { prefersReducedMotion } from '../lib/motion.js'
import { navigate } from '../lib/router.js'

const TEAM_ICONS = { compass: Compass, camera: Camera, binoculars: Binoculars, map: MapIcon }

export function TeamIcon({ team, ...props }) {
  const Icon = TEAM_ICONS[TEAMS[team]?.icon] || Compass
  return <Icon aria-hidden="true" {...props} />
}

export const teamVars = (id) => ({ '--tc': TEAMS[id]?.color, '--td': TEAMS[id]?.dark })

export function Btn({ color = 'purple', size, wide, icon: Icon, iconRight: IconRight, children, className = '', ...rest }) {
  const cls = ['gbtn', color !== 'purple' && `gbtn--${color}`, size && `gbtn--${size}`, wide && 'gbtn--wide', className]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={cls} {...rest}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
      {IconRight && <IconRight aria-hidden="true" />}
    </button>
  )
}

/** Team score chip used on the projector (matches the reference: icon, name, points). */
export function TeamChip({ id, points, sub }) {
  const prev = useRef(points)
  const [bump, setBump] = useState(false)
  useEffect(() => {
    if (points !== prev.current) {
      prev.current = points
      setBump(true)
      const t = setTimeout(() => setBump(false), 450)
      return () => clearTimeout(t)
    }
  }, [points])
  const t = TEAMS[id]
  return (
    <div className={`team-chip ${bump ? 'is-bump' : ''}`} style={teamVars(id)}>
      <span className="team-chip__icon">
        <TeamIcon team={id} />
      </span>
      <span className="team-chip__text">
        <span className="team-chip__name">{t.name}</span>
        <span className="team-chip__pts">
          {points ?? 0} pts{sub ? <small style={{ fontSize: '0.6em', marginLeft: 6, opacity: 0.7 }}>{sub}</small> : null}
        </span>
      </span>
    </div>
  )
}

export const rankVars = (rank) => ({ '--tc': rankColor(rank).color, '--td': rankColor(rank).dark })

/** Individual Mode version of the score chip: rank medal, player name, points. */
export function LeaderChip({ rank, name, points }) {
  const prev = useRef(points)
  const [bump, setBump] = useState(false)
  useEffect(() => {
    if (points !== prev.current) {
      prev.current = points
      setBump(true)
      const t = setTimeout(() => setBump(false), 450)
      return () => clearTimeout(t)
    }
  }, [points])
  return (
    <div className={`team-chip ${bump ? 'is-bump' : ''}`} style={rankVars(rank)}>
      <span className="team-chip__icon" style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: '1.15em' }}>
        {rank === 1 ? <Crown style={{ width: '62%', height: '62%' }} aria-label="First place" /> : rank}
      </span>
      <span className="team-chip__text">
        <span className="team-chip__name">{name}</span>
        <span className="team-chip__pts">{points ?? 0} pts</span>
      </span>
    </div>
  )
}

export function AnswerTile({ index, text, count, state }) {
  const L = ANSWER_LETTERS[index]
  return (
    <div className={`ans ans--${L} ${state === 'correct' ? 'is-correct' : ''} ${state === 'dim' ? 'is-dim' : ''}`}>
      <span className="ans__letter">{L}</span>
      <span className="ans__text">{text}</span>
      {count !== undefined && <span className="ans__count">{count}</span>}
    </div>
  )
}

export function TimerPill({ remainingMs, totalMs, paused }) {
  const secs = Math.max(0, Math.ceil(remainingMs / 1000))
  const p = totalMs ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 1
  return (
    <span className="pill pill--gold" aria-live="off">
      <span className={`timer ${secs <= 5 && !paused ? 'is-low' : ''}`} style={{ '--p': p }}>
        <span className="timer__ring" aria-hidden="true" />
        {paused ? 'Paused' : `${secs} s`}
      </span>
    </span>
  )
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="stack" style={{ alignItems: 'center', padding: 40 }}>
      <div className="spinner" role="status" aria-label={label} />
      <p className="sub-title">{label}</p>
    </div>
  )
}

export function fireConfetti(big = false) {
  if (prefersReducedMotion()) return
  const colors = ['#ffc83d', '#8f45ff', '#1f8bff', '#f0284a', '#22b43c', '#ffffff']
  if (!big) {
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 }, colors, disableForReducedMotion: true })
    return
  }
  const end = Date.now() + 2600
  const frame = () => {
    confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors, disableForReducedMotion: true })
    confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors, disableForReducedMotion: true })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

export function useMuted() {
  const [m, setM] = useState(isMuted())
  useEffect(() => onMuteChange(setM), [])
  return [m, setMuted]
}

export function CornerTools({ fullscreen = false, home = false }) {
  const [muted, setM] = useMuted()
  const [fs, setFs] = useState(Boolean(document.fullscreenElement))
  useEffect(() => {
    const on = () => setFs(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }
  return (
    <div className="corner-tools">
      {home && (
        <button className="round-btn" onClick={() => navigate('/')} aria-label="Main menu" title="Main menu">
          <Home />
        </button>
      )}
      {fullscreen && document.documentElement.requestFullscreen && (
        <button className="round-btn" onClick={toggleFs} aria-label={fs ? 'Exit full screen' : 'Full screen'} title="Full screen">
          {fs ? <Minimize /> : <Maximize />}
        </button>
      )}
      <button
        className="round-btn"
        onClick={() => setM(!muted)}
        aria-pressed={muted}
        aria-label={muted ? 'Sound off – turn on' : 'Sound on – mute'}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX /> : <Volume2 />}
      </button>
    </div>
  )
}

export function Modal({ title, icon: Icon, onClose, children }) {
  useEffect(() => {
    const on = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [onClose])
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="panel modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="panel__head">
          {Icon && <Icon aria-hidden="true" />}
          {title}
        </div>
        <div className="panel__body">{children}</div>
      </div>
    </div>
  )
}

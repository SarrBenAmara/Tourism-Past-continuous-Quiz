// Tiny Web Audio sound effects – no audio files to download, works offline.
const KEY = 'tqc.muted'
let ctx = null
let muted = (() => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
})()
const subs = new Set()

export const isMuted = () => muted
export function setMuted(v) {
  muted = v
  try {
    localStorage.setItem(KEY, v ? '1' : '0')
  } catch {
    /* ignore */
  }
  subs.forEach((f) => f(v))
}
export function onMuteChange(f) {
  subs.add(f)
  return () => subs.delete(f)
}

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, start, dur, type = 'sine', gain = 0.15) {
  const c = ac()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, c.currentTime + start)
  g.gain.setValueAtTime(0.0001, c.currentTime + start)
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  o.connect(g).connect(c.destination)
  o.start(c.currentTime + start)
  o.stop(c.currentTime + start + dur + 0.05)
}

const SOUNDS = {
  tap: () => tone(660, 0, 0.08, 'triangle', 0.12),
  join: () => [523, 784].forEach((f, i) => tone(f, i * 0.08, 0.15, 'triangle')),
  tick: () => tone(1200, 0, 0.05, 'square', 0.05),
  start: () => [392, 523, 659].forEach((f, i) => tone(f, i * 0.1, 0.2, 'triangle')),
  correct: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.08, 0.22, 'triangle')),
  wrong: () => [311, 233].forEach((f, i) => tone(f, i * 0.15, 0.3, 'sawtooth', 0.08)),
  timeup: () => [880, 660, 440].forEach((f, i) => tone(f, i * 0.12, 0.2, 'square', 0.06)),
  fanfare: () =>
    [523, 523, 523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, [0, 0.12, 0.24, 0.36, 0.6, 0.8, 0.92, 1.1][i], 0.3, 'triangle', 0.14)),
}

export function play(name) {
  if (muted) return
  try {
    SOUNDS[name]?.()
  } catch {
    /* audio not available */
  }
}

import { useEffect, useState, useSyncExternalStore } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { ref, onValue } from 'firebase/database'
import { auth, db } from '../firebase/config.js'

/** Current Firebase user (undefined while loading, null when signed out). */
export function useAuthUser() {
  const [user, setUser] = useState(auth?.currentUser ?? undefined)
  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (u) => setUser(u ?? null))
  }, [])
  return user
}

/**
 * Live value at a database path. Returns { value, loading, error }.
 * Pass a falsy path to skip.
 */
export function useDbValue(path) {
  const [state, setState] = useState({ value: undefined, loading: Boolean(path), error: null, path })
  if (state.path !== path) setState({ value: undefined, loading: Boolean(path), error: null, path })
  useEffect(() => {
    if (!path || !db) return
    return onValue(
      ref(db, path),
      (snap) => setState({ value: snap.val(), loading: false, error: null, path }),
      (error) => setState({ value: null, loading: false, error, path }),
    )
  }, [path])
  return state.path === path ? state : { value: undefined, loading: Boolean(path), error: null }
}

// ---- server clock -----------------------------------------------------------
let offset = 0
let started = false
const listeners = new Set()
function startOffset() {
  if (started || !db) return
  started = true
  onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
    offset = snap.val() || 0
    listeners.forEach((l) => l())
  })
}
/** Milliseconds to add to Date.now() to get Firebase server time. */
export function useServerOffset() {
  startOffset()
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => offset,
  )
}
export const serverNow = () => Date.now() + offset

/** Re-render every `ms` while `active`. Returns server-corrected "now". */
export function useTicker(active, ms = 200) {
  const off = useServerOffset()
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setTick((t) => t + 1), ms)
    return () => clearInterval(id)
  }, [active, ms])
  return Date.now() + off
}

/** Is this device connected to Firebase right now? */
export function useConnected() {
  const { value } = useDbValue(db ? '.info/connected' : null)
  return value !== false
}

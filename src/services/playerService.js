// Everything a student's phone does. Students can only write their own name claim,
// their own player record, their own presence flag and one answer per question.
import { ref, get, set, remove, runTransaction, onDisconnect, onValue, serverTimestamp } from 'firebase/database'
import { signInAnonymously } from 'firebase/auth'
import { auth, db } from '../firebase/config.js'
import { cleanName, nameKeyOf, ROOM_TTL_MS } from '../lib/gameLogic.js'

const r = (path) => ref(db, path)
const SESSION_KEY = 'tqc.session'

export function savedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}
export function saveSession(s) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* private mode – the game still works, just without auto-rejoin */
  }
}

export async function ensureStudentAuth() {
  if (auth.currentUser) return auth.currentUser
  const cred = await signInAnonymously(auth)
  return cred.user
}

export class JoinError extends Error {}

/** Check a room code and return its public info, or throw a friendly JoinError. */
export async function checkRoom(code) {
  if (!/^[0-9]{6}$/.test(code)) throw new JoinError('Room codes have 6 digits.')
  await ensureStudentAuth()
  const [metaSnap, stateSnap] = await Promise.all([get(r(`rooms/${code}/meta`)), get(r(`rooms/${code}/state`))])
  const meta = metaSnap.val()
  const state = stateSnap.val()
  if (!meta || !state) throw new JoinError('We could not find that room. Check the code on the screen.')
  if (Date.now() - meta.createdAt > ROOM_TTL_MS) throw new JoinError('This room has expired. Ask your teacher for a new code.')
  if (state.phase === 'ended') throw new JoinError('This game has already finished.')
  return { meta, state }
}

/**
 * Join (or re-join) a room.
 * - Re-joining with the same device keeps the same anonymous uid, team and score.
 * - Names are claimed atomically so two students can't use the same name.
 */
export async function joinRoom(code, rawName) {
  const user = await ensureStudentAuth()
  const uid = user.uid
  const { meta, state } = await checkRoom(code)

  const banned = await get(r(`rooms/${code}/banned/${uid}`))
  if (banned.exists()) throw new JoinError('You cannot join this room.')

  const existing = (await get(r(`rooms/${code}/players/${uid}`))).val()
  const name = cleanName(rawName)
  if (!name) throw new JoinError('Please type your name (letters and numbers).')
  if (name.length < 2) throw new JoinError('Your name needs at least 2 letters.')
  const nameKey = nameKeyOf(name)

  if (existing && existing.nameKey === nameKey) {
    // Same device, same name: just reconnect.
    saveSession({ code, name: existing.name, uid })
    return { name: existing.name, rejoined: true }
  }

  if (!existing && state.phase !== 'lobby' && meta.lateJoin !== true) {
    throw new JoinError('The game has already started. Ask your teacher to allow late joining.')
  }

  const tx = await runTransaction(r(`rooms/${code}/names/${nameKey}`), (current) => {
    if (current === null || current === uid) return uid
    return undefined // abort – name belongs to someone else
  })
  if (!tx.committed) throw new JoinError(`"${name}" is already taken. Add your surname initial, e.g. "${name} B".`)

  await set(r(`rooms/${code}/players/${uid}`), { name, nameKey, joinedAt: serverTimestamp() })
  if (existing && existing.nameKey !== nameKey) {
    await remove(r(`rooms/${code}/names/${existing.nameKey}`)).catch(() => {})
  }
  saveSession({ code, name, uid })
  return { name, rejoined: Boolean(existing) }
}

/** Keeps presence/<uid> true while connected; the server flips it to false on disconnect. */
export function trackPresence(code, uid) {
  const presRef = r(`rooms/${code}/presence/${uid}`)
  return onValue(r('.info/connected'), (snap) => {
    if (snap.val() !== true) return
    onDisconnect(presRef)
      .set(false)
      .then(() => set(presRef, true))
      .catch(() => {})
  })
}

/**
 * Submit an answer. The database rules reject it if: the question is not open, the deadline
 * has passed (server time), the student already answered, or the student has no team.
 */
export async function submitAnswer(code, qKey, uid, choice) {
  await set(r(`rooms/${code}/answers/${qKey}/${uid}`), { c: choice, t: serverTimestamp() })
}

export async function leaveRoom(code, uid, nameKey) {
  saveSession(null)
  try {
    await set(r(`rooms/${code}/presence/${uid}`), false)
    await remove(r(`rooms/${code}/players/${uid}`))
    if (nameKey) await remove(r(`rooms/${code}/names/${nameKey}`))
  } catch {
    /* the room may already be gone */
  }
}

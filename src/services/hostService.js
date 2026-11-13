// Everything the teacher's browser does. The teacher is the trusted authority in the
// free-tier design: only the authenticated host account can write these paths (see database.rules.json).
import {
  ref, get, set, update, remove, onDisconnect, serverTimestamp, onValue,
} from 'firebase/database'
import { db } from '../firebase/config.js'
import {
  randomRoomCode, makeTeams, scoreQuestion, totalsFromResults, teamBoard,
  buildGameQuestions, ROOM_TTL_MS,
} from '../lib/gameLogic.js'

const r = (path) => ref(db, path)

export async function isTeacher(uid) {
  const snap = await get(r(`teachers/${uid}`))
  return snap.val() === true
}

export const DEFAULT_SETTINGS = {
  teamCount: 3,
  timerSec: 20,
  speedBonus: true,
  rankBy: 'total',
  lateJoin: true,
  autoClose: true,
  shuffleOrder: false,
  categories: ['reading', 'grammar', 'vocabulary'],
}

export async function createRoom(uid, settings = {}) {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomRoomCode()
    const existing = await get(r(`rooms/${code}/meta`))
    if (existing.exists()) continue
    try {
      await set(r(`rooms/${code}`), {
        meta: {
          hostUid: uid,
          createdAt: serverTimestamp(),
          teamCount: s.teamCount,
          timerSec: s.timerSec,
          speedBonus: s.speedBonus,
          rankBy: s.rankBy,
          lateJoin: s.lateJoin,
          autoClose: s.autoClose,
          shuffleOrder: s.shuffleOrder,
          categories: s.categories,
        },
        state: { phase: 'lobby', qNumber: 0, total: 0, updatedAt: serverTimestamp() },
        hostOnline: true,
      })
      await set(r(`hostRooms/${uid}/${code}`), serverTimestamp())
      return code
    } catch (e) {
      // Code was taken between the check and the write – try another one.
      if (attempt === 7) throw e
    }
  }
  throw new Error('Could not create a room. Please try again.')
}

export async function listHostRooms(uid) {
  const snap = await get(r(`hostRooms/${uid}`))
  const codes = Object.keys(snap.val() || {})
  const rooms = await Promise.all(
    codes.map(async (code) => {
      const [meta, state] = await Promise.all([get(r(`rooms/${code}/meta`)), get(r(`rooms/${code}/state`))])
      return { code, meta: meta.val(), state: state.val() }
    }),
  )
  return rooms
    .filter((x) => x.meta)
    .sort((a, b) => b.meta.createdAt - a.meta.createdAt)
    .map((x) => ({ ...x, expired: Date.now() - x.meta.createdAt > ROOM_TTL_MS }))
}

export async function deleteRoom(uid, code) {
  await remove(r(`rooms/${code}`))
  await remove(r(`hostRooms/${uid}/${code}`))
}

/** Marks the host online and registers an onDisconnect so students see "teacher reconnecting". */
export function trackHostPresence(code) {
  const connRef = ref(db, '.info/connected')
  return onValue(connRef, (snap) => {
    if (snap.val() !== true) return
    const hostRef = r(`rooms/${code}/hostOnline`)
    onDisconnect(hostRef).set(false).then(() => set(hostRef, true))
  })
}

export function updateSettings(code, patch) {
  const u = {}
  Object.entries(patch).forEach(([k, v]) => (u[`meta/${k}`] = v))
  return update(r(`rooms/${code}`), u)
}

/** Remove a player. `block` also prevents the same device from rejoining this room. */
export function removePlayer(code, uid, nameKey, block = false) {
  const u = {
    [`players/${uid}`]: null,
    [`teams/${uid}`]: null,
    [`presence/${uid}`]: null,
  }
  if (nameKey) u[`names/${nameKey}`] = null
  if (block) u[`banned/${uid}`] = true
  return update(r(`rooms/${code}`), u)
}

export function generateTeams(code, playerUids, teamCount) {
  const teams = makeTeams(playerUids, teamCount)
  return update(r(`rooms/${code}`), {
    teams,
    'state/phase': 'teams',
    'state/updatedAt': serverTimestamp(),
  })
}

/** uid -> team id (or null to remove). Used for late joiners and clean-up. */
export function assignTeams(code, map) {
  const u = {}
  Object.entries(map).forEach(([uid, t]) => (u[`teams/${uid}`] = t))
  return update(r(`rooms/${code}`), u)
}

export function backToLobby(code) {
  return update(r(`rooms/${code}`), { teams: null, 'state/phase': 'lobby', 'state/updatedAt': serverTimestamp() })
}

/** Snapshot the chosen questions (with answers) into a host-only node and show question 1. */
export async function startGame(code, bank, meta) {
  const questions = buildGameQuestions(bank, {
    categories: meta.categories,
    shuffleOrder: meta.shuffleOrder,
  })
  if (!questions.length) throw new Error('No questions match the selected categories.')
  await update(r(`rooms/${code}`), {
    hostData: { questions, startedAt: serverTimestamp() },
    answers: null,
    results: null,
    scores: null,
    teamBoard: null,
    'state/total': questions.length,
  })
  return showPreview(code, 0, questions)
}

/** Show the question on the projector without opening answers (students see "Look at the screen"). */
export function showPreview(code, index, questions) {
  const q = questions[index]
  return update(r(`rooms/${code}/state`), {
    phase: 'preview',
    qIndex: index,
    qNumber: index + 1,
    qKey: `q${index + 1}`,
    category: q.category,
    hasPassage: Boolean(q.passage),
    reveal: null,
    segs: null,
    openedAt: null,
    durationMs: null,
    elapsedMs: 0,
    updatedAt: serverTimestamp(),
  })
}

/** Open answering. Deadline = server openedAt + durationMs; enforced by the rules on every answer. */
export function openQuestion(code, timerSec) {
  const durationMs = timerSec * 1000
  return update(r(`rooms/${code}/state`), {
    phase: 'question',
    openedAt: serverTimestamp(),
    durationMs,
    totalMs: durationMs,
    elapsedMs: 0,
    'segs/s0': { openedAt: serverTimestamp(), elapsedBefore: 0 },
    updatedAt: serverTimestamp(),
  })
}

export function pauseQuestion(code, state, serverNow) {
  const elapsed = (state.elapsedMs || 0) + Math.max(0, serverNow - state.openedAt)
  return update(r(`rooms/${code}/state`), {
    phase: 'paused',
    elapsedMs: Math.min(elapsed, state.totalMs),
    updatedAt: serverTimestamp(),
  })
}

export function resumeQuestion(code, state) {
  const remaining = Math.max(3000, state.totalMs - (state.elapsedMs || 0))
  const segKey = `s${Object.keys(state.segs || {}).length}`
  return update(r(`rooms/${code}/state`), {
    phase: 'question',
    openedAt: serverTimestamp(),
    durationMs: remaining,
    [`segs/${segKey}`]: { openedAt: serverTimestamp(), elapsedBefore: state.elapsedMs || 0 },
    updatedAt: serverTimestamp(),
  })
}

/**
 * Close the question and score it.
 * Step 1 locks answering (phase "closed"), step 2 reads the locked answers and writes
 * results, totals and the team board. Scoring is recomputed from all stored results,
 * so running it twice (e.g. after a teacher refresh) gives the same totals.
 */
export async function closeAndScore(code, room) {
  const { state, meta } = room
  const q = room.hostData?.questions?.[state.qIndex]
  if (!q) return
  if (state.phase === 'question' || state.phase === 'paused' || state.phase === 'preview') {
    await update(r(`rooms/${code}/state`), { phase: 'closed', updatedAt: serverTimestamp() })
  }
  const [answersSnap, resultsSnap, teamsSnap] = await Promise.all([
    get(r(`rooms/${code}/answers/${state.qKey}`)),
    get(r(`rooms/${code}/results`)),
    get(r(`rooms/${code}/teams`)),
  ])
  const teams = teamsSnap.val() || {}
  const { results, counts } = scoreQuestion({
    answers: answersSnap.val() || {},
    teams,
    correctIndex: q.answer,
    segments: state.segs,
    totalMs: state.totalMs,
    speedBonus: meta.speedBonus !== false,
  })
  const allResults = { ...(resultsSnap.val() || {}), [state.qKey]: results }
  const scores = totalsFromResults(allResults)
  const board = teamBoard({ scores, teams, teamCount: meta.teamCount, rankBy: meta.rankBy })
  await update(r(`rooms/${code}`), {
    [`results/${state.qKey}`]: results,
    scores,
    teamBoard: board,
    'state/phase': 'reveal',
    'state/reveal': { correct: q.answer, counts },
    'state/updatedAt': serverTimestamp(),
  })
}

/** Recalculate the team board (e.g. after removing a player or switching ranking mode). */
export async function recomputeBoard(code, meta) {
  const [resultsSnap, teamsSnap] = await Promise.all([get(r(`rooms/${code}/results`)), get(r(`rooms/${code}/teams`))])
  const scores = totalsFromResults(resultsSnap.val() || {})
  const board = teamBoard({ scores, teams: teamsSnap.val() || {}, teamCount: meta.teamCount, rankBy: meta.rankBy })
  return update(r(`rooms/${code}`), { scores, teamBoard: board })
}

export function showLeaderboard(code) {
  return update(r(`rooms/${code}/state`), { phase: 'leaderboard', updatedAt: serverTimestamp() })
}

export function backToReveal(code) {
  return update(r(`rooms/${code}/state`), { phase: 'reveal', updatedAt: serverTimestamp() })
}

export async function endGame(code, room) {
  if (room.state.phase === 'question' || room.state.phase === 'paused') {
    await closeAndScore(code, room)
  }
  return update(r(`rooms/${code}/state`), { phase: 'ended', updatedAt: serverTimestamp() })
}

/** Same players and teams, scores reset, back to the team screen. */
export function restartGame(code) {
  return update(r(`rooms/${code}`), {
    answers: null,
    results: null,
    scores: null,
    teamBoard: null,
    hostData: null,
    state: { phase: 'teams', qNumber: 0, total: 0, updatedAt: serverTimestamp() },
  })
}

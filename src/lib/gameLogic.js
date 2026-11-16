// Pure game logic. No Firebase imports here so it can be unit-tested.

export const TEAM_IDS = ['A', 'B', 'C', 'D']

export const TEAMS = {
  A: { id: 'A', name: 'The Explorers', short: 'Explorers', icon: 'compass', color: '#ff8a1f', dark: '#7a3a06' },
  B: { id: 'B', name: 'The Adventurers', short: 'Adventurers', icon: 'camera', color: '#1fa2ff', dark: '#0b3d8c' },
  C: { id: 'C', name: 'The Travellers', short: 'Travellers', icon: 'binoculars', color: '#a64dff', dark: '#4a1291' },
  D: { id: 'D', name: 'The Discoverers', short: 'Discoverers', icon: 'map', color: '#20c26a', dark: '#0b5e31' },
}

export const ANSWER_LETTERS = ['A', 'B', 'C', 'D']

export const CATEGORIES = {
  reading: 'Reading Comprehension',
  grammar: 'Grammar Challenge',
  vocabulary: 'Tourism Vocabulary',
}

export const TIMER_OPTIONS = [15, 20, 30, 45, 60]
export const ROOM_TTL_MS = 12 * 60 * 60 * 1000
export const BASE_POINTS = 100
export const MAX_SPEED_BONUS = 50
/** Extra time (ms) the database rules accept after the deadline, to absorb network latency. */
export const ANSWER_GRACE_MS = 1000

export function teamIdsFor(teamCount) {
  return TEAM_IDS.slice(0, Math.max(2, Math.min(4, teamCount || 2)))
}

/** Fisher–Yates shuffle using crypto randomness when available. Returns a new array. */
export function shuffle(list, rand = secureRandom) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function secureRandom() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0] / 2 ** 32
  }
  return Math.random()
}

/**
 * Shuffle players and deal them round-robin into teams so team sizes differ by at most one.
 * The team that receives the "extra" players is also randomised.
 * @returns {Record<string,string>} uid -> team id
 */
export function makeTeams(uids, teamCount, rand = secureRandom) {
  const ids = shuffle(teamIdsFor(teamCount), rand)
  const order = shuffle(uids, rand)
  const out = {}
  order.forEach((uid, i) => {
    out[uid] = ids[i % ids.length]
  })
  return out
}

/** Team with the fewest members (ties broken alphabetically) – used for late joiners. */
export function smallestTeam(teams, teamCount) {
  const counts = Object.fromEntries(teamIdsFor(teamCount).map((t) => [t, 0]))
  Object.values(teams || {}).forEach((t) => {
    if (t in counts) counts[t]++
  })
  return Object.entries(counts).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0][0]
}

/** Six-digit code, never starting with 0 so it is easy to read aloud. */
export function randomRoomCode(rand = secureRandom) {
  return String(100000 + Math.floor(rand() * 900000))
}

/**
 * Clean a student's name so it passes the database rules:
 * Latin letters, digits, spaces, hyphens and apostrophes, max 20 chars, starting with a letter/digit.
 */
export function cleanName(raw) {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`´]/g, "'")
    .replace(/[^A-Za-z0-9 '-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[ '-]+/, '')
    .trim()
    .slice(0, 20)
    .trim()
}

/** Must match the rule: name.toLowerCase().replace(' ', '_').replace('-', '_').replace("'", '') */
export function nameKeyOf(name) {
  return name.toLowerCase().split(' ').join('_').split('-').join('_').split("'").join('')
}

/**
 * Time (ms) a student took to answer, counting only the time the question was actually open.
 * `segments` is the list of open periods (pausing closes a segment, resuming opens a new one).
 */
export function elapsedForAnswer(t, segments) {
  const segs = Object.values(segments || {}).sort((a, b) => a.openedAt - b.openedAt)
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i]
    if (t >= s.openedAt) return (s.elapsedBefore || 0) + Math.max(0, t - s.openedAt)
  }
  return 0
}

export function pointsFor({ correct, elapsedMs, totalMs, speedBonus }) {
  if (!correct) return 0
  if (!speedBonus || !totalMs) return BASE_POINTS
  const frac = Math.max(0, Math.min(1, 1 - elapsedMs / totalMs))
  return BASE_POINTS + Math.round(MAX_SPEED_BONUS * frac)
}

/**
 * Score one question.
 * @param answers   uid -> {c, t}   (raw, server-timestamped submissions)
 * @param teams     uid -> team id  (only assigned players are scored)
 * @returns {{results: Record<string,{c:number,ok:boolean,pts:number}>, counts:number[]}}
 */
export function scoreQuestion({ answers, teams, correctIndex, segments, totalMs, speedBonus }) {
  const results = {}
  const counts = [0, 0, 0, 0]
  Object.entries(answers || {}).forEach(([uid, a]) => {
    if (!teams?.[uid] || typeof a?.c !== 'number' || a.c < 0 || a.c > 3) return
    counts[a.c]++
    const ok = a.c === correctIndex
    const elapsedMs = elapsedForAnswer(a.t, segments)
    results[uid] = { c: a.c, ok, pts: pointsFor({ correct: ok, elapsedMs, totalMs, speedBonus }) }
  })
  return { results, counts }
}

/** Sum every question's results into per-student totals. */
export function totalsFromResults(allResults) {
  const scores = {}
  Object.values(allResults || {}).forEach((perQ) => {
    Object.entries(perQ || {}).forEach(([uid, r]) => {
      const s = (scores[uid] ||= { total: 0, correct: 0, answered: 0 })
      s.total += r.pts || 0
      s.correct += r.ok ? 1 : 0
      s.answered += 1
    })
  })
  return scores
}

/**
 * Team totals and averages. Ranking uses `rankBy`: 'total' or 'average' (fair for uneven teams).
 */
export function teamBoard({ scores, teams, teamCount, rankBy = 'total' }) {
  const board = {}
  teamIdsFor(teamCount).forEach((id) => (board[id] = { total: 0, members: 0, avg: 0, rank: 0 }))
  Object.entries(teams || {}).forEach(([uid, t]) => {
    if (!board[t]) return
    board[t].members++
    board[t].total += scores?.[uid]?.total || 0
  })
  Object.values(board).forEach((b) => (b.avg = b.members ? Math.round(b.total / b.members) : 0))
  const key = rankBy === 'average' ? 'avg' : 'total'
  const ordered = Object.entries(board).sort((a, b) => b[1][key] - a[1][key] || a[0].localeCompare(b[0]))
  let rank = 0
  let prev = null
  ordered.forEach(([, b], i) => {
    if (prev === null || b[key] !== prev) rank = i + 1
    b.rank = rank
    prev = b[key]
  })
  return board
}

export function rankedTeams(board, rankBy = 'total') {
  const key = rankBy === 'average' ? 'avg' : 'total'
  return Object.entries(board || {})
    .map(([id, b]) => ({ id, ...TEAMS[id], ...b }))
    .sort((a, b) => (a.rank || 99) - (b.rank || 99) || b[key] - a[key])
}

/**
 * Validate and normalise a question bank object. Throws with a readable message on bad data.
 */
export function validateBank(bank) {
  if (!bank || typeof bank !== 'object') throw new Error('The file is not a question bank.')
  const passages = bank.passages && typeof bank.passages === 'object' ? bank.passages : {}
  const list = Array.isArray(bank.questions) ? bank.questions : Object.values(bank.questions || {})
  if (!list.length) throw new Error('The question bank has no questions.')
  const seen = new Set()
  const questions = list.map((q, i) => {
    const where = `Question ${i + 1}${q?.id ? ` (${q.id})` : ''}`
    if (!q || typeof q !== 'object') throw new Error(`${where} is not valid.`)
    const id = String(q.id || `q${i + 1}`).replace(/[^A-Za-z0-9_-]/g, '_')
    if (seen.has(id)) throw new Error(`${where}: duplicate id "${id}".`)
    seen.add(id)
    if (!CATEGORIES[q.category]) throw new Error(`${where}: category must be reading, grammar or vocabulary.`)
    if (!q.text || typeof q.text !== 'string') throw new Error(`${where}: question text is missing.`)
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => !String(o ?? '').trim()))
      throw new Error(`${where}: needs exactly four non-empty options.`)
    const answer = Number(q.answer)
    if (![0, 1, 2, 3].includes(answer)) throw new Error(`${where}: answer must be 0, 1, 2 or 3 (A–D).`)
    if (q.passageId && !passages[q.passageId]) throw new Error(`${where}: passage "${q.passageId}" not found.`)
    return {
      id,
      category: q.category,
      text: q.text.trim(),
      options: q.options.map((o) => String(o).trim()),
      answer,
      explanation: String(q.explanation || '').trim(),
      ...(q.passageId ? { passageId: q.passageId } : {}),
      ...(q.image ? { image: String(q.image) } : {}),
    }
  })
  const cleanPassages = {}
  Object.entries(passages).forEach(([id, p]) => {
    if (!p?.text) throw new Error(`Passage "${id}" has no text.`)
    cleanPassages[id.replace(/[^A-Za-z0-9_-]/g, '_')] = { title: String(p.title || ''), text: String(p.text) }
  })
  return { title: String(bank.title || 'Question bank'), passages: cleanPassages, questions }
}

/**
 * Choose questions for a game: filter by category, keep passage questions together, optional shuffle.
 */
export function buildGameQuestions(bank, { categories, shuffleOrder = false, limit = 0 } = {}, rand = secureRandom) {
  const cats = categories && categories.length ? categories : Object.keys(CATEGORIES)
  const picked = bank.questions.filter((q) => cats.includes(q.category))
  // group passage questions into blocks so a passage is read once
  const blocks = []
  const byPassage = {}
  picked.forEach((q) => {
    if (q.passageId) {
      if (!byPassage[q.passageId]) {
        byPassage[q.passageId] = []
        blocks.push(byPassage[q.passageId])
      }
      byPassage[q.passageId].push(q)
    } else blocks.push([q])
  })
  let ordered = (shuffleOrder ? shuffle(blocks, rand) : blocks).flat()
  if (limit > 0) ordered = ordered.slice(0, limit)
  return ordered.map((q) => ({ ...q, passage: q.passageId ? bank.passages[q.passageId] : null }))
}

/**
 * Individual ranking. Every scored player (anyone with a team entry – in Individual Mode
 * everyone is quietly placed in group "A") gets a rank; ties share a rank.
 * @returns {{ranks: Record<string, number>, count: number}}
 */
export function playerRanks(scores, teams) {
  const list = Object.keys(teams || {})
    .map((uid) => ({ uid, total: scores?.[uid]?.total || 0 }))
    .sort((a, b) => b.total - a.total || a.uid.localeCompare(b.uid))
  const ranks = {}
  let rank = 0
  let prev = null
  list.forEach((p, i) => {
    if (p.total !== prev) rank = i + 1
    ranks[p.uid] = rank
    prev = p.total
  })
  return { ranks, count: list.length }
}

export const RANK_COLORS = [
  { color: '#ffb800', dark: '#a25a00' }, // 1st – gold
  { color: '#8fa3c7', dark: '#3f4f73' }, // 2nd – silver
  { color: '#e0803a', dark: '#7a3a10' }, // 3rd – bronze
  { color: '#a64dff', dark: '#4a1291' }, // others – purple
]
export const rankColor = (rank) => RANK_COLORS[Math.min(Math.max(rank, 1), 4) - 1]

// Offline security-rules check using the "targaryen" rules simulator.
// It replays the exact writes the app makes and checks that cheating attempts are rejected.
// Run:  npm run test:rules-offline
// (For the official check, also run `npm run test:rules` with the Firebase emulator – see TESTING.md.)
const path = require('path')
const targaryen = require('targaryen')
const rules = require(path.join(__dirname, '..', 'database.rules.json'))

const TS = { '.sv': 'timestamp' }
const T0 = 1_800_000_000_000
const teacher = { uid: 'teacher1', provider: 'password', token: { firebase: { sign_in_provider: 'password' } } }
const teacher2 = { uid: 'teacher2', provider: 'password' }
const student = (uid) => ({ uid, provider: 'anonymous', token: { firebase: { sign_in_provider: 'anonymous' } } })
const amira = student('s_amira')
const omar = student('s_omar')
const eve = student('s_eve')

let db = targaryen.database(rules, { teachers: { teacher1: true, teacher2: true } }, T0)
let pass = 0
let fail = 0
const step = (desc, expectAllowed, fn) => {
  const res = fn(db)
  const ok = res.allowed === expectAllowed
  if (ok) {
    pass++
    if (res.allowed && res.type !== 'read' && res.newDatabase) db = res.newDatabase
  } else {
    fail++
    console.log(`✗ ${desc}\n   expected ${expectAllowed ? 'ALLOW' : 'DENY'}\n${res.info}\n`)
  }
  if (ok) console.log(`✓ ${desc}`)
}
const at = (ms) => T0 + ms

// ---------------------------------------------------------------- room creation
const room = {
  meta: { hostUid: 'teacher1', createdAt: TS, teamCount: 3, timerSec: 20, speedBonus: true, rankBy: 'total', lateJoin: true, autoClose: true, shuffleOrder: false, categories: ['reading', 'grammar'] },
  state: { phase: 'lobby', qNumber: 0, total: 0, updatedAt: TS },
  hostOnline: true,
}
step('student cannot create a room', false, (d) => d.as(amira).write('rooms/482731', { ...room, meta: { ...room.meta, hostUid: 's_amira' } }, { now: at(0) }))
step('teacher creates a room', true, (d) => d.as(teacher).write('rooms/482731', room, { now: at(0) }))
step('second teacher cannot overwrite an existing room', false, (d) => d.as(teacher2).write('rooms/482731', { ...room, meta: { ...room.meta, hostUid: 'teacher2' } }, { now: at(1) }))
step('teacher cannot create a room with a non-6-digit code', false, (d) => d.as(teacher).write('rooms/12ab', room, { now: at(1) }))
step('teacher records room in hostRooms', true, (d) => d.as(teacher).write('hostRooms/teacher1/482731', TS, { now: at(1) }))
step('teacher changes timer setting', true, (d) => d.as(teacher).update('rooms/482731', { 'meta/timerSec': 30 }, at(2)))
step('teacher cannot set an invalid timer', false, (d) => d.as(teacher).update('rooms/482731', { 'meta/timerSec': 33 }, at(2)))
step('teacher cannot change createdAt (to extend expiry)', false, (d) => d.as(teacher).update('rooms/482731', { 'meta/createdAt': at(99999999) }, at(2)))
step('student can read public meta', true, (d) => d.as(amira).read('rooms/482731/meta', at(3)))
step('student cannot read the whole room', false, (d) => d.as(amira).read('rooms/482731', at(3)))
step('unauthenticated user cannot read meta', false, (d) => targaryen.database(rules, d.snapshot('/').val(), at(3)).read('rooms/482731/meta', at(3)))

// ---------------------------------------------------------------- question bank privacy
step('teacher saves own question bank', true, (d) => d.as(teacher).write('banks/teacher1', { title: 'x', questions: [{ id: 'q1', answer: 2 }] }, { now: at(4) }))
step('student cannot read the question bank', false, (d) => d.as(amira).read('banks/teacher1', at(4)))
step('another teacher cannot read the bank', false, (d) => d.as(teacher2).read('banks/teacher1', at(4)))
step('student cannot make themselves a teacher', false, (d) => d.as(amira).write('teachers/s_amira', true, { now: at(4) }))

// ---------------------------------------------------------------- joining
step('student claims a name', true, (d) => d.as(amira).write('rooms/482731/names/amira_b', 's_amira', { now: at(10) }))
step('student writes player record', true, (d) => d.as(amira).write('rooms/482731/players/s_amira', { name: 'Amira B', nameKey: 'amira_b', joinedAt: TS }, { now: at(11) }))
step('presence true', true, (d) => d.as(amira).write('rooms/482731/presence/s_amira', true, { now: at(11) }))
step('second student cannot steal the same name', false, (d) => d.as(omar).write('rooms/482731/names/amira_b', 's_omar', { now: at(12) }))
step('student cannot write a player record without owning the name key', false, (d) => d.as(omar).write('rooms/482731/players/s_omar', { name: 'Amira B', nameKey: 'amira_b', joinedAt: TS }, { now: at(12) }))
step('name key must match the name', false, (d) => {
  const r = d.as(omar).write('rooms/482731/names/omar', 's_omar', { now: at(12) })
  return r.allowed ? r.newDatabase.as(omar).write('rooms/482731/players/s_omar', { name: 'Teacher', nameKey: 'omar', joinedAt: TS }, { now: at(12) }) : r
})
step('Omar claims name', true, (d) => d.as(omar).write('rooms/482731/names/omar', 's_omar', { now: at(12) }))
step('Omar joins', true, (d) => d.as(omar).write('rooms/482731/players/s_omar', { name: 'Omar', nameKey: 'omar', joinedAt: TS }, { now: at(13) }))
step('player record cannot contain extra fields (e.g. score)', false, (d) => d.as(omar).write('rooms/482731/players/s_omar', { name: 'Omar', nameKey: 'omar', joinedAt: TS, score: 9999 }, { now: at(13) }))
step('student cannot write another student\'s player record', false, (d) => d.as(omar).write('rooms/482731/players/s_amira', null, { now: at(13) }))
step('student cannot read another student\'s player record', false, (d) => d.as(omar).read('rooms/482731/players/s_amira', at(13)))
step('Eve joins as "Eve"', true, (d) => d.as(eve).write('rooms/482731/names/eve', 's_eve', { now: at(13) }))
step('Eve player', true, (d) => d.as(eve).write('rooms/482731/players/s_eve', { name: 'Eve', nameKey: 'eve', joinedAt: TS }, { now: at(13) }))

// ---------------------------------------------------------------- teams
step('student cannot choose their own team', false, (d) => d.as(amira).write('rooms/482731/teams/s_amira', 'A', { now: at(20) }))
step('student cannot change the phase', false, (d) => d.as(amira).update('rooms/482731', { 'state/phase': 'ended' }, at(20)))
step('teacher generates teams', true, (d) => d.as(teacher).update('rooms/482731', { teams: { s_amira: 'A', s_omar: 'B', s_eve: 'C' }, 'state/phase': 'teams', 'state/updatedAt': TS }, at(20)))
step('student reads own team', true, (d) => d.as(amira).read('rooms/482731/teams/s_amira', at(21)))
step('student cannot read others\' teams', false, (d) => d.as(amira).read('rooms/482731/teams/s_omar', at(21)))
step('invalid team letter rejected', false, (d) => d.as(teacher).update('rooms/482731', { 'teams/s_amira': 'Z' }, at(21)))

// ---------------------------------------------------------------- start game, preview
step('teacher stores questions in hostData', true, (d) => d.as(teacher).update('rooms/482731', { hostData: { questions: [{ text: 'Q', options: ['a', 'b', 'c', 'd'], answer: 2 }] }, 'state/total': 1 }, at(30)))
step('student cannot read hostData (answer key)', false, (d) => d.as(amira).read('rooms/482731/hostData', at(31)))
step('teacher shows preview', true, (d) => d.as(teacher).update('rooms/482731/state', { phase: 'preview', qIndex: 0, qNumber: 1, qKey: 'q1', category: 'grammar', reveal: null, segs: null, openedAt: null, durationMs: null, elapsedMs: 0, updatedAt: TS }, at(31)))
step('student cannot answer during preview', false, (d) => d.as(amira).write('rooms/482731/answers/q1/s_amira', { c: 1, t: TS }, { now: at(32) }))

// ---------------------------------------------------------------- answering
step('teacher opens question (20 s)', true, (d) => d.as(teacher).update('rooms/482731/state', { phase: 'question', openedAt: TS, durationMs: 20000, totalMs: 20000, elapsedMs: 0, 'segs/s0': { openedAt: TS, elapsedBefore: 0 }, updatedAt: TS }, at(40_000)))
step('student answers with a server timestamp', true, (d) => d.as(amira).write('rooms/482731/answers/q1/s_amira', { c: 2, t: TS }, { now: at(43_000) }))
step('student cannot change their answer', false, (d) => d.as(amira).write('rooms/482731/answers/q1/s_amira', { c: 1, t: TS }, { now: at(44_000) }))
step('student cannot delete their answer', false, (d) => d.as(amira).write('rooms/482731/answers/q1/s_amira', null, { now: at(44_000) }))
step('student cannot fake the timestamp', false, (d) => d.as(omar).write('rooms/482731/answers/q1/s_omar', { c: 2, t: at(40_001) }, { now: at(45_000) }))
step('student cannot answer for someone else', false, (d) => d.as(omar).write('rooms/482731/answers/q1/s_eve', { c: 2, t: TS }, { now: at(45_000) }))
step('answer must be 0-3', false, (d) => d.as(omar).write('rooms/482731/answers/q1/s_omar', { c: 7, t: TS }, { now: at(45_000) }))
step('answer cannot include extra fields (points)', false, (d) => d.as(omar).write('rooms/482731/answers/q1/s_omar', { c: 2, t: TS, pts: 150 }, { now: at(45_000) }))
step('student cannot answer a different question key', false, (d) => d.as(omar).write('rooms/482731/answers/q2/s_omar', { c: 2, t: TS }, { now: at(45_000) }))
step('student cannot read other students\' answers', false, (d) => d.as(omar).read('rooms/482731/answers/q1/s_amira', at(45_000)))
step('student cannot read the answers list', false, (d) => d.as(omar).read('rooms/482731/answers/q1', at(45_000)))
step('teacher can read all answers', true, (d) => d.as(teacher).read('rooms/482731/answers/q1', at(45_000)))
step('late answer after deadline (+1 s grace) is rejected', false, (d) => d.as(omar).write('rooms/482731/answers/q1/s_omar', { c: 2, t: TS }, { now: at(61_500) }))
step('answer just before the deadline is accepted', true, (d) => d.as(omar).write('rooms/482731/answers/q1/s_omar', { c: 1, t: TS }, { now: at(59_900) }))

// ---------------------------------------------------------------- pause/resume
step('teacher pauses', true, (d) => d.as(teacher).update('rooms/482731/state', { phase: 'paused', elapsedMs: 19950, updatedAt: TS }, at(59_950)))
step('student cannot answer while paused', false, (d) => d.as(eve).write('rooms/482731/answers/q1/s_eve', { c: 0, t: TS }, { now: at(60_000) }))
step('teacher resumes', true, (d) => d.as(teacher).update('rooms/482731/state', { phase: 'question', openedAt: TS, durationMs: 3000, 'segs/s1': { openedAt: TS, elapsedBefore: 19950 }, updatedAt: TS }, at(90_000)))
step('student can answer after resume', true, (d) => d.as(eve).write('rooms/482731/answers/q1/s_eve', { c: 0, t: TS }, { now: at(91_000) }))

// ---------------------------------------------------------------- scoring
step('student cannot write results', false, (d) => d.as(amira).write('rooms/482731/results/q1/s_amira', { c: 2, ok: true, pts: 999 }, { now: at(95_000) }))
step('student cannot write scores', false, (d) => d.as(amira).write('rooms/482731/scores/s_amira', { total: 999 }, { now: at(95_000) }))
step('student cannot write the team board', false, (d) => d.as(amira).write('rooms/482731/teamBoard/A/total', 9999, { now: at(95_000) }))
step('teacher closes question', true, (d) => d.as(teacher).update('rooms/482731/state', { phase: 'closed', updatedAt: TS }, at(95_000)))
step('no answers once closed', false, (d) => d.as(eve).write('rooms/482731/answers/q1/s_eve', { c: 0, t: TS }, { now: at(95_100) }))
step('teacher writes results, scores, board and reveal', true, (d) =>
  d.as(teacher).update('rooms/482731', {
    'results/q1': { s_amira: { c: 2, ok: true, pts: 143 }, s_omar: { c: 1, ok: false, pts: 0 }, s_eve: { c: 0, ok: false, pts: 0 } },
    scores: { s_amira: { total: 143, correct: 1, answered: 1 }, s_omar: { total: 0, correct: 0, answered: 1 }, s_eve: { total: 0, correct: 0, answered: 1 } },
    teamBoard: { A: { total: 143, members: 1, avg: 143, rank: 1 }, B: { total: 0, members: 1, avg: 0, rank: 2 }, C: { total: 0, members: 1, avg: 0, rank: 2 } },
    'state/phase': 'reveal', 'state/reveal': { correct: 2, counts: [1, 1, 1, 0] }, 'state/updatedAt': TS,
  }, at(96_000)))
step('student reads own result', true, (d) => d.as(amira).read('rooms/482731/results/q1/s_amira', at(96_100)))
step('student cannot read another student\'s result', false, (d) => d.as(amira).read('rooms/482731/results/q1/s_omar', at(96_100)))
step('student reads own score', true, (d) => d.as(amira).read('rooms/482731/scores/s_amira', at(96_100)))
step('student reads team board', true, (d) => d.as(amira).read('rooms/482731/teamBoard', at(96_100)))

// ---------------------------------------------------------------- removal / ban / late join
step('teacher removes and blocks Eve', true, (d) => d.as(teacher).update('rooms/482731', { 'players/s_eve': null, 'teams/s_eve': null, 'presence/s_eve': null, 'names/eve': null, 'banned/s_eve': true }, at(97_000)))
step('blocked student cannot rejoin', false, (d) => d.as(eve).write('rooms/482731/names/eve2', 's_eve', { now: at(98_000) }))
step('blocked student cannot unban themselves', false, (d) => d.as(eve).write('rooms/482731/banned/s_eve', null, { now: at(98_000) }))
const late = student('s_late')
step('late joiner can join mid-game when allowed', true, (d) => d.as(late).write('rooms/482731/names/lina', 's_late', { now: at(98_000) }))
step('late joiner player record', true, (d) => d.as(late).write('rooms/482731/players/s_late', { name: 'Lina', nameKey: 'lina', joinedAt: TS }, { now: at(98_000) }))
step('teacher disables late join', true, (d) => d.as(teacher).update('rooms/482731', { 'meta/lateJoin': false }, at(98_500)))
const late2 = student('s_late2')
step('new student cannot join mid-game when late join is off', false, (d) => d.as(late2).write('rooms/482731/names/sami', 's_late2', { now: at(99_000) }))
step('existing player can still re-write their record (reconnect)', true, (d) => d.as(amira).write('rooms/482731/players/s_amira', { name: 'Amira B', nameKey: 'amira_b', joinedAt: at(11) }, { now: at(99_000) }))
step('teacher presence flag', true, (d) => d.as(teacher).write('rooms/482731/hostOnline', false, { now: at(99_500) }))
step('student cannot fake teacher presence', false, (d) => d.as(amira).write('rooms/482731/hostOnline', true, { now: at(99_600) }))

// ---------------------------------------------------------------- expiry / end
step('teacher ends game', true, (d) => d.as(teacher).update('rooms/482731/state', { phase: 'ended', updatedAt: TS }, at(100_000)))
const late3 = student('s_late3')
step('cannot join an ended game', false, (d) => d.as(late3).write('rooms/482731/names/zed', 's_late3', { now: at(100_100) }))
step('teacher creates second room', true, (d) => d.as(teacher).write('rooms/111222', room, { now: at(200_000) }))
step('cannot join an expired room (13 h later)', false, (d) => d.as(late3).write('rooms/111222/names/zed', 's_late3', { now: at(200_000 + 13 * 3600 * 1000) }))
step('teacher deletes old room', true, (d) => d.as(teacher).write('rooms/111222', null, { now: at(200_000 + 13 * 3600 * 1000) }))
step('another teacher cannot delete it', false, (d) => d.as(teacher2).write('rooms/482731', null, { now: at(300_000) }))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)

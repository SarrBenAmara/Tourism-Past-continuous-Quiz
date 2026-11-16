// DEVELOPMENT ONLY: renders the presentational screens with sample data so the design can be
// checked without Firebase. Not included in production builds. Open #/__preview/<name>.
import { Target, Check, Users, Trophy, Sparkles, X } from 'lucide-react'
import { Scene, Logo } from '../components/Brand.jsx'
import { CornerTools, TeamIcon, teamVars } from '../components/ui.jsx'
import MainMenu from '../screens/MainMenu.jsx'
import LobbyView from '../screens/host/LobbyView.jsx'
import QuestionView from '../screens/host/QuestionView.jsx'
import { LeaderboardView, FinalView } from '../screens/host/BoardViews.jsx'
import { TEAMS, teamBoard } from '../lib/gameLogic.js'

const names = ['Yasmine', 'Adam', 'Rayen', 'Lina', 'Omar', 'Sarra K', 'Ines', 'Youssef', 'Malek', 'Nour', 'Aziz', 'Farah', 'Hedi', 'Eya', 'Skander', 'Mariem', 'Amine', 'Salma']
const players = names.map((n, i) => ({ uid: 'u' + i, name: n, nameKey: n.toLowerCase(), online: i % 7 !== 3, joinedAt: i }))
const teams = Object.fromEntries(players.map((p, i) => [p.uid, 'ABCD'[i % 4]]))
const meta = { teamCount: 4, timerSec: 20, speedBonus: true, rankBy: 'total', lateJoin: true, autoClose: true, categories: ['reading', 'grammar', 'vocabulary'] }
const board = { A: { total: 480, members: 5, avg: 96, rank: 1 }, B: { total: 410, members: 5, avg: 82, rank: 2 }, C: { total: 390, members: 4, avg: 98, rank: 3 }, D: { total: 360, members: 4, avg: 90, rank: 4 } }
const grammarQ = { id: 'g1', category: 'grammar', text: 'We ________ a boat trip around the island yesterday.', options: ['take', 'took', 'taken', 'are taking'], answer: 1, explanation: 'Yesterday tells us the action is finished, so we use the past simple: took.' }
const readingQ = {
  id: 'r1', category: 'reading', text: 'Why were the visitors not allowed to climb the old lighthouse?', options: ['It was closed for the winter', 'It was being repaired', 'It was too dangerous in the wind', 'Tickets had sold out'], answer: 1,
  explanation: 'The passage says the lighthouse "was being repaired" – past continuous passive.',
  passage: { title: 'A Day on Cape Blanc', text: 'When our group arrived at Cape Blanc, the sun was shining and a cool breeze was blowing from the sea. Our guide, Karim, was waiting for us at the harbour.\n\nWhile we were walking along the cliff path, Karim told us about the old lighthouse. Sadly, we could not go inside because it was being repaired. Workers were painting the tower and new windows were being fitted.' },
}

function Desk({ persona, children, pad = 90 }) {
  return (
    <Scene persona={persona}>
      <CornerTools fullscreen />
      <main className="page page--withPersona" style={{ paddingBottom: pad }}>{children}</main>
    </Scene>
  )
}

function PhoneFrame({ children, team = 'B', pts = 120 }) {
  return (
    <Scene mobile>
      <CornerTools />
      <main className="phone" style={{ paddingTop: 54 }}>
        <Logo variant="phone" />
        <div className="phone__pills">
          <span className="pill" style={teamVars(team)}>
            <span className="pill__icon" style={{ background: 'var(--tc)' }}><TeamIcon team={team} style={{ width: '60%', height: '60%' }} /></span>
            <span>{TEAMS[team].short}</span>
          </span>
          <span className="pill pill--gold"><Trophy aria-hidden="true" /><span>{pts} pts</span></span>
        </div>
        {children}
      </main>
    </Scene>
  )
}

const noop = () => {}
const solo = { ...meta, mode: 'individual' }
const ranked = players.map((p, i) => ({ ...p, team: 'A', total: [980, 860, 860, 720, 690, 600, 540, 510, 400, 350][i] ?? 200, correct: 9 - Math.min(i, 8) }))
ranked.forEach((p, i, a) => (p.rank = i > 0 && a[i - 1].total === p.total ? a[i - 1].rank : i + 1))

export default function PreviewGallery({ name }) {
  const now = { qNumber: 5, total: 36, totalMs: 20000 }
  switch (name) {
    case 'menu':
      return <MainMenu />
    case 'lobby':
      return <Desk persona="hold" pad={24}><LobbyView code="482731" meta={{ ...meta, teamCount: 3 }} phase="lobby" players={players} teams={{}} bankCount={36} onSetting={noop} onGenerate={noop} onStart={noop} onRemove={noop} /></Desk>
    case 'teams':
      return <Desk persona="hold" pad={24}><LobbyView code="482731" meta={meta} phase="teams" players={players} teams={teams} bankCount={36} onSetting={noop} onGenerate={noop} onStart={noop} onRemove={noop} onBackToSettings={noop} /></Desk>
    case 'lobby-solo':
      return <Desk persona="hold" pad={24}><LobbyView code="482731" meta={solo} phase="lobby" players={players} teams={{}} bankCount={36} onSetting={noop} onGenerate={noop} onStart={noop} onRemove={noop} /></Desk>
    case 'question-solo':
      return <Desk persona="point"><QuestionView question={grammarQ} state={{ ...now, phase: 'question' }} meta={solo} board={board} answered={12} totalPlayers={18} remainingMs={14200} rankedPlayers={ranked} /></Desk>
    case 'leaderboard-solo':
      return <Desk persona="point"><LeaderboardView board={board} meta={solo} state={now} rankedPlayers={ranked} /></Desk>
    case 'final-solo':
      return <Desk persona="hold"><FinalView board={board} meta={solo} rankedPlayers={ranked} /></Desk>
    case 'phone-solo':
      return (
        <Scene mobile>
          <main className="phone" style={{ paddingTop: 54 }}>
            <Logo variant="phone" />
            <div className="phone__pills">
              <span className="pill"><span className="pill__icon"><Users style={{ width: '60%' }} /></span><span>Yasmine</span></span>
              <span className="pill pill--gold"><Trophy aria-hidden="true" /><span>980 pts</span></span>
            </div>
            <div className="status-card"><div className="status-card__icon"><Trophy /></div><h2>Leaderboard</h2><p style={{ fontSize: 22 }}>You are <b style={{ color: 'var(--purple)', fontSize: '1.5em' }}>#3</b> of 18</p><p>Your points: <b>860</b> · correct answers: <b>7</b></p></div>
          </main>
        </Scene>
      )
    case 'question':
      return <Desk persona="point"><QuestionView question={grammarQ} state={{ ...now, phase: 'question' }} meta={meta} board={board} answered={12} totalPlayers={18} remainingMs={14200} /></Desk>
    case 'reading':
      return <Desk persona="point"><QuestionView question={readingQ} state={{ ...now, qNumber: 2, phase: 'question' }} meta={meta} board={board} answered={7} totalPlayers={18} remainingMs={4200} /></Desk>
    case 'reveal':
      return <Desk persona="point"><QuestionView question={grammarQ} state={{ ...now, phase: 'reveal', reveal: { correct: 1, counts: [3, 11, 2, 2] } }} meta={meta} board={board} answered={18} totalPlayers={18} remainingMs={0} /></Desk>
    case 'leaderboard':
      return <Desk persona="point"><LeaderboardView board={board} meta={meta} state={now} topPlayers={players.slice(0, 5).map((p, i) => ({ ...p, team: teams[p.uid], total: 600 - i * 70 }))} /></Desk>
    case 'final':
      return <Desk persona="hold"><FinalView board={teamBoard({ scores: {}, teams: {}, teamCount: 4 }) && board} meta={meta} topPlayers={[{ uid: 'u1', name: 'Yasmine', team: 'A', total: 1240 }]} /></Desk>
    case 'phone-wait':
      return <PhoneFrame><div className="status-card"><div className="status-card__icon"><Sparkles /></div><h2>You're in!</h2><p style={{ fontSize: 22 }}>Hi <b>Yasmine</b> 👋</p><p>Waiting for Mrs Sarra to start the game<span className="dots" /></p></div></PhoneFrame>
    case 'phone-team':
      return <PhoneFrame><div className="status-card" style={teamVars('B')}><p style={{ marginTop: 0 }}>Your team is…</p><div className="team-badge" style={{ margin: '10px 0' }}><TeamIcon team="B" /> {TEAMS.B.name}</div><p>Get ready! Look at the classroom screen.</p></div></PhoneFrame>
    case 'phone-answer':
      return (
        <PhoneFrame>
          <div className="banner"><Target aria-hidden="true" /> Choose your answer!</div>
          <div className="timebar" style={{ width: '100%' }}><i style={{ transform: 'scaleX(0.7)' }} /></div>
          <div className="pad">{['A', 'B', 'C', 'D'].map((L) => <button key={L} className={`pad-btn pad-btn--${L}`}>{L}</button>)}</div>
        </PhoneFrame>
      )
    case 'phone-sent':
      return <PhoneFrame><div className="status-card status-card--ok"><div className="status-card__icon"><Check /></div><h2>Answer submitted!</h2><p>You chose <b style={{ fontSize: '1.4em', color: 'var(--purple)' }}>B</b>. Wait for the results<span className="dots" /></p></div></PhoneFrame>
    case 'phone-correct':
      return <PhoneFrame pts={270}><div className="status-card status-card--ok"><div className="status-card__icon"><Check /></div><h2>Correct!</h2><p>You chose B</p><span className="status-card__pts">+138</span><p>Your total: 538 pts</p></div></PhoneFrame>
    case 'phone-wrong':
      return <PhoneFrame><div className="status-card status-card--bad"><div className="status-card__icon"><X /></div><h2>Incorrect</h2><p>You chose C · the answer was B</p><span className="status-card__pts">+0</span><p>Your total: 400 pts</p></div></PhoneFrame>
    default:
      return (
        <Scene mobile>
          <main className="phone">
            <ul className="status-card" style={{ textAlign: 'left' }}>
              {['menu', 'lobby', 'lobby-solo', 'question-solo', 'leaderboard-solo', 'final-solo', 'phone-solo', 'teams', 'question', 'reading', 'reveal', 'leaderboard', 'final', 'phone-wait', 'phone-team', 'phone-answer', 'phone-sent', 'phone-correct', 'phone-wrong'].map((n) => (
                <li key={n}><a href={`#/__preview/${n}`}>{n}</a></li>
              ))}
              <li><Users style={{ width: 16 }} /> dev only</li>
            </ul>
          </main>
        </Scene>
      )
  }
}

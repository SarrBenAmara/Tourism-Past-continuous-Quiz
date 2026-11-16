import { Trophy as TrophyIcon, Star, Crown } from 'lucide-react'
import { Logo, Trophy } from '../../components/Brand.jsx'
import { TeamIcon, teamVars, rankVars } from '../../components/ui.jsx'
import { rankedTeams } from '../../lib/gameLogic.js'

/** Animated team leaderboard (Screen 8). */
export function LeaderboardView({ board, meta, topPlayers = [], state, rankedPlayers = [] }) {
  if (meta.mode === 'individual') return <SoloLeaderboard players={rankedPlayers} state={state} />
  const rankBy = meta.rankBy === 'average' ? 'average' : 'total'
  const rows = rankedTeams(board, rankBy)
  const key = rankBy === 'average' ? 'avg' : 'total'
  const max = Math.max(1, ...rows.map((r) => r[key]))
  return (
    <>
      <Logo variant="bar" />
      <h2 className="big-title">
        <TrophyIcon style={{ width: '0.9em', height: '0.9em', verticalAlign: '-0.1em', color: 'var(--gold)' }} aria-hidden="true" /> Leaderboard
      </h2>
      <p className="sub-title">
        After question {state?.qNumber} of {state?.total}
        {rankBy === 'average' ? ' · ranked by average points per member' : ''}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: topPlayers.length ? 'minmax(0, 2.2fr) minmax(220px, 1fr)' : '1fr', gap: 18, width: '100%', maxWidth: 1180, marginTop: 16 }}>
        <div className="board">
          {rows.map((t) => (
            <div key={t.id} className={`board-row board-row--${t.rank}`} style={teamVars(t.id)}>
              <span className="board-row__rank">{t.rank}</span>
              <span className="board-row__icon">
                <TeamIcon team={t.id} />
              </span>
              <span className="board-row__name">
                {t.name}
                <small>{t.members} {t.members === 1 ? 'member' : 'members'}</small>
              </span>
              <span className="board-row__bar" aria-hidden="true">
                <i style={{ width: `${(t[key] / max) * 100}%` }} />
              </span>
              <span className="board-row__pts">
                {t[key]} pts
                <small>{rankBy === 'average' ? `total ${t.total}` : `avg ${t.avg}`}</small>
              </span>
            </div>
          ))}
        </div>
        {topPlayers.length > 0 && <StarPlayers players={topPlayers} />}
      </div>
    </>
  )
}

function StarPlayers({ players }) {
  return (
    <div className="panel" style={{ alignSelf: 'start' }}>
      <div className="panel__head" style={{ fontSize: 'clamp(18px, 1.6vw, 26px)' }}>
        <Star aria-hidden="true" fill="currentColor" /> Star Players
      </div>
      <ol className="panel__body stack" style={{ margin: 0, listStyle: 'none', gap: 8 }}>
        {players.map((p, i) => (
          <li key={p.uid} className="row" style={{ gap: 10, fontFamily: 'var(--display)', fontWeight: 700, fontSize: 'clamp(15px, 1.3vw, 21px)', flexWrap: 'nowrap' }}>
            <span className="step__num" style={{ width: '1.6em', height: '1.6em' }}>{i + 1}</span>
            <span className="board-row__icon" style={{ ...teamVars(p.team), width: '1.6em', height: '1.6em' }}>
              <TeamIcon team={p.team} />
            </span>
            <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            <span style={{ color: 'var(--purple)' }}>{p.total}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** End-of-game celebration with trophy and podium. */
export function FinalView({ board, meta, topPlayers = [], rankedPlayers = [] }) {
  if (meta.mode === 'individual') return <SoloFinal players={rankedPlayers} />
  const rankBy = meta.rankBy === 'average' ? 'average' : 'total'
  const key = rankBy === 'average' ? 'avg' : 'total'
  const rows = rankedTeams(board, rankBy)
  const winners = rows.filter((r) => r.rank === 1)
  const podium = [rows[1], rows[0], rows[2]].filter(Boolean)
  const heights = { 1: 'clamp(110px, 19vh, 220px)', 2: 'clamp(80px, 13vh, 160px)', 3: 'clamp(60px, 9vh, 120px)', 4: '60px' }
  const title = winners.length > 1 ? "It's a tie!" : `${winners[0]?.name || 'Everyone'} win!`
  return (
    <>
      <Logo variant="bar" />
      <Trophy className="trophy" style={{ marginTop: 6 }} />
      <h2 className="big-title" style={{ marginTop: 0 }}>{title}</h2>
      <p className="sub-title">Congratulations, travellers! Thank you for playing.</p>
      <div className="podium" style={{ marginTop: 18 }}>
        {podium.map((t) => (
          <div key={t.id} className="podium__col" style={teamVars(t.id)}>
            <span className="board-row__icon" style={{ fontSize: 'clamp(26px, 3vw, 46px)' }}>
              <TeamIcon team={t.id} />
            </span>
            <span className="podium__name">{t.name}</span>
            <span className="podium__pts">{t[key]} pts</span>
            <div className="podium__block" style={{ height: heights[t.rank] || heights[4] }}>{t.rank}</div>
          </div>
        ))}
      </div>
      {rows.length > 3 && (
        <p className="sub-title" style={{ marginTop: 10 }}>
          {rows[3].rank}th: {rows[3].name} – {rows[3][key]} pts
        </p>
      )}
      {topPlayers.length > 0 && (
        <p className="sub-title" style={{ marginTop: 12 }}>
          <Star style={{ width: '1em', verticalAlign: '-0.15em', color: 'var(--gold)' }} fill="currentColor" aria-hidden="true" /> Top player
          {topPlayers.filter((p) => p.total === topPlayers[0].total).length > 1 ? 's' : ''}:{' '}
          {topPlayers.filter((p) => p.total === topPlayers[0].total).map((p) => p.name).join(', ')} ({topPlayers[0].total} pts)
        </p>
      )}
    </>
  )
}

const initial = (name) => (name || '?').trim().charAt(0).toUpperCase()

function PlayerAvatar({ rank, name }) {
  return (
    <span className="board-row__icon" style={{ ...rankVars(rank), fontFamily: 'var(--display)', fontWeight: 800 }}>
      {rank === 1 ? <Crown /> : initial(name)}
    </span>
  )
}

/** Individual Mode leaderboard: top 6 players with animated bars. */
function SoloLeaderboard({ players, state }) {
  const top = players.slice(0, 6)
  const max = Math.max(1, ...top.map((p) => p.total))
  return (
    <>
      <Logo variant="bar" />
      <h2 className="big-title">
        <TrophyIcon style={{ width: '0.9em', height: '0.9em', verticalAlign: '-0.1em', color: 'var(--gold)' }} aria-hidden="true" /> Leaderboard
      </h2>
      <p className="sub-title">After question {state?.qNumber} of {state?.total}</p>
      <div className="board board--solo" style={{ maxWidth: 1000, marginTop: 14 }}>
        {top.map((p) => (
          <div key={p.uid} className={`board-row board-row--${p.rank}`} style={rankVars(p.rank)}>
            <span className="board-row__rank">{p.rank}</span>
            <PlayerAvatar rank={p.rank} name={p.name} />
            <span className="board-row__name">
              {p.name}
              <small>{p.correct || 0} correct</small>
            </span>
            <span className="board-row__bar" aria-hidden="true">
              <i style={{ width: `${(p.total / max) * 100}%` }} />
            </span>
            <span className="board-row__pts">{p.total} pts</span>
          </div>
        ))}
      </div>
      {players.length > top.length && (
        <p className="sub-title" style={{ marginTop: 10 }}>
          …and {players.length - top.length} more {players.length - top.length === 1 ? 'player' : 'players'} – check your phone for your place!
        </p>
      )}
    </>
  )
}

/** Individual Mode finale: podium of the top three players. */
function SoloFinal({ players }) {
  const winners = players.filter((p) => p.rank === 1)
  const podium = [players[1], players[0], players[2]].filter(Boolean)
  const heights = { 1: 'clamp(110px, 19vh, 220px)', 2: 'clamp(80px, 13vh, 160px)', 3: 'clamp(60px, 9vh, 120px)' }
  const title = !winners.length ? 'Game over!' : winners.length > 1 ? `It's a tie: ${winners.map((w) => w.name).join(' & ')}!` : `${winners[0].name} wins!`
  return (
    <>
      <Logo variant="bar" />
      <Trophy className="trophy" style={{ marginTop: 6 }} />
      <h2 className="big-title" style={{ marginTop: 0 }}>{title}</h2>
      <p className="sub-title">Congratulations, travellers! Thank you for playing.</p>
      <div className="podium" style={{ marginTop: 18 }}>
        {podium.map((p) => (
          <div key={p.uid} className="podium__col" style={rankVars(p.rank)}>
            <span style={{ fontSize: 'clamp(26px, 3vw, 46px)' }}>
              <PlayerAvatar rank={p.rank} name={p.name} />
            </span>
            <span className="podium__name">{p.name}</span>
            <span className="podium__pts">{p.total} pts</span>
            <div className="podium__block" style={{ height: heights[p.rank] || '50px' }}>{p.rank}</div>
          </div>
        ))}
      </div>
      {players.length > 3 && (
        <p className="sub-title" style={{ marginTop: 10 }}>
          {players.slice(3, 5).map((p) => `${p.rank}th: ${p.name} – ${p.total} pts`).join('   ·   ')}
        </p>
      )}
    </>
  )
}

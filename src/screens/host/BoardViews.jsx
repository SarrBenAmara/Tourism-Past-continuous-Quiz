import { Trophy as TrophyIcon, Star } from 'lucide-react'
import { Logo, Trophy } from '../../components/Brand.jsx'
import { TeamIcon, teamVars } from '../../components/ui.jsx'
import { rankedTeams } from '../../lib/gameLogic.js'

/** Animated team leaderboard (Screen 8). */
export function LeaderboardView({ board, meta, topPlayers = [], state }) {
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
export function FinalView({ board, meta, topPlayers = [] }) {
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

import { useEffect, useRef, useState } from 'react'
import { Users, Trophy, Target, Check, X, Eye, Pause, Hourglass, WifiOff, LogOut, Sparkles, MonitorSmartphone } from 'lucide-react'
import { Scene, Logo, Trophy as TrophyArt } from '../../components/Brand.jsx'
import { CornerTools, TeamIcon, teamVars, Spinner, fireConfetti, Btn } from '../../components/ui.jsx'
import { useAuthUser, useDbValue, useTicker, useConnected } from '../../hooks/useFirebase.js'
import { savedSession, saveSession, trackPresence, submitAnswer, leaveRoom } from '../../services/playerService.js'
import { TEAMS, ANSWER_LETTERS, rankedTeams } from '../../lib/gameLogic.js'
import { navigate } from '../../lib/router.js'
import { play } from '../../lib/sound.js'

export default function PlayerGame() {
  const session = savedSession()
  const user = useAuthUser()

  useEffect(() => {
    if (!session) navigate('/join', { replace: true })
  }, [session])

  if (!session) return null
  if (user === undefined) return <PhoneShell><Spinner label="Connecting" /></PhoneShell>
  if (!user || user.uid !== session.uid) {
    // Browser storage was cleared or another account signed in: join again.
    return (
      <PhoneShell>
        <div className="status-card">
          <h2>Please join again</h2>
          <p>Your game session was reset on this device.</p>
          <Btn color="blue" onClick={() => navigate(`/join?code=${session.code}`)}>Join room {session.code}</Btn>
        </div>
      </PhoneShell>
    )
  }
  return <Player code={session.code} uid={user.uid} />
}

function PhoneShell({ children, header }) {
  return (
    <Scene mobile>
      <CornerTools />
      <main className="phone" style={{ paddingTop: 54 }}>
        <Logo variant="phone" />
        {header}
        {children}
      </main>
    </Scene>
  )
}

function Player({ code, uid }) {
  const base = `rooms/${code}`
  const meta = useDbValue(`${base}/meta`)
  const stateV = useDbValue(`${base}/state`)
  const me = useDbValue(`${base}/players/${uid}`)
  const banned = useDbValue(`${base}/banned/${uid}`)
  const team = useDbValue(`${base}/teams/${uid}`)
  const board = useDbValue(`${base}/teamBoard`)
  const hostOnline = useDbValue(`${base}/hostOnline`)
  const score = useDbValue(`${base}/scores/${uid}`)
  const state = stateV.value
  const qKey = state?.qKey
  const myAnswer = useDbValue(qKey ? `${base}/answers/${qKey}/${uid}` : null)
  const myResult = useDbValue(qKey ? `${base}/results/${qKey}/${uid}` : null)
  const connected = useConnected()

  const [picked, setPicked] = useState(null) // {qKey, c}
  const [sendError, setSendError] = useState(null)

  useEffect(() => trackPresence(code, uid), [code, uid])

  // reset local pick when the question changes
  useEffect(() => {
    setPicked(null)
    setSendError(null)
  }, [qKey])

  const phase = state?.phase
  const teamId = team.value
  const now = useTicker(phase === 'question', 250)
  const remainingMs = phase === 'question' && state?.openedAt ? Math.max(0, state.openedAt + state.durationMs - now) : 0

  // feedback sounds / confetti
  const resultKey = myResult.value ? `${qKey}:${myResult.value.ok}` : null
  const lastResult = useRef(null)
  useEffect(() => {
    if (phase !== 'reveal' || !resultKey || lastResult.current === resultKey) return
    lastResult.current = resultKey
    if (myResult.value.ok) {
      play('correct')
      fireConfetti(false)
    } else play('wrong')
  }, [phase, resultKey, myResult.value])
  const endedOnce = useRef(false)
  useEffect(() => {
    if (phase === 'ended' && !endedOnce.current && teamId && board.value?.[teamId]?.rank === 1) {
      endedOnce.current = true
      play('fanfare')
      fireConfetti(true)
    }
  }, [phase, teamId, board.value])

  const loading = meta.loading || stateV.loading || me.loading
  if (loading) return <PhoneShell><Spinner label="Joining" /></PhoneShell>

  if (!meta.value || !state) {
    saveSession(null)
    return (
      <PhoneShell>
        <Message icon={X} bad title="Room closed" text="This room no longer exists." action={['Join another game', () => navigate('/join')]} />
      </PhoneShell>
    )
  }
  if (banned.value) {
    saveSession(null)
    return (
      <PhoneShell>
        <Message icon={X} bad title="You were removed" text="Your teacher removed you from this room." action={['Main menu', () => navigate('/')]} />
      </PhoneShell>
    )
  }
  if (!me.value) {
    return (
      <PhoneShell>
        <Message
          icon={Users}
          title="You're not in this room"
          text="Your teacher may have removed your name. You can join again with a different name."
          action={['Join again', () => navigate(`/join?code=${code}`)]}
        />
      </PhoneShell>
    )
  }

  const avg = meta.value.rankBy === 'average'
  const teamPts = teamId ? (avg ? board.value?.[teamId]?.avg : board.value?.[teamId]?.total) ?? 0 : null
  const header = (
    <div className="phone__pills">
      <span className="pill" style={teamId ? teamVars(teamId) : undefined}>
        <span className="pill__icon" style={teamId ? { background: 'var(--tc)' } : undefined}>
          {teamId ? <TeamIcon team={teamId} style={{ width: '60%', height: '60%' }} /> : <Users style={{ width: '60%' }} />}
        </span>
        <span>{teamId ? TEAMS[teamId].short : me.value.name}</span>
      </span>
      <span className="pill pill--gold">
        <Trophy aria-hidden="true" />
        <span>{teamPts ?? score.value?.total ?? 0} pts</span>
      </span>
    </div>
  )

  const answered = myAnswer.value || (picked?.qKey === qKey ? picked : null)

  const choose = async (c) => {
    if (answered || phase !== 'question') return
    play('tap')
    setPicked({ qKey, c })
    setSendError(null)
    try {
      await submitAnswer(code, qKey, uid, c)
      if (navigator.vibrate) navigator.vibrate(30)
    } catch (e) {
      console.error(e)
      setPicked(null)
      setSendError(remainingMs <= 1500 ? "Too late – time's up!" : 'Your answer was not accepted. Check your connection.')
    }
  }

  let content
  switch (phase) {
    case 'lobby':
      content = (
        <Message
          icon={Sparkles}
          title="You're in!"
          text={<>Waiting for Mrs Sarra to start the game<span className="dots" /></>}
          extra={<p style={{ fontSize: 22 }}>Hi <b>{me.value.name}</b> 👋</p>}
        />
      )
      break
    case 'teams':
      content = teamId ? (
        <div className="status-card" style={teamVars(teamId)}>
          <p style={{ marginTop: 0 }}>Your team is…</p>
          <div className="team-badge" style={{ margin: '10px 0' }}>
            <TeamIcon team={teamId} /> {TEAMS[teamId].name}
          </div>
          <p>Get ready! Look at the classroom screen.</p>
        </div>
      ) : (
        <Message icon={Users} title="Making teams" text={<>Hold on<span className="dots" /></>} />
      )
      break
    case 'preview':
      content = <Message icon={Eye} title={`Question ${state.qNumber}`} text="Look at the screen and read the question!" />
      break
    case 'question':
      content = answered ? (
        <div className="status-card status-card--ok">
          <div className="status-card__icon"><Check /></div>
          <h2>Answer submitted!</h2>
          <p>
            You chose <b style={{ fontSize: '1.4em', color: 'var(--purple)' }}>{ANSWER_LETTERS[answered.c]}</b>. Wait for the results<span className="dots" />
          </p>
        </div>
      ) : !teamId ? (
        <Message icon={Hourglass} title="Joining your team" text="You'll be able to answer in a moment." />
      ) : (
        <>
          <div className="banner">
            <Target aria-hidden="true" /> Choose your answer!
          </div>
          <div className="timebar" style={{ width: '100%' }} aria-hidden="true">
            <i style={{ transform: `scaleX(${state.durationMs ? remainingMs / state.totalMs : 1})` }} />
          </div>
          <div className="pad" role="group" aria-label="Answer buttons">
            {ANSWER_LETTERS.map((L, i) => (
              <button key={L} className={`pad-btn pad-btn--${L}`} onClick={() => choose(i)} aria-label={`Answer ${L}`}>
                {L}
              </button>
            ))}
          </div>
          {sendError && <div className="notice notice--error" role="alert">{sendError}</div>}
        </>
      )
      break
    case 'paused':
      content = <Message icon={Pause} title="Paused" text={answered ? `Your answer (${ANSWER_LETTERS[answered.c]}) is saved.` : 'The teacher paused the question.'} />
      break
    case 'closed':
      content = (
        <Message icon={Hourglass} title="Time's up!" text={answered ? `Your answer: ${ANSWER_LETTERS[answered.c]}. Checking…` : 'No answer this time. Checking…'} />
      )
      break
    case 'reveal': {
      const r = myResult.value
      content = r ? (
        <div className={`status-card ${r.ok ? 'status-card--ok' : 'status-card--bad'}`}>
          <div className="status-card__icon">{r.ok ? <Check /> : <X />}</div>
          <h2>{r.ok ? 'Correct!' : 'Incorrect'}</h2>
          <p>
            You chose {ANSWER_LETTERS[r.c]}
            {!r.ok && state.reveal ? ` · the answer was ${ANSWER_LETTERS[state.reveal.correct]}` : ''}
          </p>
          <span className="status-card__pts">+{r.pts}</span>
          <p>Your total: {score.value?.total ?? 0} pts</p>
        </div>
      ) : (
        <Message
          icon={Hourglass}
          bad
          title="No answer"
          text={`The correct answer was ${state.reveal ? ANSWER_LETTERS[state.reveal.correct] : '…'}. +0 points`}
        />
      )
      break
    }
    case 'leaderboard':
    case 'ended': {
      const rows = rankedTeams(board.value, avg ? 'average' : 'total')
      const mine = rows.find((t) => t.id === teamId)
      const win = phase === 'ended' && mine?.rank === 1
      content = (
        <div className="status-card" style={teamId ? teamVars(teamId) : undefined}>
          {win ? <TrophyArt style={{ width: 110 }} /> : <div className="status-card__icon"><Trophy /></div>}
          <h2>{phase === 'ended' ? (win ? 'Your team won!' : 'Game over!') : 'Leaderboard'}</h2>
          {mine && (
            <>
              <div className="team-badge" style={{ margin: '8px 0', fontSize: 22 }}>
                <TeamIcon team={teamId} /> {mine.name}
              </div>
              <p style={{ fontSize: 22 }}>
                Position <b style={{ color: 'var(--purple)', fontSize: '1.4em' }}>#{mine.rank}</b> of {rows.length}
              </p>
            </>
          )}
          <p>Your points: <b>{score.value?.total ?? 0}</b> · correct answers: <b>{score.value?.correct ?? 0}</b></p>
          {phase === 'ended' && (
            <Btn color="dark" size="sm" icon={LogOut} style={{ marginTop: 14 }} onClick={() => leaveRoom(code, uid, me.value.nameKey).then(() => navigate('/'))}>
              Leave
            </Btn>
          )}
        </div>
      )
      break
    }
    default:
      content = <Spinner label="Waiting" />
  }

  return (
    <PhoneShell header={header}>
      {!connected && (
        <div className="status-banner">
          <WifiOff style={{ width: 18, verticalAlign: '-3px' }} aria-hidden="true" /> Reconnecting… don't close this page.
        </div>
      )}
      {connected && hostOnline.value === false && phase !== 'ended' && (
        <div className="status-banner">
          <MonitorSmartphone style={{ width: 18, verticalAlign: '-3px' }} aria-hidden="true" /> Mrs Sarra's screen is reconnecting…
        </div>
      )}
      {content}
    </PhoneShell>
  )
}

function Message({ icon: Icon, title, text, bad, extra, action }) {
  return (
    <div className={`status-card ${bad ? 'status-card--bad' : ''}`}>
      <div className="status-card__icon"><Icon /></div>
      <h2>{title}</h2>
      {extra}
      <p>{text}</p>
      {action && (
        <Btn color="blue" size="sm" style={{ marginTop: 14 }} onClick={action[1]}>
          {action[0]}
        </Btn>
      )}
    </div>
  )
}

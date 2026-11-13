import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Play, Pause, Square, SkipForward, Trophy, Flag, RotateCcw, LayoutDashboard, ArrowLeft, Timer, WifiOff,
} from 'lucide-react'
import { Scene } from '../../components/Brand.jsx'
import { Btn, CornerTools, Spinner, fireConfetti } from '../../components/ui.jsx'
import { useDbValue, useTicker, serverNow, useConnected } from '../../hooks/useFirebase.js'
import { TeacherGate } from './HostHome.jsx'
import LobbyView from './LobbyView.jsx'
import QuestionView from './QuestionView.jsx'
import { LeaderboardView, FinalView } from './BoardViews.jsx'
import * as host from '../../services/hostService.js'
import { loadBank } from '../../services/bankService.js'
import { TIMER_OPTIONS, smallestTeam } from '../../lib/gameLogic.js'
import { navigate } from '../../lib/router.js'
import { play } from '../../lib/sound.js'

export default function HostRoom({ code }) {
  return <TeacherGate>{(user) => <HostRoomInner code={code} user={user} />}</TeacherGate>
}

function HostRoomInner({ code, user }) {
  const { value: room, loading, error } = useDbValue(`rooms/${code}`)
  const connected = useConnected()

  if (loading) return <Shell><Spinner label="Opening room" /></Shell>
  if (error || !room || room.meta?.hostUid !== user.uid)
    return (
      <Shell>
        <div className="panel" style={{ maxWidth: 560 }}>
          <div className="panel__body stack center">
            <h2 className="card__title">Room {code} is not available</h2>
            <p className="muted">It may have been deleted, or it belongs to another teacher account.</p>
            <Btn icon={LayoutDashboard} onClick={() => navigate('/host')}>Dashboard</Btn>
          </div>
        </div>
      </Shell>
    )
  return <Controller code={code} room={room} user={user} connected={connected} />
}

function Shell({ children, persona = 'hold' }) {
  return (
    <Scene persona={persona}>
      <CornerTools fullscreen />
      <main className="page page--withPersona" style={{ justifyContent: 'center' }}>{children}</main>
    </Scene>
  )
}

function Controller({ code, room, user, connected }) {
  const { meta, state } = room
  const phase = state.phase
  const [bank, setBank] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // host presence → students see "teacher reconnecting" if this tab closes
  useEffect(() => host.trackHostPresence(code), [code])
  useEffect(() => {
    loadBank(user.uid).then(setBank).catch(() => setBank(null))
  }, [user.uid])

  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      console.error(e)
      setError(e?.message || 'Something went wrong. Check the connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const players = useMemo(
    () =>
      Object.entries(room.players || {})
        .map(([uid, p]) => ({ uid, ...p, online: room.presence?.[uid] === true }))
        .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0)),
    [room.players, room.presence],
  )
  const teams = useMemo(() => room.teams || {}, [room.teams])
  const questions = room.hostData?.questions || []
  const question = questions[state.qIndex]
  const assigned = players.filter((p) => teams[p.uid])
  const answers = (state.qKey && room.answers?.[state.qKey]) || {}
  const answered = Object.keys(answers).filter((uid) => teams[uid]).length

  // ---- late joiners & clean-up (host is the only writer of teams) ------------
  useEffect(() => {
    if (phase === 'lobby') return
    const missing = players.filter((p) => !teams[p.uid])
    if (!missing.length) return
    const t = { ...teams }
    const add = {}
    missing.forEach((pl) => {
      t[pl.uid] = add[pl.uid] = smallestTeam(t, meta.teamCount)
    })
    host.assignTeams(code, add).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length, phase, Object.keys(teams).length])

  useEffect(() => {
    const orphans = Object.keys(teams).filter((uid) => !room.players?.[uid])
    if (orphans.length) host.assignTeams(code, Object.fromEntries(orphans.map((uid) => [uid, null]))).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(teams).length, players.length])

  // ---- timer & auto close ------------------------------------------------------
  const ticking = phase === 'question'
  const now = useTicker(ticking || phase === 'preview', 200)
  const remainingMs =
    phase === 'question'
      ? Math.max(0, state.openedAt + state.durationMs - now)
      : phase === 'paused'
        ? Math.max(0, state.totalMs - (state.elapsedMs || 0))
        : 0

  const closing = useRef(null)
  const closeNow = () => {
    const key = `${state.qKey}`
    if (closing.current === key) return
    closing.current = key
    run(() => host.closeAndScore(code, room)).finally(() => {
      if (closing.current === key) closing.current = null
    })
  }

  useEffect(() => {
    if (phase !== 'question' || !state.openedAt) return
    const allIn = meta.autoClose !== false && assigned.length > 0 && answered >= assigned.length
    if (remainingMs <= 0 || allIn) closeNow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, remainingMs <= 0, answered, assigned.length])

  // A refresh during "closed" (scoring) finishes the scoring – it is idempotent.
  useEffect(() => {
    if (phase === 'closed') closeNow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, state.qKey])

  // ---- sounds & confetti ------------------------------------------------------------
  const lastSec = useRef(null)
  useEffect(() => {
    if (phase !== 'question') return
    const s = Math.ceil(remainingMs / 1000)
    if (s <= 5 && s > 0 && s !== lastSec.current) play('tick')
    lastSec.current = s
  }, [phase, remainingMs])
  const prevPhase = useRef(phase)
  useEffect(() => {
    const prev = prevPhase.current
    prevPhase.current = phase
    if (prev === phase) return
    if (phase === 'question' && prev === 'preview') play('start')
    if (phase === 'closed') play('timeup')
    if (phase === 'reveal') play('correct')
    if (phase === 'leaderboard') fireConfetti(false)
    if (phase === 'ended') {
      play('fanfare')
      fireConfetti(true)
    }
  }, [phase])

  // ---- top players -------------------------------------------------------------------
  const topPlayers = useMemo(
    () =>
      Object.entries(room.scores || {})
        .filter(([uid]) => room.players?.[uid] && teams[uid])
        .map(([uid, s]) => ({ uid, name: room.players[uid].name, team: teams[uid], total: s.total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),
    [room.scores, room.players, teams],
  )

  // ---- actions ---------------------------------------------------------------------
  const isLast = state.qIndex >= questions.length - 1
  const actions = {
    setting: (patch) =>
      run(async () => {
        await host.updateSettings(code, patch)
        if ('rankBy' in patch && room.teamBoard) await host.recomputeBoard(code, { ...meta, ...patch })
      }),
    generate: () => run(() => host.generateTeams(code, players.map((p) => p.uid), meta.teamCount)),
    start: () =>
      run(async () => {
        if (!bank) throw new Error('Your question bank is not loaded. Open the Question Bank from the dashboard.')
        if (phase === 'lobby') await host.generateTeams(code, players.map((p) => p.uid), meta.teamCount)
        await host.startGame(code, bank, meta)
      }),
    remove: (p, block) =>
      run(async () => {
        await host.removePlayer(code, p.uid, p.nameKey, block)
        if (room.teamBoard) await host.recomputeBoard(code, meta)
      }),
    backToSettings: () => run(() => host.backToLobby(code)),
    close: () => closeNow(),
    open: () => run(() => host.openQuestion(code, meta.timerSec)),
    pause: () => run(() => host.pauseQuestion(code, state, serverNow())),
    resume: () => run(() => host.resumeQuestion(code, state)),
    next: () => run(() => host.showPreview(code, state.qIndex + 1, questions)),
    leaderboard: () => run(() => host.showLeaderboard(code)),
    back: () => run(() => host.backToReveal(code)),
    end: () => {
      if (phase !== 'reveal' && phase !== 'leaderboard' && !confirm('End the game now and show the final results?')) return
      run(() => host.endGame(code, room))
    },
    restart: () => run(() => host.restartGame(code)),
    newRoom: () =>
      run(async () => {
        const c = await host.createRoom(user.uid, meta)
        navigate(`/host/room/${c}`)
      }),
  }

  // auto-open simple questions after a short preview; reading questions wait for the teacher
  useEffect(() => {
    if (phase !== 'preview' || !question || question.passage) return
    const t = setTimeout(() => actions.open(), 5000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, state.qKey])

  // ---- render ---------------------------------------------------------------------------
  let body
  let persona = 'hold'
  if (phase === 'lobby' || phase === 'teams') {
    body = (
      <LobbyView
        code={code}
        meta={meta}
        phase={phase}
        players={players}
        teams={teams}
        bankCount={bank?.questions.length ?? 0}
        busy={busy}
        error={error}
        onSetting={actions.setting}
        onGenerate={actions.generate}
        onStart={actions.start}
        onRemove={actions.remove}
        onBackToSettings={actions.backToSettings}
      />
    )
  } else if (phase === 'leaderboard') {
    persona = 'point'
    body = <LeaderboardView board={room.teamBoard} meta={meta} topPlayers={topPlayers} state={state} />
  } else if (phase === 'ended') {
    body = <FinalView board={room.teamBoard} meta={meta} topPlayers={topPlayers} />
  } else if (question) {
    persona = 'point'
    body = (
      <QuestionView
        question={question}
        state={state}
        meta={meta}
        board={room.teamBoard}
        answered={answered}
        totalPlayers={assigned.length}
        remainingMs={remainingMs}
      />
    )
  } else {
    body = <Spinner label="Loading question" />
  }

  return (
    <Scene persona={persona}>
      <CornerTools fullscreen />
      {!connected && (
        <div className="status-banner">
          <WifiOff style={{ width: 18, verticalAlign: '-3px' }} aria-hidden="true" /> Connection lost – reconnecting… The game is saved.
        </div>
      )}
      <main className="page page--withPersona" style={{ paddingBottom: phase === 'lobby' || phase === 'teams' ? 24 : 90 }}>
        {body}
        {error && phase !== 'lobby' && phase !== 'teams' && (
          <div className="notice notice--error" style={{ marginTop: 12 }}>{error}</div>
        )}
      </main>
      {phase !== 'lobby' && phase !== 'teams' && (
        <Dock
          phase={phase}
          busy={busy}
          isLast={isLast}
          meta={meta}
          actions={actions}
          hasPassage={Boolean(question?.passage)}
        />
      )}
    </Scene>
  )
}

function Dock({ phase, busy, isLast, meta, actions, hasPassage }) {
  return (
    <nav className="dock" aria-label="Teacher controls">
      {phase === 'preview' && (
        <>
          <label className="pill" style={{ gap: 6 }}>
            <Timer aria-hidden="true" />
            <select
              value={meta.timerSec}
              onChange={(e) => actions.setting({ timerSec: Number(e.target.value) })}
              style={{ background: 'transparent', color: '#fff', border: 0, fontWeight: 800 }}
              aria-label="Time limit for this question"
            >
              {TIMER_OPTIONS.map((s) => (
                <option key={s} value={s} style={{ color: '#000' }}>{s} s</option>
              ))}
            </select>
          </label>
          <Btn size="sm" color="green" icon={Play} onClick={actions.open} disabled={busy}>
            {hasPassage ? 'Start answering' : 'Start now'}
          </Btn>
        </>
      )}
      {phase === 'question' && (
        <Btn size="sm" color="gold" icon={Pause} onClick={actions.pause} disabled={busy}>Pause</Btn>
      )}
      {phase === 'paused' && (
        <Btn size="sm" color="green" icon={Play} onClick={actions.resume} disabled={busy}>Resume</Btn>
      )}
      {(phase === 'question' || phase === 'paused') && (
        <Btn size="sm" color="blue" icon={Square} onClick={actions.close} disabled={busy}>Close & reveal</Btn>
      )}
      {phase === 'closed' && <span className="pill">Scoring answers…</span>}
      {phase === 'reveal' && (
        <>
          <Btn size="sm" color="gold" icon={Trophy} onClick={actions.leaderboard} disabled={busy}>Leaderboard</Btn>
          {isLast ? (
            <Btn size="sm" color="green" icon={Flag} onClick={actions.end} disabled={busy}>Final results</Btn>
          ) : (
            <Btn size="sm" color="green" icon={SkipForward} onClick={actions.next} disabled={busy}>Next question</Btn>
          )}
        </>
      )}
      {phase === 'leaderboard' && (
        <>
          <Btn size="sm" color="dark" icon={ArrowLeft} onClick={actions.back} disabled={busy}>Back</Btn>
          {isLast ? (
            <Btn size="sm" color="green" icon={Flag} onClick={actions.end} disabled={busy}>Final results</Btn>
          ) : (
            <Btn size="sm" color="green" icon={SkipForward} onClick={actions.next} disabled={busy}>Next question</Btn>
          )}
        </>
      )}
      {phase === 'ended' ? (
        <>
          <Btn size="sm" color="gold" icon={RotateCcw} onClick={actions.restart} disabled={busy}>Play again (same teams)</Btn>
          <Btn size="sm" icon={Play} onClick={actions.newRoom} disabled={busy}>New room</Btn>
          <Btn size="sm" color="dark" icon={LayoutDashboard} onClick={() => navigate('/host')}>Dashboard</Btn>
        </>
      ) : (
        <>
          <span className="dock__sep" />
          <Btn size="sm" color="red" icon={Flag} onClick={actions.end} disabled={busy}>End game</Btn>
        </>
      )}
    </nav>
  )
}

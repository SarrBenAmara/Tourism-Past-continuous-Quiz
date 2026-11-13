import { useState } from 'react'
import { LogIn, ArrowLeft, RotateCcw } from 'lucide-react'
import { Scene, Logo } from '../../components/Brand.jsx'
import { Btn, CornerTools } from '../../components/ui.jsx'
import { joinRoom, savedSession, JoinError } from '../../services/playerService.js'
import { navigate } from '../../lib/router.js'
import { play } from '../../lib/sound.js'
import { cleanName } from '../../lib/gameLogic.js'

export default function JoinScreen({ query }) {
  const saved = savedSession()
  const [code, setCode] = useState((query.code || '').replace(/\D/g, '').slice(0, 6))
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const join = async (c, n) => {
    setBusy(true)
    setError(null)
    try {
      await joinRoom(c, n)
      play('join')
      navigate('/play', { replace: true })
    } catch (e) {
      console.error(e)
      setError(
        e instanceof JoinError
          ? e.message
          : e?.code === 'PERMISSION_DENIED' || /permission/i.test(e?.message || '')
            ? 'You cannot join this room right now. Ask your teacher.'
            : 'Could not connect. Check your internet and try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    join(code, name)
  }

  const preview = cleanName(name)

  return (
    <Scene mobile>
      <CornerTools home />
      <main className="phone" style={{ justifyContent: 'flex-start', paddingTop: 50 }}>
        <Logo variant="phone" />
        <form className="status-card stack" style={{ gap: 14, textAlign: 'left' }} onSubmit={submit}>
          <h2 className="center" style={{ fontSize: 'clamp(22px, 6.5vw, 30px)' }}>Join the Game!</h2>
          <label className="field">
            Room code
            <input
              className="input input--code"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              aria-describedby="code-help"
            />
            <span id="code-help" className="muted" style={{ fontWeight: 500, fontSize: 14 }}>The 6-digit code on the classroom screen</span>
          </label>
          <label className="field">
            Your name
            <input
              className="input"
              autoComplete="given-name"
              maxLength={24}
              placeholder="e.g. Yasmine B"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {name && preview !== name.trim() && (
              <span className="muted" style={{ fontWeight: 500, fontSize: 14 }}>
                You will appear as: <b>{preview || '—'}</b>
              </span>
            )}
          </label>
          {error && <div className="notice notice--error" role="alert">{error}</div>}
          <Btn type="submit" color="blue" size="lg" wide icon={LogIn} disabled={busy || code.length !== 6 || preview.length < 2}>
            {busy ? 'Joining…' : 'Join Game'}
          </Btn>
          {saved?.code && (
            <Btn color="dark" size="sm" wide icon={RotateCcw} disabled={busy} onClick={() => join(saved.code, saved.name)}>
              Rejoin room {saved.code} as {saved.name}
            </Btn>
          )}
        </form>
        <Btn color="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/')}>Main menu</Btn>
      </main>
    </Scene>
  )
}

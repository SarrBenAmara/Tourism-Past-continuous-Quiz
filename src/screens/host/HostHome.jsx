import { useEffect, useState } from 'react'
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth'
import { LogIn, LogOut, Gamepad2, ListChecks, Play, Trash2, RotateCcw, ShieldAlert, Upload, KeyRound } from 'lucide-react'
import { auth } from '../../firebase/config.js'
import { Scene, Logo } from '../../components/Brand.jsx'
import { Btn, CornerTools, Spinner } from '../../components/ui.jsx'
import { useAuthUser } from '../../hooks/useFirebase.js'
import { isTeacher, createRoom, listHostRooms, deleteRoom } from '../../services/hostService.js'
import { loadBank } from '../../services/bankService.js'
import { navigate } from '../../lib/router.js'

/** Resolves the signed-in teacher. Returns {status: 'loading'|'signedOut'|'notTeacher'|'teacher', user}. */
export function useTeacher() {
  const user = useAuthUser()
  const [check, setCheck] = useState({ uid: null, ok: null })
  useEffect(() => {
    if (!user || user.isAnonymous) return
    let live = true
    isTeacher(user.uid)
      .then((ok) => live && setCheck({ uid: user.uid, ok }))
      .catch(() => live && setCheck({ uid: user.uid, ok: false }))
    return () => {
      live = false
    }
  }, [user])
  if (user === undefined) return { status: 'loading' }
  if (!user || user.isAnonymous) return { status: 'signedOut' }
  if (check.uid !== user.uid) return { status: 'loading' }
  return { status: check.ok ? 'teacher' : 'notTeacher', user }
}

export function TeacherGate({ children }) {
  const t = useTeacher()
  if (t.status === 'loading')
    return (
      <Scene persona="hold">
        <main className="page page--withPersona" style={{ justifyContent: 'center' }}>
          <Spinner label="Checking teacher account" />
        </main>
      </Scene>
    )
  if (t.status === 'signedOut') return <TeacherLogin />
  if (t.status === 'notTeacher') return <NotTeacher user={t.user} />
  return children(t.user)
}

function TeacherLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (auth.currentUser?.isAnonymous) await signOut(auth)
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      const code = err?.code || ''
      setMsg({
        type: 'error',
        text: code.includes('invalid') || code.includes('wrong') || code.includes('user-not-found')
          ? 'Email or password is not correct.'
          : code.includes('too-many') ? 'Too many attempts. Wait a minute and try again.' : 'Could not sign in. Check your internet connection.',
      })
    } finally {
      setBusy(false)
    }
  }
  const reset = async () => {
    if (!email.trim()) return setMsg({ type: 'error', text: 'Type your email first, then tap “Forgot password”.' })
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setMsg({ type: 'ok', text: 'Password reset email sent.' })
    } catch {
      setMsg({ type: 'error', text: 'Could not send the reset email.' })
    }
  }
  return (
    <Scene persona="hold">
      <CornerTools home />
      <main className="page page--withPersona" style={{ justifyContent: 'center', gap: 18 }}>
        <Logo variant="bar" />
        <form className="panel" style={{ maxWidth: 520 }} onSubmit={submit}>
          <div className="panel__head">
            <KeyRound aria-hidden="true" /> Teacher Sign In
          </div>
          <div className="panel__body stack">
            <label className="field">
              Email
              <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="field">
              Password
              <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {msg && <div className={`notice notice--${msg.type}`}>{msg.text}</div>}
            <Btn type="submit" icon={LogIn} wide disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Btn>
            <button type="button" className="muted" style={{ textDecoration: 'underline' }} onClick={reset}>
              Forgot password
            </button>
          </div>
        </form>
      </main>
    </Scene>
  )
}

function NotTeacher({ user }) {
  return (
    <Scene persona="hold">
      <CornerTools home />
      <main className="page page--withPersona" style={{ justifyContent: 'center' }}>
        <div className="panel" style={{ maxWidth: 640 }}>
          <div className="panel__head">
            <ShieldAlert aria-hidden="true" /> Not a teacher account yet
          </div>
          <div className="panel__body stack">
            <p>
              You are signed in as <b>{user.email}</b>, but this account has not been approved as a teacher.
            </p>
            <p>In the Firebase console, open Realtime Database → Data and add:</p>
            <pre className="card" style={{ overflow: 'auto', margin: 0 }}>
              teachers / {user.uid} : true
            </pre>
            <p className="muted">Then reload this page. (See SETUP.md, step 6.)</p>
            <div className="row">
              <Btn color="dark" icon={LogOut} onClick={() => signOut(auth)}>
                Sign out
              </Btn>
              <Btn color="blue" icon={RotateCcw} onClick={() => window.location.reload()}>
                Reload
              </Btn>
            </div>
          </div>
        </div>
      </main>
    </Scene>
  )
}

export default function HostHome() {
  return <TeacherGate>{(user) => <Dashboard user={user} />}</TeacherGate>
}

function Dashboard({ user }) {
  const [bank, setBank] = useState(undefined)
  const [rooms, setRooms] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const refresh = () => {
    listHostRooms(user.uid).then(setRooms).catch(() => setRooms([]))
  }
  useEffect(() => {
    loadBank(user.uid).then(setBank).catch(() => setBank(null))
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid])

  const create = async () => {
    setBusy(true)
    setErr(null)
    try {
      const code = await createRoom(user.uid)
      navigate(`/host/room/${code}`)
    } catch (e) {
      setErr(e.message || 'Could not create the room.')
      setBusy(false)
    }
  }

  const active = (rooms || []).filter((r) => !r.expired && r.state?.phase !== 'ended')
  const old = (rooms || []).filter((r) => r.expired || r.state?.phase === 'ended')

  return (
    <Scene persona="hold">
      <CornerTools home />
      <main className="page page--withPersona" style={{ gap: 16 }}>
        <Logo variant="bar" />
        <div className="panel" style={{ maxWidth: 980 }}>
          <div className="panel__head">
            <Gamepad2 aria-hidden="true" /> Teacher Dashboard
          </div>
          <div className="panel__body stack" style={{ gap: 16 }}>
            {bank === undefined ? (
              <p className="center muted">Loading your question bank…</p>
            ) : !bank ? (
              <div className="notice">
                <b>Step 1:</b> import your question bank before hosting. Open <b>Question Bank</b> and choose the file{' '}
                <code>tourism-unit3.json</code> from the <code>private-question-bank</code> folder.
              </div>
            ) : (
              <div className="notice notice--ok">
                Question bank ready: <b>{bank.questions.length} questions</b>, {Object.keys(bank.passages).length} reading passages.
              </div>
            )}
            {err && <div className="notice notice--error">{err}</div>}
            <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
              <Btn size="lg" icon={Play} onClick={create} disabled={busy || !bank}>
                {busy ? 'Creating…' : 'Create a Game Room'}
              </Btn>
              <Btn size="lg" color="gold" icon={bank ? ListChecks : Upload} onClick={() => navigate('/host/bank')}>
                Question Bank
              </Btn>
            </div>

            {active.length > 0 && (
              <div className="card">
                <h2 className="card__title">Resume a room</h2>
                <div className="stack" style={{ gap: 8 }}>
                  {active.map((r) => (
                    <RoomRow key={r.code} r={r} uid={user.uid} onChange={refresh} />
                  ))}
                </div>
              </div>
            )}
            {old.length > 0 && (
              <details className="card">
                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Finished or expired rooms ({old.length})</summary>
                <div className="stack" style={{ gap: 8, marginTop: 10 }}>
                  {old.map((r) => (
                    <RoomRow key={r.code} r={r} uid={user.uid} onChange={refresh} />
                  ))}
                </div>
              </details>
            )}
            {rooms === null && <p className="center muted">Loading rooms…</p>}

            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">Signed in as {user.email}</span>
              <Btn color="dark" size="sm" icon={LogOut} onClick={() => signOut(auth).then(() => navigate('/'))}>
                Sign out
              </Btn>
            </div>
          </div>
        </div>
      </main>
    </Scene>
  )
}

function RoomRow({ r, uid, onChange }) {
  const [busy, setBusy] = useState(false)
  const when = new Date(r.meta.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <div className="row" style={{ justifyContent: 'space-between', padding: '6px 4px', borderBottom: '1px solid #eee8ff' }}>
      <div>
        <b style={{ fontSize: 22, letterSpacing: '0.1em' }}>{r.code}</b>{' '}
        <span className="muted">
          · {when} · {r.expired ? 'expired' : r.state?.phase}
          {r.state?.total ? ` · question ${r.state.qNumber}/${r.state.total}` : ''}
        </span>
      </div>
      <div className="row">
        {!r.expired && (
          <Btn size="sm" color="blue" icon={Play} onClick={() => navigate(`/host/room/${r.code}`)}>
            Open
          </Btn>
        )}
        <Btn
          size="sm"
          color="red"
          icon={Trash2}
          disabled={busy}
          onClick={async () => {
            if (!confirm(`Delete room ${r.code} and all its answers?`)) return
            setBusy(true)
            await deleteRoom(uid, r.code).catch(() => {})
            onChange()
          }}
        >
          Delete
        </Btn>
      </div>
    </div>
  )
}

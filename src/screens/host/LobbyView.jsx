import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import {
  Copy, Check, Gamepad2, Shuffle, Play, Users, Laptop, Smartphone, X, QrCode, Settings2, ArrowLeft, Timer,
} from 'lucide-react'
import { Logo } from '../../components/Brand.jsx'
import { Btn, TeamIcon, teamVars, Modal } from '../../components/ui.jsx'
import { TEAMS, TIMER_OPTIONS, CATEGORIES, teamIdsFor } from '../../lib/gameLogic.js'
import { joinUrl } from '../../lib/router.js'

/**
 * Teacher room setup + team generator (Screens 2 and 4). Pure presentational: all data and actions come in as props.
 */
export default function LobbyView({
  code, meta, phase, players, teams, bankCount, busy, error,
  onSetting, onGenerate, onStart, onRemove, onBackToSettings,
}) {
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState(null)
  const [showQr, setShowQr] = useState(false)
  const [removing, setRemoving] = useState(null)

  useEffect(() => {
    QRCode.toDataURL(joinUrl(code), { margin: 1, width: 360, color: { dark: '#250a6b', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(null))
  }, [code])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  const ids = teamIdsFor(meta.teamCount)
  const online = players.filter((p) => p.online).length
  const inTeams = phase === 'teams'

  return (
    <>
      <div className="center">
        <Logo variant="bar" />
        <div>
          <span className="ribbon" style={{ fontSize: 'clamp(15px, 1.6vw, 26px)', marginTop: 4 }}>Live Classroom Game</span>
        </div>
      </div>

      <section className="panel" style={{ marginTop: 12, maxWidth: 1180 }}>
        <div className="panel__head">
          <Gamepad2 aria-hidden="true" /> {inTeams ? 'Your Teams Are Ready!' : 'Create a Game Room'}
        </div>
        <div className="panel__body">
          {!inTeams ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: 14 }}>
              <div className="stack" style={{ gap: 10 }}>
                <div className="card row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                  <h3 className="card__title" style={{ margin: 0, whiteSpace: 'nowrap' }}>Room Code</h3>
                  <div className="room-code">
                    <span className="room-code__digits">{code}</span>
                    <Btn color="dark" className="gbtn--icon" onClick={copy} aria-label="Copy room code" title="Copy room code">
                      {copied ? <Check /> : <Copy />}
                    </Btn>
                  </div>
                  <button className="opt" onClick={() => setShowQr(true)} disabled={!qr} title="Show a QR code students can scan">
                    <QrCode style={{ width: 22, verticalAlign: '-5px' }} aria-hidden="true" /> QR
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 10 }}>
                  <div className="card">
                    <h3 className="card__title">
                      <Timer style={{ width: 20, verticalAlign: '-3px' }} aria-hidden="true" /> Question Timer
                    </h3>
                    <div className="opt-row opt-row--tight">
                      {TIMER_OPTIONS.map((s) => (
                        <button key={s} className={`opt ${meta.timerSec === s ? 'is-on' : ''}`} onClick={() => onSetting({ timerSec: s })}>
                          {s}s
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <h3 className="card__title">Number of Teams</h3>
                    <div className="opt-row opt-row--tight">
                      {[2, 3, 4].map((n) => (
                        <button key={n} className={`opt ${meta.teamCount === n ? 'is-on' : ''}`} onClick={() => onSetting({ teamCount: n })} aria-label={`${n} teams`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="row" style={{ justifyContent: 'center', marginBottom: 10, gap: 10 }}>
                    <b style={{ fontFamily: 'var(--display)', color: 'var(--deep)' }}>Questions:</b>
                    {Object.entries(CATEGORIES).map(([k, label]) => {
                      const on = (meta.categories || []).includes(k)
                      return (
                        <button
                          key={k}
                          className={`opt ${on ? 'is-on' : ''}`}
                          onClick={() => {
                            const next = on ? meta.categories.filter((c) => c !== k) : [...(meta.categories || []), k]
                            if (next.length) onSetting({ categories: next })
                          }}
                        >
                          {label.split(' ')[0]}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px' }}>
                    <Switch label="Speed bonus (up to +50)" checked={meta.speedBonus !== false} onChange={(v) => onSetting({ speedBonus: v })} />
                    <Switch label="Rank by average per member" checked={meta.rankBy === 'average'} onChange={(v) => onSetting({ rankBy: v ? 'average' : 'total' })} />
                    <Switch label="Allow late joiners" checked={meta.lateJoin !== false} onChange={(v) => onSetting({ lateJoin: v })} />
                    <Switch label="Close when all have answered" checked={meta.autoClose !== false} onChange={(v) => onSetting({ autoClose: v })} />
                    <Switch label="Shuffle question order" checked={Boolean(meta.shuffleOrder)} onChange={(v) => onSetting({ shuffleOrder: v })} />
                    <span className="muted" style={{ alignSelf: 'center' }}>{bankCount} questions in your bank</span>
                  </div>
                </div>
              </div>

              <div className="card stack" style={{ gap: 10, minHeight: 0 }}>
                <h3 className="card__title" style={{ margin: 0 }}>
                  <Users style={{ width: 22, verticalAlign: '-4px' }} aria-hidden="true" /> Players joined:{' '}
                  <span style={{ color: 'var(--purple)', fontSize: '1.3em' }}>{players.length}</span>
                  {players.length > 0 && <span className="muted" style={{ fontSize: '0.75em' }}> ({online} online)</span>}
                </h3>
                <div className="player-grid" style={{ maxHeight: '44vh', overflow: 'auto' }} aria-live="polite">
                  {players.length === 0 && <p className="muted center" style={{ width: '100%' }}>Waiting for students to join<span className="dots" /></p>}
                  {players.map((p) => (
                    <span key={p.uid} className={`player-tag ${p.online ? '' : 'is-off'}`} title={p.online ? 'Online' : 'Disconnected'}>
                      {p.name}
                      <button className="player-tag__x" onClick={() => setRemoving(p)} aria-label={`Remove ${p.name}`}>
                        <X />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="team-cols" style={{ '--n': ids.length }}>
              {ids.map((id) => {
                const members = players.filter((p) => teams?.[p.uid] === id)
                return (
                  <div key={id} className="team-col" style={teamVars(id)}>
                    <div className="team-col__head">
                      <TeamIcon team={id} /> {ids.length > 3 ? TEAMS[id].short : TEAMS[id].name}
                      <span className="team-col__count">{members.length}</span>
                    </div>
                    <ul>
                      {members.map((p) => (
                        <li key={p.uid} style={{ opacity: p.online ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="grow">{p.name}</span>
                          <button className="player-tag__x" onClick={() => setRemoving(p)} aria-label={`Remove ${p.name}`}>
                            <X />
                          </button>
                        </li>
                      ))}
                      {!members.length && <li className="muted">No players yet</li>}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}

          {error && <div className="notice notice--error" style={{ marginTop: 12 }}>{error}</div>}

          <div className="row" style={{ justifyContent: 'center', marginTop: 12, gap: 16 }}>
            {inTeams ? (
              <>
                <Btn color="dark" icon={Settings2} onClick={onBackToSettings} disabled={busy}>
                  Settings
                </Btn>
                <Btn color="blue" icon={Shuffle} onClick={onGenerate} disabled={busy || players.length === 0}>
                  Reshuffle Teams
                </Btn>
              </>
            ) : (
              <Btn color="blue" icon={Shuffle} onClick={onGenerate} disabled={busy || players.length === 0}>
                Generate Teams
              </Btn>
            )}
            <Btn size="lg" icon={Play} onClick={onStart} disabled={busy || players.length === 0}>
              Start Game
            </Btn>
          </div>
        </div>
      </section>

      {!inTeams && players.length === 0 && (
        <div className="steps" style={{ maxWidth: 1180 }}>
          <div className="step">
            <Laptop className="step__icon" aria-hidden="true" />
            <span className="step__num">1</span>
            <span>Project this screen</span>
          </div>
          <div className="step">
            <Smartphone className="step__icon" aria-hidden="true" />
            <span className="step__num">2</span>
            <span>
              Students join with code <b>{code}</b> on their phones
            </span>
          </div>
          <div className="step">
            <Users className="step__icon" aria-hidden="true" />
            <span className="step__num">3</span>
            <span>Teams are created at random and the quiz begins!</span>
          </div>
        </div>
      )}

      {showQr && qr && (
        <Modal title={`Scan to join · ${code}`} icon={QrCode} onClose={() => setShowQr(false)}>
          <div className="stack" style={{ alignItems: 'center' }}>
            <img src={qr} alt={`QR code to join room ${code}`} style={{ width: 'min(60vh, 420px)', borderRadius: 16 }} />
            <p className="center" style={{ fontSize: 20, fontWeight: 600, wordBreak: 'break-all' }}>{joinUrl(code)}</p>
            <Btn icon={ArrowLeft} onClick={() => setShowQr(false)}>Close</Btn>
          </div>
        </Modal>
      )}

      {removing && (
        <Modal title={`Remove ${removing.name}?`} icon={X} onClose={() => setRemoving(null)}>
          <div className="stack">
            <p>
              <b>Remove</b> takes the student out of the room – they can join again with a different name. <b>Block</b> also stops this device
              from rejoining the room.
            </p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Btn color="dark" onClick={() => setRemoving(null)}>Cancel</Btn>
              <Btn color="gold" onClick={() => { onRemove(removing, false); setRemoving(null) }}>Remove</Btn>
              <Btn color="red" onClick={() => { onRemove(removing, true); setRemoving(null) }}>Block</Btn>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

function Switch({ label, checked, onChange }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

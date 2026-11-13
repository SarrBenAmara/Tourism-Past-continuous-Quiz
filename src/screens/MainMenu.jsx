import { Play, Monitor, Users, Smartphone, BookOpen, CircleHelp } from 'lucide-react'
import { Scene, Logo, useIsPhone } from '../components/Brand.jsx'
import { CornerTools } from '../components/ui.jsx'
import { navigate } from '../lib/router.js'
import { play } from '../lib/sound.js'

export default function MainMenu() {
  const phone = useIsPhone()
  const go = (to) => {
    play('tap')
    navigate(to)
  }
  return (
    <Scene persona="hold" mobile={phone}>
      <CornerTools />
      <main className={phone ? 'phone' : 'page page--withPersona'} style={{ justifyContent: 'center', gap: phone ? 18 : 'clamp(12px, 2.4vh, 26px)' }}>
        <div className="center" style={{ marginTop: phone ? 30 : 0 }}>
          <Logo variant={phone ? 'phone' : 'hero'} />
          <div style={{ marginTop: phone ? 14 : 4 }}>
            <span className="sparks">
              <span className="ribbon">The Ultimate English Adventure</span>
            </span>
          </div>
        </div>
        <nav className="stack" style={{ alignItems: 'center', gap: phone ? 18 : 'clamp(14px, 2.6vh, 28px)', marginTop: phone ? 10 : 12, width: '100%' }} aria-label="Main menu">
          {!phone && (
            <button className="gbtn gbtn--xl menu-btn" onClick={() => go('/host')}>
              <Play fill="currentColor" aria-hidden="true" />
              <span className="menu-btn__label">Host Game</span>
              <Monitor aria-hidden="true" />
            </button>
          )}
          <button className="gbtn gbtn--blue gbtn--xl menu-btn" onClick={() => go('/join')}>
            <Users aria-hidden="true" />
            <span className="menu-btn__label">Join Game</span>
            <Smartphone aria-hidden="true" />
          </button>
          <button className="gbtn gbtn--gold gbtn--xl menu-btn" onClick={() => go('/how')}>
            <BookOpen aria-hidden="true" />
            <span className="menu-btn__label">How to Play</span>
            <CircleHelp aria-hidden="true" />
          </button>
          {phone && (
            <button className="gbtn gbtn--ghost gbtn--sm" onClick={() => go('/host')} style={{ marginTop: 6 }}>
              <Monitor aria-hidden="true" /> Teacher: host a game
            </button>
          )}
        </nav>
      </main>
    </Scene>
  )
}

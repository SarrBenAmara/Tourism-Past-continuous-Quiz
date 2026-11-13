import { Settings2, ArrowLeft } from 'lucide-react'
import { Scene, Logo, useIsPhone } from '../components/Brand.jsx'
import { Btn } from '../components/ui.jsx'
import { navigate } from '../lib/router.js'

export default function NotConfigured() {
  const phone = useIsPhone()
  return (
    <Scene persona="hold" mobile={phone}>
      <main className={phone ? 'phone' : 'page page--withPersona'} style={{ justifyContent: 'center', gap: 16 }}>
        <Logo variant={phone ? 'phone' : 'bar'} />
        <div className="panel" style={{ maxWidth: 640 }}>
          <div className="panel__head"><Settings2 aria-hidden="true" /> Firebase is not connected yet</div>
          <div className="panel__body stack">
            <p>
              This copy of the game was built without Firebase settings, so multiplayer is switched off. Follow <b>SETUP.md</b>: create a
              free Firebase project, put its web-app settings in <code>.env.local</code> (or in the GitHub repository secrets), and build again.
            </p>
            <Btn icon={ArrowLeft} onClick={() => navigate('/')}>Main menu</Btn>
          </div>
        </div>
      </main>
    </Scene>
  )
}

import { lazy, Suspense } from 'react'
import { useRoute } from './lib/router.js'
import { firebaseConfigured } from './firebase/config.js'
import MainMenu from './screens/MainMenu.jsx'
import HowToPlay from './screens/HowToPlay.jsx'
import NotConfigured from './screens/NotConfigured.jsx'
import { Scene } from './components/Brand.jsx'
import { Spinner } from './components/ui.jsx'

// Teacher screens are loaded on demand so students' phones download less.
const HostHome = lazy(() => import('./screens/host/HostHome.jsx'))
const HostRoom = lazy(() => import('./screens/host/HostRoom.jsx'))
const QuestionBank = lazy(() => import('./screens/host/QuestionBank.jsx'))
const JoinScreen = lazy(() => import('./screens/player/JoinScreen.jsx'))
const PlayerGame = lazy(() => import('./screens/player/PlayerGame.jsx'))
// Design preview gallery – only exists in development builds (npm run dev).
const Preview = import.meta.env.DEV ? lazy(() => import('./dev/PreviewGallery.jsx')) : null

export default function App() {
  const { parts, query } = useRoute()
  const [a, b, c] = parts

  let screen
  if (a === '__preview' && Preview) screen = <Preview name={b} />
  else if (!a) screen = <MainMenu />
  else if (a === 'how') screen = <HowToPlay />
  else if (!firebaseConfigured) screen = <NotConfigured />
  else if (a === 'join') screen = <JoinScreen query={query} />
  else if (a === 'play') screen = <PlayerGame />
  else if (a === 'host' && b === 'bank') screen = <QuestionBank />
  else if (a === 'host' && b === 'room' && /^[0-9]{6}$/.test(c || '')) screen = <HostRoom code={c} />
  else if (a === 'host') screen = <HostHome />
  else screen = <MainMenu />

  return (
    <Suspense
      fallback={
        <Scene mobile>
          <main className="phone" style={{ justifyContent: 'center' }}>
            <Spinner label="Loading" />
          </main>
        </Scene>
      }
    >
      {screen}
    </Suspense>
  )
}

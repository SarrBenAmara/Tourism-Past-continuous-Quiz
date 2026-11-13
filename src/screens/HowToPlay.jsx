import { ArrowLeft, Laptop, Smartphone, Users, Eye, Hand, Trophy, BookOpen } from 'lucide-react'
import { Scene, Logo, useIsPhone } from '../components/Brand.jsx'
import { Btn, CornerTools } from '../components/ui.jsx'
import { navigate } from '../lib/router.js'

const STEPS = [
  [Laptop, 'Mrs Sarra opens the game on the classroom screen and shows a six-digit room code.'],
  [Smartphone, 'Open this website on your phone, tap Join Game, type the code and your name.'],
  [Users, 'You are put into a team at random: Explorers, Adventurers, Travellers or Discoverers.'],
  [Eye, 'Read each question and its answers on the big screen – your phone only shows A, B, C and D.'],
  [Hand, 'Tap your answer before the timer ends. You get one try, so think first! Faster correct answers earn a bonus.'],
  [Trophy, 'Every correct answer adds points to your team. The team with the most points wins the trophy!'],
]

export default function HowToPlay() {
  const phone = useIsPhone()
  return (
    <Scene persona="hold" mobile={phone}>
      <CornerTools home />
      <main className={phone ? 'phone' : 'page page--withPersona'} style={{ paddingBottom: phone ? undefined : 30 }}>
        <Logo variant={phone ? 'phone' : 'bar'} />
        <div className="panel" style={{ maxWidth: 900, marginTop: 14 }}>
          <div className="panel__head">
            <BookOpen aria-hidden="true" /> How to Play
          </div>
          <div className="panel__body">
            <ol className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, gap: 10 }}>
              {STEPS.map(([Icon, text], i) => (
                <li key={i} className="step" style={{ boxShadow: '0 0 0 2px #e2d8ff' }}>
                  <span className="step__num">{i + 1}</span>
                  <Icon className="step__icon" style={{ width: '1.8em', height: '1.8em' }} aria-hidden="true" />
                  <span style={{ fontWeight: 600 }}>{text}</span>
                </li>
              ))}
            </ol>
            <p className="notice notice--info" style={{ marginTop: 14 }}>
              Questions come from <b>Unit 3: Tourism</b> – reading passages, grammar (past continuous, past continuous passive,
              active and passive voice) and tourism vocabulary.
            </p>
            <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
              <Btn icon={ArrowLeft} color="dark" onClick={() => navigate('/')}>
                Back
              </Btn>
              <Btn color="blue" icon={Smartphone} onClick={() => navigate('/join')}>
                Join Game
              </Btn>
            </div>
          </div>
        </div>
      </main>
    </Scene>
  )
}

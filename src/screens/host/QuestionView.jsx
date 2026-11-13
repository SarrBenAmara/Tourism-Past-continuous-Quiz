import { BookOpen, Lightbulb, Hourglass } from 'lucide-react'
import { Logo } from '../../components/Brand.jsx'
import { AnswerTile, TeamChip, TimerPill } from '../../components/ui.jsx'
import { CATEGORIES, teamIdsFor } from '../../lib/gameLogic.js'
import postcard from '../../assets/img/postcard-santorini.webp'

/** Projector question / reveal screen (Screens 5 and 7). Presentational only. */
export default function QuestionView({ question, state, meta, board, answered, totalPlayers, remainingMs }) {
  const phase = state.phase
  const revealed = phase === 'reveal'
  const counts = state.reveal?.counts
  const correct = state.reveal?.correct
  const ids = teamIdsFor(meta.teamCount)
  const long = question.text.length > 90
  const avg = meta.rankBy === 'average'

  let timer
  if (phase === 'preview') timer = <span className="pill pill--gold"><Hourglass aria-hidden="true" /> Get ready</span>
  else if (phase === 'question' || phase === 'paused')
    timer = <TimerPill remainingMs={remainingMs} totalMs={state.totalMs} paused={phase === 'paused'} />
  else timer = <span className="pill pill--gold"><Hourglass aria-hidden="true" /> Time's up</span>

  const qcard = (
    <div className="qcard">
      {!question.passage && <img className="qcard__img" src={question.image || postcard} alt="" />}
      <p className={`qcard__text ${long || question.passage ? 'qcard__text--long' : ''}`}>{question.text}</p>
    </div>
  )

  return (
    <>
      <Logo variant="bar" />
      <div className="team-row" style={{ '--n': ids.length, marginTop: 12, maxWidth: 1180 }}>
        {ids.map((id) => (
          <TeamChip key={id} id={id} points={avg ? board?.[id]?.avg ?? 0 : board?.[id]?.total ?? 0} sub={avg ? 'avg' : null} />
        ))}
      </div>

      <section className={`panel qpanel ${question.passage ? 'qpanel--reading' : ''}`} style={{ marginTop: 12, maxWidth: 1180 }}>
        <div className="qpanel__bar">
          <span className="pill">
            <BookOpen aria-hidden="true" /> Question {state.qNumber} / {state.total}
          </span>
          <span className="pill pill--violet">{CATEGORIES[question.category]}</span>
          {timer}
        </div>
        {(phase === 'question' || phase === 'paused') && (
          <div className="timebar" style={{ borderRadius: 0, background: 'rgba(120,70,220,0.25)' }}>
            <i style={{ transform: `scaleX(${state.totalMs ? Math.max(0, remainingMs / state.totalMs) : 1})` }} />
          </div>
        )}
        <div className="qpanel__body">
          {question.passage ? (
            <div className="qsplit">
              <article className="passage" aria-label="Reading passage">
                {question.passage.title && <h3>{question.passage.title}</h3>}
                {question.passage.text.split(/\n\s*\n/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </article>
              {qcard}
            </div>
          ) : (
            qcard
          )}
          <div className="answers">
            {question.options.map((o, i) => (
              <AnswerTile
                key={i}
                index={i}
                text={o}
                count={revealed && counts ? counts[i] || 0 : undefined}
                state={revealed ? (i === correct ? 'correct' : 'dim') : undefined}
              />
            ))}
          </div>
          {revealed && question.explanation && (
            <div className="explain">
              <Lightbulb aria-hidden="true" />
              <span>{question.explanation}</span>
            </div>
          )}
        </div>
        <div className="qpanel__foot">
          {phase === 'preview' ? (
            <span className="counter">Read the question – answering opens soon!</span>
          ) : (
            <span className="counter" aria-live="polite">
              <b>{answered}</b>&nbsp;/ {totalPlayers} students have answered{phase === 'closed' ? ' · scoring…' : '.'}
            </span>
          )}
        </div>
      </section>

    </>
  )
}

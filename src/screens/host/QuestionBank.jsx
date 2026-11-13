import { useEffect, useRef, useState } from 'react'
import { ListChecks, Upload, Download, Plus, Pencil, Trash2, Save, ArrowLeft, BookOpen, Check } from 'lucide-react'
import { Scene, Logo } from '../../components/Brand.jsx'
import { Btn, CornerTools, Modal, Spinner } from '../../components/ui.jsx'
import { TeacherGate } from './HostHome.jsx'
import { loadBank, saveBank, downloadBank, readBankFile } from '../../services/bankService.js'
import { CATEGORIES, ANSWER_LETTERS, validateBank } from '../../lib/gameLogic.js'
import { navigate } from '../../lib/router.js'

export default function QuestionBank() {
  return <TeacherGate>{(user) => <Editor user={user} />}</TeacherGate>
}

const EMPTY_Q = { category: 'grammar', text: '', options: ['', '', '', ''], answer: 0, explanation: '' }

function Editor({ user }) {
  const [bank, setBank] = useState(undefined)
  const [dirty, setDirty] = useState(false)
  const [msg, setMsg] = useState(null)
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null) // {index|-1, q}
  const [editingPassage, setEditingPassage] = useState(null) // {id|null, title, text}
  const [busy, setBusy] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    loadBank(user.uid)
      .then((b) => setBank(b || { title: 'Tourism Quiz Challenge', passages: {}, questions: [] }))
      .catch((e) => setMsg({ type: 'error', text: e.message }))
  }, [user.uid])

  useEffect(() => {
    if (!dirty) return
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const change = (next) => {
    setBank(next)
    setDirty(true)
    setMsg(null)
  }

  const save = async () => {
    setBusy(true)
    try {
      const clean = await saveBank(user.uid, bank)
      setBank(clean)
      setDirty(false)
      setMsg({ type: 'ok', text: `Saved ${clean.questions.length} questions.` })
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  const importFile = async (file) => {
    if (!file) return
    try {
      const b = await readBankFile(file)
      if (bank?.questions.length && !confirm(`Replace your ${bank.questions.length} questions with the ${b.questions.length} questions in this file?`)) return
      change(b)
      setMsg({ type: 'info', text: `Loaded ${b.questions.length} questions from ${file.name}. Click “Save changes” to keep them.` })
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      fileRef.current.value = ''
    }
  }

  if (bank === undefined) return <Scene persona="hold"><main className="page page--withPersona"><Spinner label="Loading question bank" /></main></Scene>

  const list = bank.questions.map((q, i) => ({ q, i })).filter(({ q }) => filter === 'all' || q.category === filter)
  const counts = Object.fromEntries(Object.keys(CATEGORIES).map((c) => [c, bank.questions.filter((q) => q.category === c).length]))

  return (
    <Scene persona="hold">
      <CornerTools />
      <main className="page page--withPersona" style={{ gap: 14 }}>
        <Logo variant="bar" />
        <section className="panel" style={{ maxWidth: 1100 }}>
          <div className="panel__head">
            <ListChecks aria-hidden="true" /> Question Bank
          </div>
          <div className="panel__body stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <Btn size="sm" color="dark" icon={ArrowLeft} onClick={() => (!dirty || confirm('Leave without saving?')) && navigate('/host')}>
                Dashboard
              </Btn>
              <div className="row">
                <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e.target.files[0])} />
                <Btn size="sm" color="gold" icon={Upload} onClick={() => fileRef.current.click()}>Import file</Btn>
                <Btn size="sm" color="blue" icon={Download} disabled={!bank.questions.length} onClick={() => downloadBank(bank)}>Export file</Btn>
                <Btn size="sm" color="green" icon={Save} disabled={!dirty || busy} onClick={save}>
                  {busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
                </Btn>
              </div>
            </div>
            {msg && <div className={`notice notice--${msg.type}`}>{msg.text}</div>}
            {!bank.questions.length && (
              <div className="notice">
                Your bank is empty. Click <b>Import file</b> and choose <code>private-question-bank/tourism-unit3.json</code> (36 ready-made Unit 3 questions),
                then <b>Save changes</b>. The bank is stored privately in your Firebase database – students can never read it.
              </div>
            )}

            <div className="row">
              {[['all', `All (${bank.questions.length})`], ...Object.entries(CATEGORIES).map(([k, v]) => [k, `${v} (${counts[k]})`])].map(([k, label]) => (
                <button key={k} className={`opt ${filter === k ? 'is-on' : ''}`} onClick={() => setFilter(k)}>{label}</button>
              ))}
              <span className="grow" />
              <Btn size="sm" icon={Plus} onClick={() => setEditing({ index: -1, q: { ...EMPTY_Q, options: ['', '', '', ''], category: filter === 'all' ? 'grammar' : filter } })}>
                Add question
              </Btn>
            </div>

            <div className="bank-list" style={{ maxHeight: '48vh', overflow: 'auto' }}>
              {list.map(({ q, i }) => (
                <div key={q.id + i} className="bank-item">
                  <span className={`bank-item__tag bank-item__tag--${q.category}`}>{q.category}</span>
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>{i + 1}. {q.text}</div>
                    <div className="muted" style={{ fontSize: 14 }}>
                      {q.options.map((o, j) => (
                        <span key={j} style={{ marginRight: 12, fontWeight: j === q.answer ? 700 : 400, color: j === q.answer ? '#118a35' : undefined }}>
                          {ANSWER_LETTERS[j]}) {o}{j === q.answer ? ' ✓' : ''}
                        </span>
                      ))}
                      {q.passageId && <span> · passage: {bank.passages[q.passageId]?.title || q.passageId}</span>}
                    </div>
                  </div>
                  <button className="icon-btn" aria-label="Edit question" onClick={() => setEditing({ index: i, q: { ...q, options: [...q.options] } })}><Pencil /></button>
                  <button
                    className="icon-btn icon-btn--danger"
                    aria-label="Delete question"
                    onClick={() => confirm('Delete this question?') && change({ ...bank, questions: bank.questions.filter((_, j) => j !== i) })}
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
            </div>

            <details className="card">
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                <BookOpen style={{ width: 18, verticalAlign: '-3px' }} aria-hidden="true" /> Reading passages ({Object.keys(bank.passages).length})
              </summary>
              <div className="stack" style={{ marginTop: 10, gap: 8 }}>
                {Object.entries(bank.passages).map(([id, p]) => (
                  <div key={id} className="bank-item">
                    <div className="grow">
                      <b>{p.title || id}</b>
                      <div className="muted" style={{ fontSize: 14 }}>{p.text.slice(0, 160)}…</div>
                    </div>
                    <button className="icon-btn" aria-label="Edit passage" onClick={() => setEditingPassage({ id, ...p })}><Pencil /></button>
                    <button
                      className="icon-btn icon-btn--danger"
                      aria-label="Delete passage"
                      onClick={() => {
                        const used = bank.questions.filter((q) => q.passageId === id).length
                        if (used) return alert(`${used} question(s) use this passage. Change or delete them first.`)
                        const { [id]: _drop, ...rest } = bank.passages
                        change({ ...bank, passages: rest })
                      }}
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))}
                <Btn size="sm" icon={Plus} onClick={() => setEditingPassage({ id: null, title: '', text: '' })}>Add passage</Btn>
              </div>
            </details>
          </div>
        </section>
      </main>

      {editing && (
        <QuestionForm
          initial={editing.q}
          passages={bank.passages}
          onCancel={() => setEditing(null)}
          onSave={(q) => {
            const questions = [...bank.questions]
            if (editing.index === -1) {
              const ids = new Set(questions.map((x) => x.id))
              let n = questions.length + 1
              while (ids.has(`q${n}`)) n++
              questions.push({ ...q, id: q.id || `q${n}` })
            } else questions[editing.index] = q
            try {
              validateBank({ ...bank, questions })
              change({ ...bank, questions })
              setEditing(null)
            } catch (e) {
              return e.message
            }
          }}
        />
      )}
      {editingPassage && (
        <PassageForm
          initial={editingPassage}
          onCancel={() => setEditingPassage(null)}
          onSave={(p) => {
            const id = p.id || `p${Date.now().toString(36)}`
            change({ ...bank, passages: { ...bank.passages, [id]: { title: p.title, text: p.text } } })
            setEditingPassage(null)
          }}
        />
      )}
    </Scene>
  )
}

function QuestionForm({ initial, passages, onCancel, onSave }) {
  const [q, setQ] = useState(initial)
  const [err, setErr] = useState(null)
  const set = (patch) => setQ((x) => ({ ...x, ...patch }))
  return (
    <Modal title={initial.text ? 'Edit question' : 'New question'} icon={Pencil} onClose={onCancel}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          const clean = { ...q }
          if (clean.category !== 'reading' || !clean.passageId) delete clean.passageId
          if (!clean.image) delete clean.image
          setErr(onSave(clean) || null)
        }}
      >
        <div className="row">
          <label className="field grow">
            Category
            <select className="input" value={q.category} onChange={(e) => set({ category: e.target.value })}>
              {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          {q.category === 'reading' && (
            <label className="field grow">
              Reading passage
              <select className="input" value={q.passageId || ''} onChange={(e) => set({ passageId: e.target.value || undefined })}>
                <option value="">(none)</option>
                {Object.entries(passages).map(([id, p]) => <option key={id} value={id}>{p.title || id}</option>)}
              </select>
            </label>
          )}
        </div>
        <label className="field">
          Question
          <textarea className="input" value={q.text} onChange={(e) => set({ text: e.target.value })} required />
        </label>
        {q.options.map((o, i) => (
          <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
            <span className={`ans__letter`} style={{ '--ac': ['#f0284a', '#1c6ff0', '#f7a400', '#1fb53c'][i], '--ad': ['#b0102f', '#0d47a8', '#b06a00', '#0f7a26'][i], fontFamily: 'var(--display)', fontWeight: 800 }}>
              {ANSWER_LETTERS[i]}
            </span>
            <input
              className="input"
              value={o}
              aria-label={`Option ${ANSWER_LETTERS[i]}`}
              onChange={(e) => set({ options: q.options.map((x, j) => (j === i ? e.target.value : x)) })}
              required
            />
            <label className="switch" title="Correct answer">
              <input type="radio" name="answer" checked={q.answer === i} onChange={() => set({ answer: i })} style={{ borderRadius: '50%' }} />
              <span className="sr-only">Correct</span>
              {q.answer === i && <Check style={{ color: '#12993a' }} aria-hidden="true" />}
            </label>
          </div>
        ))}
        <label className="field">
          Explanation (shown after the answer is revealed)
          <textarea className="input" value={q.explanation} onChange={(e) => set({ explanation: e.target.value })} />
        </label>
        <label className="field">
          Image URL (optional, shown next to non-reading questions)
          <input className="input" value={q.image || ''} onChange={(e) => set({ image: e.target.value })} placeholder="https://…" />
        </label>
        {err && <div className="notice notice--error">{err}</div>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Btn color="dark" onClick={onCancel}>Cancel</Btn>
          <Btn type="submit" color="green" icon={Check}>Done</Btn>
        </div>
      </form>
    </Modal>
  )
}

function PassageForm({ initial, onCancel, onSave }) {
  const [p, setP] = useState(initial)
  return (
    <Modal title={initial.id ? 'Edit passage' : 'New passage'} icon={BookOpen} onClose={onCancel}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); onSave(p) }}>
        <label className="field">
          Title
          <input className="input" value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} />
        </label>
        <label className="field">
          Text (leave an empty line between paragraphs)
          <textarea className="input" style={{ minHeight: 220 }} value={p.text} onChange={(e) => setP({ ...p, text: e.target.value })} required />
        </label>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Btn color="dark" onClick={onCancel}>Cancel</Btn>
          <Btn type="submit" color="green" icon={Check}>Done</Btn>
        </div>
      </form>
    </Modal>
  )
}

// The question bank lives in the database under banks/<teacherUid>, readable only by that teacher.
// It is deliberately NOT bundled into the website, so students cannot find the answer key
// by looking at the site's JavaScript.
import { ref, get, set, serverTimestamp } from 'firebase/database'
import { db } from '../firebase/config.js'
import { validateBank } from '../lib/gameLogic.js'

export async function loadBank(uid) {
  const snap = await get(ref(db, `banks/${uid}`))
  const val = snap.val()
  if (!val) return null
  return validateBank(val)
}

export async function saveBank(uid, bank) {
  const clean = validateBank(bank)
  await set(ref(db, `banks/${uid}`), { ...clean, updatedAt: serverTimestamp() })
  return clean
}

export function downloadBank(bank, filename = 'tourism-question-bank.json') {
  const { title, passages, questions } = bank
  const blob = new Blob([JSON.stringify({ title, passages, questions }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function readBankFile(file) {
  const text = await file.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  return validateBank(json)
}

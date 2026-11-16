import { describe, it, expect } from 'vitest'
import {
  makeTeams, smallestTeam, cleanName, nameKeyOf, elapsedForAnswer, pointsFor,
  scoreQuestion, totalsFromResults, teamBoard, validateBank, buildGameQuestions, randomRoomCode,
} from './gameLogic.js'
import { readFileSync, existsSync } from 'node:fs'

// Mirrors the database rule so the client and rules agree on name keys.
const ruleKey = (n) => n.toLowerCase().replaceAll(' ', '_').replaceAll('-', '_').replaceAll("'", '')
const ruleNameOk = (n) => /^[A-Za-z0-9][A-Za-z0-9 '-]{0,19}$/.test(n)

describe('teams', () => {
  it('balances teams to within one member', () => {
    for (let n = 0; n <= 37; n++) {
      for (const tc of [2, 3, 4]) {
        const uids = Array.from({ length: n }, (_, i) => 'u' + i)
        const t = makeTeams(uids, tc)
        const counts = {}
        Object.values(t).forEach((x) => (counts[x] = (counts[x] || 0) + 1))
        expect(Object.keys(t)).toHaveLength(n)
        const vals = Object.values(counts)
        if (n >= tc) expect(Object.keys(counts)).toHaveLength(tc)
        if (vals.length) expect(Math.max(...vals) - Math.min(...vals)).toBeLessThanOrEqual(1)
        Object.values(t).forEach((x) => expect(['A', 'B', 'C', 'D'].slice(0, tc)).toContain(x))
      }
    }
  })
  it('late joiners go to the smallest team', () => {
    expect(smallestTeam({ a: 'A', b: 'A', c: 'B' }, 3)).toBe('C')
    expect(smallestTeam({ a: 'A', b: 'B' }, 2)).toBe('A')
  })
  it('room codes are six digits', () => {
    for (let i = 0; i < 200; i++) expect(randomRoomCode()).toMatch(/^[1-9][0-9]{5}$/)
  })
})

describe('names', () => {
  it('cleans names so they pass the database rules', () => {
    for (const raw of ['  Yasmine  Ben Ali ', 'Rayén', "O'Brien", 'Al-Amin!!', 'سارة Sara', '---Bob', 'ThisNameIsWayTooLongForTheGame']) {
      const n = cleanName(raw)
      if (n) {
        expect(ruleNameOk(n)).toBe(true)
        expect(nameKeyOf(n)).toBe(ruleKey(n))
        expect(nameKeyOf(n)).toMatch(/^[a-z0-9_]{1,20}$/)
      }
    }
    expect(cleanName('Rayén')).toBe('Rayen')
    expect(nameKeyOf('Al-Amin')).toBe(nameKeyOf('al amin'))
  })
})

describe('scoring', () => {
  const segs = { s0: { openedAt: 1000, durationMs: 20000, elapsedBefore: 0 } }
  it('computes elapsed time across pauses', () => {
    const two = { s0: { openedAt: 1000, elapsedBefore: 0 }, s1: { openedAt: 50000, elapsedBefore: 5000 } }
    expect(elapsedForAnswer(3000, two)).toBe(2000)
    expect(elapsedForAnswer(52000, two)).toBe(7000)
  })
  it('awards base points plus a speed bonus only for correct answers', () => {
    expect(pointsFor({ correct: false, elapsedMs: 0, totalMs: 20000, speedBonus: true })).toBe(0)
    expect(pointsFor({ correct: true, elapsedMs: 0, totalMs: 20000, speedBonus: true })).toBe(150)
    expect(pointsFor({ correct: true, elapsedMs: 20000, totalMs: 20000, speedBonus: true })).toBe(100)
    expect(pointsFor({ correct: true, elapsedMs: 10000, totalMs: 20000, speedBonus: true })).toBe(125)
    expect(pointsFor({ correct: true, elapsedMs: 1, totalMs: 20000, speedBonus: false })).toBe(100)
  })
  it('scores a question, ignoring unassigned players and bad values', () => {
    const { results, counts } = scoreQuestion({
      answers: { a: { c: 1, t: 1000 }, b: { c: 2, t: 11000 }, c: { c: 1, t: 21000 }, x: { c: 1, t: 1000 }, d: { c: 9, t: 1 } },
      teams: { a: 'A', b: 'B', c: 'A', d: 'B' },
      correctIndex: 1, segments: segs, totalMs: 20000, speedBonus: true,
    })
    expect(results.a).toEqual({ c: 1, ok: true, pts: 150 })
    expect(results.b.pts).toBe(0)
    expect(results.c.pts).toBe(100)
    expect(results.x).toBeUndefined()
    expect(results.d).toBeUndefined()
    expect(counts).toEqual([0, 2, 1, 0])
  })
  it('totals and team board with average ranking', () => {
    const scores = totalsFromResults({ q1: { a: { ok: true, pts: 150 }, b: { ok: false, pts: 0 }, c: { ok: true, pts: 100 } }, q2: { a: { ok: true, pts: 100 } } })
    expect(scores.a).toEqual({ total: 250, correct: 2, answered: 2 })
    const teams = { a: 'A', b: 'B', c: 'B' }
    const byTotal = teamBoard({ scores, teams, teamCount: 2 })
    expect(byTotal.A).toMatchObject({ total: 250, members: 1, avg: 250, rank: 1 })
    expect(byTotal.B).toMatchObject({ total: 100, members: 2, avg: 50, rank: 2 })
    const t2 = teamBoard({ scores: { a: { total: 100 }, b: { total: 100 }, c: { total: 100 } }, teams, teamCount: 2, rankBy: 'total' })
    expect(t2.B.rank).toBe(1)
    const t3 = teamBoard({ scores: { a: { total: 100 }, b: { total: 100 }, c: { total: 100 } }, teams, teamCount: 2, rankBy: 'average' })
    expect(t3.A.rank).toBe(1)
    expect(t3.B.rank).toBe(1)
  })
})

describe('question bank', () => {
  const path = new URL('../../private-question-bank/tourism-unit3.json', import.meta.url)
  it.runIf(existsSync(path))('the shipped bank is valid and complete', () => {
    const bank = validateBank(JSON.parse(readFileSync(path, 'utf8')))
    expect(bank.questions.length).toBeGreaterThanOrEqual(30)
    for (const cat of ['reading', 'grammar', 'vocabulary']) expect(bank.questions.some((q) => q.category === cat)).toBe(true)
    expect(Object.keys(bank.passages).length).toBeGreaterThanOrEqual(3)
    bank.questions.forEach((q) => {
      expect(q.explanation.length).toBeGreaterThan(10)
      expect(new Set(q.options.map((o) => o.toLowerCase())).size).toBe(4)
    })
    const game = buildGameQuestions(bank, { shuffleOrder: true })
    // passage questions stay together
    const seenDone = new Set()
    let prev = null
    game.forEach((q) => {
      if (q.passageId !== prev && prev) seenDone.add(prev)
      if (q.passageId) expect(seenDone.has(q.passageId)).toBe(false)
      prev = q.passageId || null
    })
  })
  it('rejects malformed questions', () => {
    expect(() => validateBank({ questions: [{ category: 'grammar', text: 'x', options: ['a', 'b', 'c'], answer: 0 }] })).toThrow(/four/)
    expect(() => validateBank({ questions: [{ category: 'maths', text: 'x', options: ['a', 'b', 'c', 'd'], answer: 0 }] })).toThrow(/category/)
    expect(() => validateBank({ questions: [{ category: 'grammar', text: 'x', options: ['a', 'b', 'c', 'd'], answer: 4 }] })).toThrow(/answer/)
  })
})

import { playerRanks } from './gameLogic.js'
describe('individual ranking', () => {
  it('ranks players with ties sharing a place', () => {
    const { ranks, count } = playerRanks({ a: { total: 300 }, b: { total: 500 }, c: { total: 300 } }, { a: 'A', b: 'A', c: 'A', d: 'A' })
    expect(count).toBe(4)
    expect(ranks).toEqual({ b: 1, a: 2, c: 2, d: 4 })
  })
})

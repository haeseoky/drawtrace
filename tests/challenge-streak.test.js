import { describe, it, expect, beforeEach, vi } from 'vitest'
import { recordChallengeCompletion, getChallengeStreak, nextMilestoneIn } from '../src/lib/challenge'

// localStorage 모킹 (node 환경)
const store = new Map()
const localStorageMock = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  clear: () => store.clear(),
}
vi.stubGlobal('localStorage', localStorageMock)

function dayKey(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('challenge streak', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('첫 완료 시 count 1', () => {
    const r = recordChallengeCompletion()
    expect(r.count).toBe(1)
    expect(r.isNewRecord).toBe(true)
  })

  it('같은 날 재완료 시 count 유지', () => {
    recordChallengeCompletion()
    const r = recordChallengeCompletion()
    expect(r.count).toBe(1)
    expect(r.isNewRecord).toBe(false)
  })

  it('어제 완료했으면 연속 +1', () => {
    recordChallengeCompletion()
    const raw = JSON.parse(localStorage.getItem('drawtrace_challenge_streak'))
    raw.lastDone = dayKey(-1)
    localStorage.setItem('drawtrace_challenge_streak', JSON.stringify(raw))
    const r = recordChallengeCompletion()
    expect(r.count).toBe(2)
    expect(r.isNewRecord).toBe(true)
  })

  it('어제 안 했으면 리셋 1 (best 유지)', () => {
    localStorage.setItem('drawtrace_challenge_streak', JSON.stringify({ lastDone: dayKey(-5), count: 5, best: 7 }))
    const r = recordChallengeCompletion()
    expect(r.count).toBe(1)
    expect(r.isNewRecord).toBe(false)
  })

  it('getChallengeStreak: 미완료 상태면 count 0, doneToday false', () => {
    const s = getChallengeStreak()
    expect(s.count).toBe(0)
    expect(s.doneToday).toBe(false)
  })

  it('getChallengeStreak: 오늘 완료 시 doneToday true', () => {
    recordChallengeCompletion()
    const s = getChallengeStreak()
    expect(s.doneToday).toBe(true)
    expect(s.count).toBe(1)
  })

  it('getChallengeStreak: 어제 완료(오늘 미완료)면 연속 표시 유지', () => {
    localStorage.setItem('drawtrace_challenge_streak', JSON.stringify({ lastDone: dayKey(-1), count: 3, best: 5 }))
    const s = getChallengeStreak()
    expect(s.count).toBe(3)
    expect(s.doneToday).toBe(false)
  })

  it('7일 도달 시 milestone 7 반환', () => {
    localStorage.setItem('drawtrace_challenge_streak', JSON.stringify({ lastDone: dayKey(-1), count: 6, best: 6, history: [] }))
    const r = recordChallengeCompletion()
    expect(r.count).toBe(7)
    expect(r.milestone).toBe(7)
    const s = getChallengeStreak()
    expect(s.milestone).toBe(7)
  })

  it('마일스톤 아닌 날은 milestone null', () => {
    localStorage.setItem('drawtrace_challenge_streak', JSON.stringify({ lastDone: dayKey(-1), count: 4, best: 4, history: [] }))
    const r = recordChallengeCompletion()
    expect(r.count).toBe(5)
    expect(r.milestone).toBeNull()
    expect(getChallengeStreak().milestone).toBeNull()
  })

  it('마일스톤은 오늘 완료 시에만 표시(어제 완료분이면 null)', () => {
    localStorage.setItem('drawtrace_challenge_streak', JSON.stringify({ lastDone: dayKey(-1), count: 7, best: 7, history: [] }))
    expect(getChallengeStreak().milestone).toBeNull()
  })

  it('nextMilestoneIn: 0이면 null, 1~6은 7-count, 7이면 null', () => {
    expect(nextMilestoneIn(0)).toBeNull()
    expect(nextMilestoneIn(-1)).toBeNull()
    expect(nextMilestoneIn(1)).toBe(6)
    expect(nextMilestoneIn(6)).toBe(1)
    expect(nextMilestoneIn(7)).toBeNull()
    expect(nextMilestoneIn(8)).toBe(6)
  })
})


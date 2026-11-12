import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getChallenge30DayCount, recordChallengeCompletion } from '../src/lib/challenge'

// localStorage 모킹 (node 환경)
const store = new Map()
const localStorageMock = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  clear: () => store.clear(),
}
vi.stubGlobal('localStorage', localStorageMock)

function todayKey(offsetDays = 0) {
  const d = new Date(Date.now() - offsetDays * 86400000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

describe('getChallenge30DayCount', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('기록 없으면 0', () => {
    expect(getChallenge30DayCount()).toBe(0)
  })

  it('완료 기록 수 반환 (같은 날 중복 완료는 1회)', () => {
    recordChallengeCompletion()
    recordChallengeCompletion()
    expect(getChallenge30DayCount()).toBe(1)
  })

  it('30일 이전 날짜 기록은 제외 (장기 미접속 오염 방지)', () => {
    const old = todayKey(40)
    localStorage.setItem('drawtrace_challenge_streak', JSON.stringify({
      lastDone: old, count: 3, best: 3, history: [old, todayKey(41), todayKey(45)],
    }))
    expect(getChallenge30DayCount()).toBe(0)
  })

  it('30일 이내 날짜만 카운트', () => {
    localStorage.setItem('drawtrace_challenge_streak', JSON.stringify({
      lastDone: todayKey(0), count: 2, best: 5,
      history: [todayKey(0), todayKey(3), todayKey(29), todayKey(31)],
    }))
    expect(getChallenge30DayCount()).toBe(3)
  })
})

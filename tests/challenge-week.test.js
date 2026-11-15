import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getLast7Days, getChallenge7DayCount, recordChallengeCompletion } from '../src/lib/challenge'

// localStorage 모킹 (node 환경)
const store = new Map()
vi.stubGlobal('localStorage', {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  clear: () => store.clear(),
})

describe('getLast7Days', () => {
  beforeEach(() => localStorage.clear())

  it('완료 이력 없으면 7일 모두 false', () => {
    const days = getLast7Days()
    expect(days).toHaveLength(7)
    expect(days.every(d => !d.done)).toBe(true)
  })

  it('오늘 완료 시 마지막 항목만 true', () => {
    recordChallengeCompletion()
    const days = getLast7Days()
    expect(days[6].done).toBe(true)
    expect(days.slice(0, 6).every(d => !d.done)).toBe(true)
  })

  it('과거→오늘 순서로 정렬, date는 YYYY-MM-DD', () => {
    const days = getLast7Days()
    expect(days[0].date < days[6].date).toBe(true)
    expect(days[6].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('이전 날짜 완료분도 표시', () => {
    recordChallengeCompletion()
    // 어제 날짜를 이력에 직접 추가 (record는 오늘로 기록됨)
    const key = 'drawtrace_challenge_streak'
    const data = JSON.parse(store.get(key))
    const yesterday = new Date(Date.now() - 86400000)
    const yk = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    data.history.push(yk)
    store.set(key, JSON.stringify(data))
    const days = getLast7Days()
    expect(days[5].done).toBe(true)
    expect(days[6].done).toBe(true)
  })
})

describe('getChallenge7DayCount', () => {
  beforeEach(() => localStorage.clear())

  it('이력 없으면 0', () => {
    expect(getChallenge7DayCount()).toBe(0)
  })

  it('오늘 1회 완료 시 1', () => {
    recordChallengeCompletion()
    expect(getChallenge7DayCount()).toBe(1)
  })

  it('7일 이내 완료분만 집계', () => {
    recordChallengeCompletion()
    const key = 'drawtrace_challenge_streak'
    const data = JSON.parse(store.get(key))
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    data.history.push(fmt(new Date(Date.now() - 3 * 86400000))) // 3일 전 — 포함
    data.history.push(fmt(new Date(Date.now() - 10 * 86400000))) // 10일 전 — 제외
    store.set(key, JSON.stringify(data))
    expect(getChallenge7DayCount()).toBe(2)
  })
})

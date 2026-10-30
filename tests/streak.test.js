import { describe, it, expect, beforeEach, vi } from 'vitest'

// streak.js는 localStorage와 Date에 의존 — 테스트 전 모킹
describe('streak', () => {
  let checkStreak

  beforeEach(async () => {
    vi.resetModules()
    // localStorage 모킹
    const store = new Map()
    global.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    }
    checkStreak = (await import('../src/lib/streak.js')).checkStreak
  })

  function mockDate(iso) {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(iso))
  }

  it('첫 방문: count 1, isNewRecord true', () => {
    mockDate('2026-10-31T09:00:00+09:00')
    const r = checkStreak()
    expect(r.count).toBe(1)
    expect(r.isNewDay).toBe(true)
    expect(r.isNewRecord).toBe(true)
    expect(r.milestone).toBe(null)
    vi.useRealTimers()
  })

  it('같은 날 재방문: isNewDay false, isNewRecord false', () => {
    mockDate('2026-10-31T09:00:00+09:00')
    checkStreak()
    const r = checkStreak()
    expect(r.count).toBe(1)
    expect(r.isNewDay).toBe(false)
    expect(r.isNewRecord).toBe(false)
    vi.useRealTimers()
  })

  it('연속 방문: count 증가, 기록 갱신 시 isNewRecord true', () => {
    mockDate('2026-10-30T09:00:00+09:00')
    checkStreak() // 1일
    mockDate('2026-10-31T09:00:00+09:00')
    const r = checkStreak() // 2일
    expect(r.count).toBe(2)
    expect(r.best).toBe(2)
    expect(r.isNewRecord).toBe(true)
    vi.useRealTimers()
  })

  it('7일 도달 시 milestone 표시', () => {
    // 7일 연속 시뮬레이션
    mockDate('2026-10-24T09:00:00+09:00')
    checkStreak()
    for (let d = 1; d <= 6; d++) {
      mockDate(`2026-10-${24 + d}T09:00:00+09:00`)
      checkStreak()
    }
    const r = checkStreak() // 10-31 = 7일째
    expect(r.count).toBe(7)
    expect(r.milestone).toBe(7)
    expect(r.isNewRecord).toBe(true)
    vi.useRealTimers()
  })

  it('끊긴 스트릭: count 리셋, 신기록 아님', () => {
    mockDate('2026-10-01T09:00:00+09:00')
    checkStreak()
    // 5일 더 쌓기 → best 6
    for (let d = 2; d <= 6; d++) {
      mockDate(`2026-10-${String(d).padStart(2, '0')}T09:00:00+09:00`)
      checkStreak()
    }
    // 10일 쉬고 재개
    mockDate('2026-10-16T09:00:00+09:00')
    const r = checkStreak()
    expect(r.count).toBe(1)
    expect(r.best).toBe(6)
    expect(r.isNewRecord).toBe(false)
    vi.useRealTimers()
  })
})

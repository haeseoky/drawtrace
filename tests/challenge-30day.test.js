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
})

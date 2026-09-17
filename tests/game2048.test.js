import { describe, it, expect } from 'vitest'
import { slide } from '../src/lib/game2048'

function mkLine(vals) {
  // vals: [null | number] — id/r/c 자동 부여
  let id = 1
  return vals.map((v, i) => v == null ? null : { id: id++, value: v, r: 0, c: i })
}

describe('2048 slide', () => {
  it('빈 줄: 이동 없음', () => {
    const { out, gained, moved } = slide(mkLine([null, null, null, null]))
    expect(out.filter(Boolean).length).toBe(0)
    expect(gained).toBe(0)
    expect(moved).toBe(false)
  })

  it('좌측 밀기: 타일이 앞쪽으로 압축', () => {
    const { out, moved, gained } = slide(mkLine([null, 2, null, 4]))
    expect(out.filter(Boolean).map(t => t.value)).toEqual([2, 4])
    expect(moved).toBe(true)
    expect(gained).toBe(0)
  })

  it('같은 숫자 병합: 2+2=4, 점수 4', () => {
    const { out, gained, moved } = slide(mkLine([2, 2, null, null]))
    expect(out.filter(Boolean).map(t => t.value)).toEqual([4])
    expect(gained).toBe(4)
    expect(moved).toBe(true)
  })

  it('한 이동당 병합은 1회만: 4,2,2 → 4,4 (자동 재병합 없음)', () => {
    const { out, gained } = slide(mkLine([4, 2, 2, null]))
    expect(out.filter(Boolean).map(t => t.value)).toEqual([4, 4])
    expect(gained).toBe(4)
  })

  it('병합 우선순위는 슬라이드 방향: 2,2,2,2 → 4,4 (점수 8)', () => {
    const { out, gained } = slide(mkLine([2, 2, 2, 2]))
    expect(out.filter(Boolean).map(t => t.value)).toEqual([4, 4])
    expect(gained).toBe(8)
  })

  it('이미 정렬된 상태 + 병합 불가: 이동 없음', () => {
    const { moved } = slide(mkLine([2, 4, 2, 4]))
    expect(moved).toBe(false)
  })
})

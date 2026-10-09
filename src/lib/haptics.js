/**
 * 햅틱(진동) 피드백 유틸
 * navigator.vibrate 지원 기기(안드로이드 등)에서만 동작, iOS Safari 미지원(무시됨)
 * 설정: localStorage 'haptics-enabled' ('1' 기본, '0' 끔) — 홈 화면 토글로 변경 가능
 */

const STORE_KEY = 'haptics-enabled'

export function hapticsEnabled() {
  try {
    return localStorage.getItem(STORE_KEY) !== '0'
  } catch {
    return true
  }
}

export function setHapticsEnabled(on) {
  try {
    localStorage.setItem(STORE_KEY, on ? '1' : '0')
  } catch {
    /* 무시 */
  }
}

function vibrate(pattern) {
  try {
    if (!hapticsEnabled()) return
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch {
    /* 무시 */
  }
}

/** 임의 패턴 — 컴포넌트의 raw navigator.vibrate 대체용 (설정 토글 적용) */
export const haptic = (pattern) => vibrate(pattern)

/** 가벼운 틱 (버튼 터치, 정답 등) */
export const hapticTick = () => vibrate(15)

/** 성공 피드백 (클리어, 좋은 결과) */
export const hapticSuccess = () => vibrate([30, 60, 30])

/** 오류 피드백 (실패, 실수) */
export const hapticError = () => vibrate([80, 40, 80])

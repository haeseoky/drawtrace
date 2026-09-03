/**
 * 햅틱(진동) 피드백 유틸
 * navigator.vibrate 지원 기기(안드로이드 등)에서만 동작, iOS Safari 미지원(무시됨)
 */

function vibrate(pattern) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch {
    /* 무시 */
  }
}

/** 가벼운 틱 (버튼 터치, 정답 등) */
export const hapticTick = () => vibrate(15)

/** 성공 피드백 (클리어, 좋은 결과) */
export const hapticSuccess = () => vibrate([30, 60, 30])

/** 오류 피드백 (실패, 실수) */
export const hapticError = () => vibrate([80, 40, 80])

/**
 * 공유 유틸리티 — Web Share API + 클립보드 + 메신저 링크
 */

const BASE_URL = 'https://game.nutalk.co.kr'

export function getGameUrl(gameId) {
  return `${BASE_URL}/#/${gameId}`
}

export function getShareText(gameName, score) {
  return `🎮 ${gameName}에서 ${score}점 달성! 당신도 도전해보세요!\n${BASE_URL}`
}

export async function shareResult(gameName, score) {
  const text = getShareText(gameName, score)
  const url = BASE_URL

  // Web Share API (모바일)
  if (navigator.share) {
    try {
      await navigator.share({ title: `${gameName} — ${score}점!`, text, url })
      return true
    } catch (e) {
      if (e.name === 'AbortError') return false
    }
  }

  // Fallback: 클립보드 복사
  try {
    await navigator.clipboard.writeText(text)
    return 'clipboard'
  } catch {
    return false
  }
}

export function getKakaoShareUrl(gameName, score) {
  const text = encodeURIComponent(getShareText(gameName, score))
  return `https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(BASE_URL)}&text=${text}`
}

export function getTelegramShareUrl(gameName, score) {
  const text = encodeURIComponent(getShareText(gameName, score))
  return `https://t.me/share/url?url=${encodeURIComponent(BASE_URL)}&text=${text}`
}

export function getTwitterShareUrl(gameName, score) {
  const text = encodeURIComponent(getShareText(gameName, score))
  return `https://twitter.com/intent/tweet?text=${text}`
}

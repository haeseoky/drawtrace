/**
 * 랭킹 시스템 (localStorage 기반, 게임별 분리 저장)
 */

const STORAGE_KEY_PREFIX = 'drawtrace-lb-'
const LEGACY_KEY = 'drawtrace-leaderboard'
const MAX_ENTRIES = 50

function storageKey(gameId) {
  return STORAGE_KEY_PREFIX + gameId
}

// 기존 통합 데이터를 게임별로 마이그레이션 (최초 1회만 실행)
function migrateLegacy() {
  const raw = localStorage.getItem(LEGACY_KEY)
  if (!raw) return
  try {
    const legacy = JSON.parse(raw)
    if (!Array.isArray(legacy) || legacy.length === 0) return
    const groups = {}
    legacy.forEach(e => {
      const gid = e.gameId || 'unknown'
      if (!groups[gid]) groups[gid] = []
      groups[gid].push(e)
    })
    Object.entries(groups).forEach(([gid, entries]) => {
      entries.sort((a, b) => b.score - a.score)
      if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES
      localStorage.setItem(storageKey(gid), JSON.stringify(entries))
    })
    localStorage.removeItem(LEGACY_KEY)
  } catch { /* ignore corrupt data */ }
}

migrateLegacy()

export function getLeaderboard(gameId = null) {
  try {
    if (gameId) {
      return JSON.parse(localStorage.getItem(storageKey(gameId)) || '[]')
    }
    const all = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const entries = JSON.parse(localStorage.getItem(key) || '[]')
        all.push(...entries)
      }
    }
    return all.sort((a, b) => b.score - a.score)
  } catch {
    return []
  }
}

export function addScore(entry) {
  const gameId = entry.gameId || 'unknown'
  const data = getLeaderboard(gameId)
  data.push({
    ...entry,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
  })
  data.sort((a, b) => b.score - a.score)
  if (data.length > MAX_ENTRIES) data.length = MAX_ENTRIES
  localStorage.setItem(storageKey(gameId), JSON.stringify(data))
  return data
}

export function getTopScores(gameId, count = 10) {
  return getLeaderboard(gameId).slice(0, count)
}

export function getRank(gameId, score) {
  const board = getLeaderboard(gameId)
  const rank = board.findIndex(e => e.score <= score)
  return rank === -1 ? board.length + 1 : rank + 1
}

export function getBestScore(gameId) {
  const board = getLeaderboard(gameId)
  return board.length > 0 ? board[0].score : 0
}

export function clearLeaderboard(gameId = null) {
  if (gameId) {
    localStorage.removeItem(storageKey(gameId))
  } else {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) keys.push(key)
    }
    keys.forEach(k => localStorage.removeItem(k))
  }
}

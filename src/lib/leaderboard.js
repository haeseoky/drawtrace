/**
 * 랭킹 시스템 (localStorage 기반)
 */

const STORAGE_KEY = 'drawtrace-leaderboard'
const MAX_ENTRIES = 50

export function getLeaderboard(gameId = null) {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  if (gameId) return data.filter(e => e.gameId === gameId)
  return data
}

export function addScore(entry) {
  const data = getLeaderboard()
  data.push({
    ...entry,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
  })
  // 점수순 정렬 후 최대 개수 유지
  data.sort((a, b) => b.score - a.score)
  if (data.length > MAX_ENTRIES) data.length = MAX_ENTRIES
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
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

export function clearLeaderboard() {
  localStorage.removeItem(STORAGE_KEY)
}

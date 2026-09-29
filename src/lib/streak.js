/**
 * 일일 접속 스트릭 (연속 출석) 관리
 * 하이브리드 캐주얼 리텐션 메커니즘 — 매일 접속해 연속 일수를 쌓는 보상 루프
 */

const KEY = 'drawtrace_streak'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function yesterdayKey() {
  const d = new Date(Date.now() - 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return { lastVisit: null, count: 0, best: 0 }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (e) { /* ignore */ }
}

/**
 * 오늘 스트릭 체크(갱신). 앱 진입 시 1회 호출.
 * @returns {{ count:number, best:number, isNewDay:boolean }}
 */
export function checkStreak() {
  const data = load()
  const today = todayKey()
  if (data.lastVisit === today) {
    return { count: data.count, best: data.best, isNewDay: false }
  }
  const isNewDay = true
  if (data.lastVisit === yesterdayKey()) {
    data.count += 1
  } else {
    data.count = 1
  }
  data.best = Math.max(data.best, data.count)
  data.lastVisit = today
  save(data)
  return { count: data.count, best: data.best, isNewDay }
}

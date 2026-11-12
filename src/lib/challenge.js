/**
 * 일일 챌린지 데이터 관리
 * 매일 00:00(UTC+9)에 새로운 챌린지 생성
 */

// 챌리지 유형
export const CHALLENGE_TYPES = {
  ACCURACY: 'accuracy', // 정확도 중심 (90점 이상)
  SPEED: 'speed',       // 속도 중심 (남은 시간 50% 이상)
  STREAK: 'streak',     // 연속 성공 (3연속 70점 이상)
  SHAPE: 'shape'        // 특정 모양 마스터 (모양별 최고 점수)
}

// 오늘의 씨드 기반 챌린지 생성
export function getDailyChallenge(date = new Date()) {
  const seed = getDailySeed(date)

  // 간단한 의사 랜덤 (시드 기반)
  const types = Object.values(CHALLENGE_TYPES)
  const typeIndex = seededRandom(seed) % types.length
  const type = types[typeIndex]

  // 난이도는 시드 기반 1-3
  const difficulty = (seededRandom(seed + 1) % 3) + 1

  // 목표값 설정
  let goal, description, hint
  switch (type) {
    case CHALLENGE_TYPES.ACCURACY:
      goal = 85 + (seededRandom(seed + 2) % 6) // 85-90점
      description = `정확도 챌린지: ${goal}점 이상 달성`
      hint = '신중하게 그리고 틀리지 마세요'
      break
    case CHALLENGE_TYPES.SPEED:
      goal = 50 + (seededRandom(seed + 2) % 31) // 50-80% 남은 시간
      description = `속도 챌린지: 시간 ${goal}% 이상 남기기`
      hint = '빠르고 정확하게!'
      break
    case CHALLENGE_TYPES.STREAK:
      goal = 2 + (seededRandom(seed + 2) % 3) // 2-4연속
      description = `연속 승리: ${goal}번 연속 70점 이상`
      hint = '실수하지 않고 꾸준히!'
      break
    case CHALLENGE_TYPES.SHAPE:
      // 특정 난이도(1-3) 기반
      goal = difficulty
      const shapeNames = ['원', '삼각형', '사각형', '별', '하트', '번개']
      const shapeIdx = seededRandom(seed + 3) % shapeNames.length
      description = `${shapeNames[shapeIdx]} 마스터: Lv.${goal} 도전`
      hint = '같은 모양을 연속으로 완벽하게!'
      break
  }

  return {
    id: `daily-${formatDate(date)}`,
    date: formatDate(date),
    type,
    difficulty,
    goal,
    description,
    hint,
    completed: false,
    progress: 0
  }
}

// 날짜 기반 시드 생성 (YYYYMMDD)
function getDailySeed(date) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return parseInt(`${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`)
}

// 시드 기반 의사 랜덤 (간단한 LCG)
function seededRandom(seed) {
  const a = 1664525
  const c = 1013904223
  const m = 2 ** 32
  seed = (a * seed + c) % m
  return seed
}

// 날짜 포맷 (YYYY-MM-DD)
function formatDate(date) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// 챌린지 완료 상태 저장
export function saveChallengeProgress(challengeId, progress, completed) {
  const key = `drawtrace_challenge_${challengeId}`
  const data = { progress, completed, timestamp: Date.now() }
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('챌린지 저장 실패:', e)
  }
}

// 챌린지 진행 상태 불러오기
export function loadChallengeProgress(challengeId) {
  const key = `drawtrace_challenge_${challengeId}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('챌린지 로드 실패:', e)
  }
  return { progress: 0, completed: false, timestamp: null }
}

// 챌린지 완료 여부 확인
export function isChallengeCompleted(challengeId) {
  const data = loadChallengeProgress(challengeId)
  return data.completed || false
}

const STREAK_KEY = 'drawtrace_challenge_streak'

function dayKey(date = new Date()) {
  return formatDate(date)
}

function yesterdayKey() {
  return formatDate(new Date(Date.now() - 86400000))
}

function loadStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (raw) return { history: [], ...JSON.parse(raw) }
  } catch (e) { /* ignore */ }
  return { lastDone: null, count: 0, best: 0, history: [] }
}

/**
 * 챌린지 완료 시 호출 — 완료 연속일 스트릭 갱신.
 * @returns {{ count:number, best:number, isNewRecord:boolean }}
 */
/**
 * 스트릭 마일스톤 판정 (7일 단위). 달성 시 홈에서 축하 강조용.
 */
export function milestoneFor(count) {
  return count > 0 && count % 7 === 0 ? count : null
}

/**
 * 다음 마일스톤(7일 단위)까지 남은 일수. 0 또는 마일스톤 당일이면 null.
 */
export function nextMilestoneIn(count) {
  if (count <= 0) return null
  const rem = count % 7
  return rem === 0 ? null : 7 - rem
}

export function recordChallengeCompletion() {
  const data = loadStreak()
  const prevBest = data.best
  const today = dayKey()
  if (data.lastDone === today) {
    return { count: data.count, best: data.best, isNewRecord: false }
  }
  data.count = data.lastDone === yesterdayKey() ? data.count + 1 : 1
  data.lastDone = today
  data.best = Math.max(data.best, data.count)
  if (!Array.isArray(data.history)) data.history = []
  if (!data.history.includes(today)) data.history.push(today)
  data.history = data.history.slice(-30)
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('챌린지 스트릭 저장 실패:', e)
  }
  return { count: data.count, best: data.best, isNewRecord: data.count > prevBest, milestone: milestoneFor(data.count) }
}

/**
 * 챌린지 완료 연속일 조회. 오늘/어제 완료분만 유효, 그 외 0.
 * @returns {{ count:number, best:number, doneToday:boolean, milestone:number|null }}
 */
export function getChallengeStreak() {
  const data = loadStreak()
  const doneToday = data.lastDone === dayKey()
  const active = doneToday || data.lastDone === yesterdayKey()
  return { count: active ? data.count : 0, best: data.best, doneToday, milestone: doneToday ? milestoneFor(data.count) : null }
}

/**
 * 최근 30일 챌린지 완료 횟수 (history는 최근 30일만 보관).
 */
export function getChallenge30DayCount() {
  const data = loadStreak()
  return Array.isArray(data.history) ? data.history.length : 0
}

/**
 * 최근 7일(오늘 포함, 과거→오늘 순) 챌린지 완료 여부.
 * @returns {{ date:string, done:boolean }[]}
 */
export function getLast7Days() {
  const data = loadStreak()
  const history = Array.isArray(data.history) ? data.history : []
  const days = []
  for (let i = 6; i >= 0; i--) {
    const key = formatDate(new Date(Date.now() - i * 86400000))
    days.push({ date: key, done: history.includes(key) })
  }
  return days
}
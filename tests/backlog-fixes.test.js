import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

// ─── BK-01: Leaderboard gameId 불일치 ───
describe('BK-01: DrawTracePage game-id matches DrawGame addScore gameId', () => {
  const drawTracePage = fs.readFileSync(
    path.resolve('src/views/DrawTracePage.vue'), 'utf-8'
  )
  const drawGame = fs.readFileSync(
    path.resolve('src/components/DrawGame.vue'), 'utf-8'
  )

  it('DrawTracePage의 game-id와 DrawGame의 addScore gameId가 같아야 한다', () => {
    // Page에서 설정한 game-id 추출
    const gameIdMatch = drawTracePage.match(/game-id="([^"]+)"/)
    expect(gameIdMatch).not.toBeNull()
    const pageGameId = gameIdMatch[1]

    // DrawGame에서 addScore에 전달하는 gameId 추출
    const addScoreMatch = drawGame.match(/addScore\(\{[^}]*gameId:\s*'([^']+)'/)
    expect(addScoreMatch).not.toBeNull()
    const addGameId = addScoreMatch[1]

    expect(pageGameId).toBe(addGameId)
  })
})

// ─── BK-02: 공유 모달에 항상 0점 표시 ───
describe('BK-02: DrawTracePage onScore updates shareData.score', () => {
  const drawTracePage = fs.readFileSync(
    path.resolve('src/views/DrawTracePage.vue'), 'utf-8'
  )

  it('onScore 함수가 shareData.score를 업데이트해야 한다', () => {
    // onScore 함수 내에서 shareData.score 할당 여부 확인
    const onScoreMatch = drawTracePage.match(/function onScore[\s\S]*?\n\}/)
    if (!onScoreMatch) {
      // const onScore = () => {} 형식도 허용
      const constMatch = drawTracePage.match(/onScore\s*=\s*[\s\S]*?\n\}/)
      expect(constMatch).not.toBeNull()
      expect(constMatch[0]).toMatch(/shareData\.score\s*=/)
      return
    }
    expect(onScoreMatch).not.toBeNull()
    
    const onScoreBody = onScoreMatch[0]
    expect(onScoreBody).toMatch(/shareData\.score\s*=/)
  })
})

// ─── BK-03: BrickBreakerPage에 Leaderboard 누락 ───
describe('BK-03: BrickBreakerPage includes Leaderboard component', () => {
  const brickPage = fs.readFileSync(
    path.resolve('src/views/BrickBreakerPage.vue'), 'utf-8'
  )

  it('BrickBreakerPage에 Leaderboard 컴포넌트가 있어야 한다', () => {
    expect(brickPage).toMatch(/<Leaderboard/)
  })

  it('BrickBreakerPage에 Leaderboard import가 있어야 한다', () => {
    expect(brickPage).toMatch(/import.*Leaderboard/)
  })
})

// ─── BK-06: JSON.parse 예외 처리 ───
describe('BK-06: leaderboard.js getLeaderboard has try-catch', () => {
  const leaderboardCode = fs.readFileSync(
    path.resolve('src/lib/leaderboard.js'), 'utf-8'
  )

  it('getLeaderboard 함수에 try-catch가 있어야 한다', () => {
    // getLeaderboard 함수 본문에서 try-catch 확인
    const fnMatch = leaderboardCode.match(
      /export function getLeaderboard[\s\S]*?\n\}/
    )
    expect(fnMatch).not.toBeNull()
    expect(fnMatch[0]).toMatch(/\btry\b/)
    expect(fnMatch[0]).toMatch(/\bcatch\b/)
  })
})

// ─── BK-07: 라우터 404 처리 ───
describe('BK-07: Router has catch-all 404 route', () => {
  const routerCode = fs.readFileSync(
    path.resolve('src/router/index.js'), 'utf-8'
  )

  it('catch-all 라우트가 있어야 한다', () => {
    expect(routerCode).toMatch(/pathMatch|catchAll|\.\*\)/)
  })
})

// ─── BK-09: highScore 이중 관리 ───
describe('BK-09: DrawGame uses leaderboard for highScore (no separate localStorage)', () => {
  const drawGame = fs.readFileSync(
    path.resolve('src/components/DrawGame.vue'), 'utf-8'
  )

  it('drawtrace-highscore 키를 직접 사용하지 않아야 한다', () => {
    // 이 테스트는 수정 후 통과해야 함
    expect(drawGame).not.toMatch(/drawtrace-highscore/)
  })
})

// ─── BK-14: 수평 각도 최소 수직 속도 보장 ───
describe('BK-14: BrickBreaker ensures minimum vertical ball speed', () => {
  const brickGame = fs.readFileSync(
    path.resolve('src/components/BrickBreakerGame.vue'), 'utf-8'
  )

  it('패들 충돌 후 MIN_DY 최소값 보장 로직이 있어야 한다', () => {
    expect(brickGame).toMatch(/const MIN_DY/)
    expect(brickGame).toMatch(/Math\.abs\(ball\.dy\)\s*<\s*MIN_DY/)
  })
})

// ─── BK-16: scorer.js downsample 거리 캐싱 ───
describe('BK-16: scorer.js downsample caches distance', () => {
  const scorerCode = fs.readFileSync(
    path.resolve('src/lib/scorer.js'), 'utf-8'
  )

  it('downsample 함수에서 dist()가 루프 내에서 중복 호출되지 않아야 한다', () => {
    const downsampleMatch = scorerCode.match(
      /function downsample[\s\S]*?\n\}/
    )
    expect(downsampleMatch).not.toBeNull()
    
    const body = downsampleMatch[0]
    // 수정 후에는 dist(points[i-1], points[i])가 변수에 할당되어야 함
    const distCalls = body.match(/dist\(points\[i\s*-\s*1\],\s*points\[i\]\)/g)
    // 수정 후에는 1번만 호출되어야 함 (변수에 캐시)
    expect(distCalls?.length || 0).toBeLessThanOrEqual(1)
  })
})

// ─── BK-17: share.js BASE_URL 하드코딩 ───
describe('BK-17: share.js BASE_URL uses env variable', () => {
  const shareCode = fs.readFileSync(
    path.resolve('src/lib/share.js'), 'utf-8'
  )

  it('BASE_URL이 하드코딩되지 않아야 한다', () => {
    expect(shareCode).not.toMatch(/const BASE_URL\s*=\s*'https:\/\/game\.nutalk\.co\.kr'/)
  })

  it('import.meta.env 또는 window.location.origin을 사용해야 한다', () => {
    expect(shareCode).toMatch(/import\.meta\.env|window\.location\.origin/)
  })
})

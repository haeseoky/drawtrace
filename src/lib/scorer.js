/**
 * 경로 유사도 채점 엔진 v2
 * - 시작점 정렬 (회전) 추가
 * - 임계값 완화
 * - 크기 패널티 수정
 */

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

/**
 * 경로를 N개 등간격 포인트로 리샘플링
 */
export function resamplePath(points, n = 128) {
  if (points.length < 2) return points

  const src = points.map(p => ({ ...p }))

  // 총 경로 길이
  let totalLen = 0
  for (let i = 1; i < src.length; i++) {
    totalLen += dist(src[i - 1], src[i])
  }
  if (totalLen === 0) return src.slice(0, n)

  const interval = totalLen / (n - 1)
  const resampled = [{ ...src[0] }]
  let accum = 0

  let i = 1
  while (i < src.length && resampled.length < n) {
    const d = dist(src[i - 1], src[i])
    if (d === 0) { i++; continue }

    if (accum + d >= interval) {
      const ratio = (interval - accum) / d
      const newPt = {
        x: src[i - 1].x + ratio * (src[i].x - src[i - 1].x),
        y: src[i - 1].y + ratio * (src[i].y - src[i - 1].y),
      }
      resampled.push(newPt)
      src.splice(i, 0, newPt)
      accum = 0
    } else {
      accum += d
      i++
    }
  }

  while (resampled.length < n) {
    resampled.push({ ...src[src.length - 1] })
  }

  return resampled
}

/**
 * 바운딩박스 → 단위 정사각형 정규화
 */
export function normalizePath(points) {
  if (points.length === 0) return points

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }

  const w = maxX - minX || 1
  const h = maxY - minY || 1

  return points.map(p => ({
    x: (p.x - minX) / w,
    y: (p.y - minY) / h,
  }))
}

/**
 * 경로를 offset만큼 회전시킨 복사본 반환
 */
function rotatePath(points, offset) {
  const n = points.length
  const result = new Array(n)
  for (let i = 0; i < n; i++) {
    result[i] = points[(i + offset) % n]
  }
  return result
}

/**
 * 사용자 경로의 시작점에 가장 가까운 타겟 인덱스 찾기
 */
function findNearestIndex(target, userStart) {
  let minD = Infinity, idx = 0
  for (let i = 0; i < target.length; i++) {
    const d = dist(target[i], userStart)
    if (d < minD) { minD = d; idx = i }
  }
  return idx
}

/**
 * 이산 Fréchet Distance
 */
export function frechetDistance(p, q) {
  const n = p.length
  const m = q.length
  const dp = Array.from({ length: n }, () => new Float64Array(m).fill(-1))

  function solve(i, j) {
    if (dp[i][j] >= 0) return dp[i][j]

    const d = dist(p[i], q[j])

    if (i === 0 && j === 0) {
      dp[i][j] = d
    } else if (i === 0) {
      dp[i][j] = Math.max(solve(0, j - 1), d)
    } else if (j === 0) {
      dp[i][j] = Math.max(solve(i - 1, 0), d)
    } else {
      dp[i][j] = Math.max(
        Math.min(solve(i - 1, j), solve(i, j - 1), solve(i - 1, j - 1)),
        d
      )
    }

    return dp[i][j]
  }

  return solve(n - 1, m - 1)
}

/**
 * 평균 최근접 거리
 */
export function avgNearestDistance(userPts, targetPts) {
  let total = 0
  for (const p of userPts) {
    let minD = Infinity
    for (const q of targetPts) {
      const d = dist(p, q)
      if (d < minD) minD = d
    }
    total += minD
  }
  return total / userPts.length
}

/**
 * 최종 점수 계산 (0~100)
 */
export function calculateScore(userPath, targetPath, canvasSize = { width: 1, height: 1 }) {
  if (userPath.length < 5 || targetPath.length < 5) {
    return { score: 0, accuracy: 0, details: '경로가 너무 짧습니다' }
  }

  // 1. 리샘플링
  const N = 64
  const userResampled = resamplePath(userPath.map(p => ({ ...p })), N)
  const targetResampled = resamplePath(targetPath.map(p => ({ ...p })), N)

  // 2. 정규화
  const userNorm = normalizePath(userResampled)
  const targetNorm = normalizePath(targetResampled)

  // 3. 시작점 정렬 — 사용자 시작점에 가장 가까운 타겟 인덱스에서 회전
  const bestOffset = findNearestIndex(targetNorm, userNorm[0])
  const targetAligned = rotatePath(targetNorm, bestOffset)

  // 4. 추가: 근처 오프셋 몇 개도 시도해서 최적 찾기
  let bestScore = 0
  let bestMetrics = null

  const offsetsToTry = [0, -2, -1, 1, 2, Math.floor(N/4), Math.floor(N/2), Math.floor(3*N/4)]

  for (const extraOffset of offsetsToTry) {
    const offset = (bestOffset + extraOffset + N) % N
    const tRotated = rotatePath(targetNorm, offset)

    const fDist = frechetDistance(userNorm, tRotated)
    const avgDist = avgNearestDistance(userNorm, tRotated)

    // 임계값 완화: 정규화 공간(0~1)에서 합리적인 범위
    const frechetScore = Math.max(0, 1 - fDist / 1.2) * 100
    const avgScore = Math.max(0, 1 - avgDist / 0.5) * 100
    const raw = frechetScore * 0.5 + avgScore * 0.5

    if (raw > bestScore) {
      bestScore = raw
      bestMetrics = { fDist, avgDist, frechetScore, avgScore }
    }
  }

  // 5. 크기 패널티 (수정: 작은 순서대로 체크)
  let userMinX = Infinity, userMaxX = -Infinity, userMinY = Infinity, userMaxY = -Infinity
  for (const p of userPath) {
    userMinX = Math.min(userMinX, p.x)
    userMaxX = Math.max(userMaxX, p.x)
    userMinY = Math.min(userMinY, p.y)
    userMaxY = Math.max(userMaxY, p.y)
  }
  const userArea = (userMaxX - userMinX) * (userMaxY - userMinY)
  const canvasArea = canvasSize.width * canvasSize.height
  const areaRatio = userArea / canvasArea

  // 고쳐진 순서: 더 작은 값(0.05)을 먼저 체크
  const sizePenalty = areaRatio < 0.05 ? 0.5 : areaRatio < 0.1 ? 0.75 : 1.0

  const finalScore = Math.round(Math.min(100, bestScore * sizePenalty))

  return {
    score: finalScore,
    accuracy: Math.round(bestScore),
    details: {
      frechetDistance: bestMetrics.fDist.toFixed(4),
      avgNearestDistance: bestMetrics.avgDist.toFixed(4),
      frechetScore: Math.round(bestMetrics.frechetScore),
      avgScore: Math.round(bestMetrics.avgScore),
      sizePenalty,
      areaRatio: (areaRatio * 100).toFixed(1) + '%',
    }
  }
}

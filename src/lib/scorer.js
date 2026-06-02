/**
 * 경로 유사도 채점 엔진 v3
 *
 * 핵심 원칙:
 * 1. 위치 기반 채점 — 정규화 없이 원본 픽셀 좌표에서 직접 비교
 * 2. 방향/순서 고려 — 시작점 불일치 시 감점
 * 3. 크기 비교 — 타겟 대비 사용자 도형 크기 차이 반영
 * 4. 형태 일치도 — 픽셀 레벨 오버랩 기반
 */

// ─── 유틸리티 ───

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function getBBox(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY, w: maxX - minX || 1, h: maxY - minY || 1 }
}

function getCenter(points) {
  const bb = getBBox(points)
  return { x: bb.minX + bb.w / 2, y: bb.minY + bb.h / 2 }
}

function getPathLength(points) {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    len += dist(points[i - 1], points[i])
  }
  return len
}

// ─── 점수 구성요소 ───

/**
 * 1. 형태 점수 (Shape Score) — 0~100
 * 사용자 경로의 각 점에서 타겟 경로까지의 최소 거리를 계산.
 * 정규화 없이 원본 픽셀 좌표를 사용하되, 두 도형의 중심을 맞춤.
 * 크기가 다르면 거리가 멀어져 자동으로 감점.
 */
function calcShapeScore(userPts, targetPts) {
  // 중심 정렬
  const uCenter = getCenter(userPts)
  const tCenter = getCenter(targetPts)
  const dx = tCenter.x - uCenter.x
  const dy = tCenter.y - uCenter.y

  const aligned = userPts.map(p => ({ x: p.x + dx, y: p.y + dy }))

  // 타겟 바운딩박스 대각선을 기준 거리로 사용
  const tBB = getBBox(targetPts)
  const refDist = Math.sqrt(tBB.w ** 2 + tBB.h ** 2)

  // 각 사용자 점에서 타겟 최근접 거리
  let totalDist = 0
  for (const p of aligned) {
    let minD = Infinity
    for (const q of targetPts) {
      const d = dist(p, q)
      if (d < minD) minD = d
    }
    totalDist += minD
  }
  const avgDist = totalDist / aligned.length

  // 타겟 크기 대비 평균 거리 비율 → 점수
  const ratio = avgDist / refDist
  return Math.max(0, Math.min(100, (1 - ratio * 3) * 100))
}

/**
 * 2. 크기 점수 (Size Score) — 0~100
 * 사용자 도형과 타겟 도형의 바운딩박스 크기 비교.
 * 면적 비율 + 가로세로 비율 모두 고려.
 */
function calcSizeScore(userPts, targetPts) {
  const uBB = getBBox(userPts)
  const tBB = getBBox(targetPts)

  // 면적 비율
  const uArea = uBB.w * uBB.h
  const tArea = tBB.w * tBB.h
  const areaRatio = uArea / tArea

  // 1.0이 완벽, 면적 비율이 0.5~2.0 사이면 어느 정도 인정
  // log 스케일로 부드럽게 감점
  const areaScore = Math.max(0, 1 - Math.abs(Math.log(areaRatio)) * 1.5) * 100

  // 가로세로 비율 (aspect ratio)
  const uAR = uBB.w / uBB.h
  const tAR = tBB.w / tBB.h
  const arDiff = Math.abs(uAR - tAR) / Math.max(uAR, tAR)
  const arScore = Math.max(0, 1 - arDiff * 3) * 100

  return areaScore * 0.6 + arScore * 0.4
}

/**
 * 3. 위치 점수 (Position Score) — 0~100
 * 두 도형의 중심이 얼마나 가까운지.
 * 타겟 크기 대비 중심 거리.
 */
function calcPositionScore(userPts, targetPts) {
  const uCenter = getCenter(userPts)
  const tCenter = getCenter(targetPts)
  const centerDist = dist(uCenter, tCenter)

  const tBB = getBBox(targetPts)
  const refDist = Math.sqrt(tBB.w ** 2 + tBB.h ** 2)

  const ratio = centerDist / refDist
  return Math.max(0, Math.min(100, (1 - ratio * 2) * 100))
}

/**
 * 4. 방향 점수 (Direction Score) — 0~100
 * 시작점 위치가 얼마나 타겟의 시작점과 가까운지.
 * 타겟 경로 길이 대비 시작점 거리.
 */
function calcDirectionScore(userPts, targetPts) {
  if (userPts.length < 2 || targetPts.length < 2) return 50

  const startDist = dist(userPts[0], targetPts[0])

  // 끝점 vs 시작점 거리도 비교 (뒤집어 그렸는지)
  const endDist = dist(userPts[0], targetPts[targetPts.length - 1])

  const tBB = getBBox(targetPts)
  const refDist = Math.sqrt(tBB.w ** 2 + tBB.h ** 2)

  // 시작점이 더 가까우면 정방향, 끝점이 더 가까우면 역방향
  const bestDist = Math.min(startDist, endDist)
  const isReverse = endDist < startDist

  const ratio = bestDist / refDist
  const posScore = Math.max(0, Math.min(100, (1 - ratio * 2) * 100))

  // 역방향이면 감점
  const reversePenalty = isReverse ? 0.7 : 1.0

  // 진행 방향 벡터 비교 (초기 5개 포인트의 방향)
  const uDir = {
    x: (userPts[Math.min(4, userPts.length - 1)].x - userPts[0].x),
    y: (userPts[Math.min(4, userPts.length - 1)].y - userPts[0].y),
  }
  const tDir = {
    x: (targetPts[Math.min(4, targetPts.length - 1)].x - targetPts[0].x),
    y: (targetPts[Math.min(4, targetPts.length - 1)].y - targetPts[0].y),
  }
  const uLen = Math.sqrt(uDir.x ** 2 + uDir.y ** 2) || 1
  const tLen = Math.sqrt(tDir.x ** 2 + tDir.y ** 2) || 1

  // 코사인 유사도
  const cos = (uDir.x * tDir.x + uDir.y * tDir.y) / (uLen * tLen)
  const dirSimilarity = Math.max(0, cos) // -1~1 → 0~1 (음수=반대방향=0)

  return posScore * 0.4 * reversePenalty + dirSimilarity * 100 * 0.6
}

/**
 * 5. 커버리지 점수 (Coverage Score) — 0~100
 * 타겟 도형을 얼마나 따라 그렸는지.
 * 타겟 경로에서 사용자 경로까지의 최근접 거리 평균 (역방향).
 */
function calcCoverageScore(userPts, targetPts) {
  // 중심 정렬
  const uCenter = getCenter(userPts)
  const tCenter = getCenter(targetPts)
  const dx = tCenter.x - uCenter.x
  const dy = tCenter.y - uCenter.y
  const aligned = userPts.map(p => ({ x: p.x + dx, y: p.y + dy }))

  const tBB = getBBox(targetPts)
  const refDist = Math.sqrt(tBB.w ** 2 + tBB.h ** 2)

  // 타겟 → 사용자 방향 (역방향 최근접)
  let totalDist = 0
  for (const t of targetPts) {
    let minD = Infinity
    for (const u of aligned) {
      const d = dist(t, u)
      if (d < minD) minD = d
    }
    totalDist += minD
  }
  const avgDist = totalDist / targetPts.length

  const ratio = avgDist / refDist
  return Math.max(0, Math.min(100, (1 - ratio * 3) * 100))
}

/**
 * 6. 최소 크기 필터 (Minimum Size)
 * 너무 작게 그리면 0점 처리
 */
function calcMinSizePenalty(userPts, canvasSize) {
  const bb = getBBox(userPts)
  const canvasDiag = Math.sqrt(canvasSize.width ** 2 + canvasSize.height ** 2)
  const userDiag = Math.sqrt(bb.w ** 2 + bb.h ** 2)
  const ratio = userDiag / canvasDiag

  if (ratio < 0.05) return 0     // 5% 미만: 0점
  if (ratio < 0.1) return 0.5    // 5~10%: 50% 점수
  if (ratio < 0.15) return 0.75  // 10~15%: 75% 점수
  return 1.0                      // 15% 이상: 패널티 없음
}

// ─── 메인 점수 계산 ───

/**
 * 최종 점수 계산 (0~100)
 *
 * 가중치:
 * - 형태 (Shape):    35% — 모양이 얼마나 비슷한가
 * - 크기 (Size):     20% — 크기가 적절한가
 * - 커버리지:        25% — 타겟 경로를 잘 따라갔는가
 * - 방향 (Direction): 10% — 시작점과 진행방향이 맞는가
 * - 위치 (Position):  10% — 도형 위치가 맞는가
 */
export function calculateScore(userPath, targetPath, canvasSize = { width: 1, height: 1 }) {
  if (userPath.length < 5 || targetPath.length < 5) {
    return { score: 0, accuracy: 0, details: '경로가 너무 짧습니다' }
  }

  const shapeScore = calcShapeScore(userPath, targetPath)
  const sizeScore = calcSizeScore(userPath, targetPath)
  const positionScore = calcPositionScore(userPath, targetPath)
  const directionScore = calcDirectionScore(userPath, targetPath)
  const coverageScore = calcCoverageScore(userPath, targetPath)
  const minSizePenalty = calcMinSizePenalty(userPath, canvasSize)

  // 가중 합산
  const rawScore =
    shapeScore * 0.35 +
    sizeScore * 0.20 +
    coverageScore * 0.25 +
    directionScore * 0.10 +
    positionScore * 0.10

  // 최소 크기 패널티 적용
  const finalScore = Math.round(Math.min(100, rawScore * minSizePenalty))

  return {
    score: finalScore,
    accuracy: Math.round(rawScore),
    details: {
      shape: Math.round(shapeScore),
      size: Math.round(sizeScore),
      coverage: Math.round(coverageScore),
      direction: Math.round(directionScore),
      position: Math.round(positionScore),
      minSizePenalty,
    }
  }
}



/**
 * 타겟 도형 데이터
 * 각 도형은 Canvas 중앙 기준 정규화된 좌표 (0~1)로 정의
 * 실제 렌더링 시 캔버스 크기에 맞게 스케일링
 */

/**
 * 다각형 정점 배열을 등간격 보간 포인트로 변환 (닫힌 경로)
 * 다각형 도형(triangle, square, hexagon 등)의 공통 로직 추출
 */
function interpolatePolygon(vertices, stepsPerEdge = 25) {
  const pts = []
  const n = vertices.length
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n
    for (let s = 0; s < stepsPerEdge; s++) {
      const t = s / stepsPerEdge
      pts.push({
        x: vertices[i].x + t * (vertices[next].x - vertices[i].x),
        y: vertices[i].y + t * (vertices[next].y - vertices[i].y),
      })
    }
  }
  pts.push({ ...pts[0] })
  return pts
}

/**
 * 정다각형 정점 생성 헬퍼
 */
function regularPolygon(cx, cy, size, sides, startAngle = -Math.PI / 2) {
  const vertices = []
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 + startAngle
    vertices.push({
      x: cx + Math.cos(angle) * size,
      y: cy + Math.sin(angle) * size,
    })
  }
  return vertices
}

export const shapes = [
  {
    id: 'circle',
    name: '원',
    difficulty: 1,
    generatePoints(cx, cy, size) {
      const pts = []
      const n = 80
      for (let i = 0; i <= n; i++) {
        const angle = (i / n) * Math.PI * 2
        pts.push({
          x: cx + Math.cos(angle) * size,
          y: cy + Math.sin(angle) * size,
        })
      }
      return pts
    }
  },
  {
    id: 'triangle',
    name: '삼각형',
    difficulty: 1,
    generatePoints(cx, cy, size) {
      return interpolatePolygon(regularPolygon(cx, cy, size, 3), 25)
    }
  },
  {
    id: 'square',
    name: '사각형',
    difficulty: 1,
    generatePoints(cx, cy, size) {
      const s = size * 0.85
      const corners = [
        { x: cx - s, y: cy - s },
        { x: cx + s, y: cy - s },
        { x: cx + s, y: cy + s },
        { x: cx - s, y: cy + s },
      ]
      return interpolatePolygon(corners, 25)
    }
  },
  {
    id: 'star',
    name: '별',
    difficulty: 2,
    generatePoints(cx, cy, size) {
      const vertices = []
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 - Math.PI / 2
        const r = i % 2 === 0 ? size : size * 0.45
        vertices.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        })
      }
      return interpolatePolygon(vertices, 8)
    }
  },
  {
    id: 'heart',
    name: '하트',
    difficulty: 2,
    generatePoints(cx, cy, size) {
      const pts = []
      const n = 80
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * Math.PI * 2
        // 하트 파라메트릭 방정식
        const x = 16 * Math.sin(t) ** 3
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
        pts.push({
          x: cx + x * (size / 18),
          y: cy + y * (size / 18),
        })
      }
      return pts
    }
  },
  {
    id: 'diamond',
    name: '다이아몬드',
    difficulty: 2,
    generatePoints(cx, cy, size) {
      const vertices = [
        { x: cx, y: cy - size },
        { x: cx + size * 0.7, y: cy },
        { x: cx, y: cy + size },
        { x: cx - size * 0.7, y: cy },
      ]
      return interpolatePolygon(vertices, 25)
    }
  },
  {
    id: 'hexagon',
    name: '육각형',
    difficulty: 2,
    generatePoints(cx, cy, size) {
      return interpolatePolygon(regularPolygon(cx, cy, size, 6, -Math.PI / 6), 15)
    }
  },
  {
    id: 'infinity',
    name: '무한대',
    difficulty: 3,
    generatePoints(cx, cy, size) {
      const pts = []
      const n = 100
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * Math.PI * 2
        const x = Math.cos(t) / (1 + Math.sin(t) ** 2)
        const y = Math.sin(t) * Math.cos(t) / (1 + Math.sin(t) ** 2)
        pts.push({
          x: cx + x * size * 1.5,
          y: cy + y * size * 1.5,
        })
      }
      return pts
    }
  },
  {
    id: 'pentagon',
    name: '오각형',
    difficulty: 2,
    generatePoints(cx, cy, size) {
      return interpolatePolygon(regularPolygon(cx, cy, size, 5), 18)
    }
  },
  {
    id: 'cross',
    name: '십자가',
    difficulty: 3,
    generatePoints(cx, cy, size) {
      const w = size * 0.35
      const corners = [
        { x: cx - w, y: cy - size },
        { x: cx + w, y: cy - size },
        { x: cx + w, y: cy - w },
        { x: cx + size, y: cy - w },
        { x: cx + size, y: cy + w },
        { x: cx + w, y: cy + w },
        { x: cx + w, y: cy + size },
        { x: cx - w, y: cy + size },
        { x: cx - w, y: cy + w },
        { x: cx - size, y: cy + w },
        { x: cx - size, y: cy - w },
        { x: cx - w, y: cy - w },
      ]
      return interpolatePolygon(corners, 8)
    }
  },
  {
    id: 'arrow',
    name: '화살표',
    difficulty: 3,
    generatePoints(cx, cy, size) {
      const vertices = [
        { x: cx + size, y: cy },
        { x: cx + size * 0.3, y: cy - size * 0.7 },
        { x: cx + size * 0.3, y: cy - size * 0.3 },
        { x: cx - size, y: cy - size * 0.3 },
        { x: cx - size, y: cy + size * 0.3 },
        { x: cx + size * 0.3, y: cy + size * 0.3 },
        { x: cx + size * 0.3, y: cy + size * 0.7 },
      ]
      return interpolatePolygon(vertices, 12)
    }
  },
  {
    id: 'spiral',
    name: '나선',
    difficulty: 3,
    generatePoints(cx, cy, size) {
      const pts = []
      const n = 120
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const angle = t * Math.PI * 4
        const r = size * t
        pts.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        })
      }
      return pts
    }
  },
  {
    id: 'lightning',
    name: '번개',
    difficulty: 2,
    generatePoints(cx, cy, size) {
      const vertices = [
        { x: cx - size * 0.3, y: cy - size },
        { x: cx + size * 0.2, y: cy - size * 0.3 },
        { x: cx - size * 0.1, y: cy - size * 0.3 },
        { x: cx + size * 0.4, y: cy + size * 0.5 },
        { x: cx + size * 0.1, y: cy + size * 0.5 },
        { x: cx + size * 0.5, y: cy + size },
      ]
      return interpolatePolygon(vertices, 10)
    }
  },
  {
    id: 'crescent',
    name: '초승달',
    difficulty: 2,
    generatePoints(cx, cy, size) {
      const pts = []
      const n = 80
      for (let i = 0; i <= n; i++) {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2
        // 외곽 원
        const x1 = Math.cos(angle) * size
        const y1 = Math.sin(angle) * size
        // 내부 원 (offset)
        const offsetX = size * 0.4
        const x2 = Math.cos(angle) * (size * 0.6) + offsetX
        const y2 = Math.sin(angle) * (size * 0.6)
        // 상반부는 외곽, 하반부는 내곽
        pts.push({
          x: cx + (y1 < 0 ? x1 : x2),
          y: cy + (y1 < 0 ? y1 : y2),
        })
      }
      return pts
    }
  },
  {
    id: 'zigzag',
    name: '지그재그',
    difficulty: 2,
    generatePoints(cx, cy, size) {
      const pts = []
      const peaks = 5
      const width = size * 2
      const height = size * 0.6
      for (let i = 0; i <= peaks * 10; i++) {
        const t = i / (peaks * 10)
        const x = cx - width / 2 + t * width
        const peakIndex = Math.floor(t * peaks)
        const peakT = (t * peaks) - peakIndex
        const y = cy + (peakT < 0.5 ? -height / 2 : height / 2)
        pts.push({ x, y })
      }
      return pts
    }
  },
  {
    id: 'wave',
    name: '파도',
    difficulty: 2,
    generatePoints(cx, cy, size) {
      const pts = []
      const cycles = 2
      const n = 80
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const x = cx - size + t * size * 2
        const y = cy + Math.sin(t * Math.PI * 2 * cycles) * size * 0.4
        pts.push({ x, y })
      }
      return pts
    }
  },
  {
    id: 'treble',
    name: '음표',
    difficulty: 3,
    generatePoints(cx, cy, size) {
      const pts = []
      const n = 120
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const angle = t * Math.PI * 2.5 - Math.PI / 2
        const r = size * (0.3 + 0.7 * t)
        const x = Math.cos(angle) * r
        const y = Math.sin(angle) * r - size * 0.5 * t
        pts.push({ x: cx + x, y: cy + y })
      }
      return pts
    }
  }
]

export function getRandomShape(difficulty = 1) {
  // 요청 난이도 도형을 우선 출현 (70%), 하위 난이도는 보조 (30%)
  const exact = shapes.filter(s => s.difficulty === difficulty)
  const lower = shapes.filter(s => s.difficulty < difficulty)
  
  if (Math.random() < 0.7 && exact.length > 0) {
    return exact[Math.floor(Math.random() * exact.length)]
  }
  const pool = lower.length > 0 ? [...lower, ...exact] : exact
  if (pool.length === 0) return shapes[0]
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getShapeById(id) {
  return shapes.find(s => s.id === id)
}
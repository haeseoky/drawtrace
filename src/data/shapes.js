/**
 * 타겟 도형 데이터
 * 각 도형은 Canvas 중앙 기준 정규화된 좌표 (0~1)로 정의
 * 실제 렌더링 시 캔버스 크기에 맞게 스케일링
 */

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
      const pts = []
      const vertices = []
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 - Math.PI / 2
        vertices.push({
          x: cx + Math.cos(angle) * size,
          y: cy + Math.sin(angle) * size,
        })
      }
      // 각 변을 부드럽게 보간
      for (let i = 0; i < 3; i++) {
        const next = (i + 1) % 3
        const steps = 25
        for (let s = 0; s < steps; s++) {
          const t = s / steps
          pts.push({
            x: vertices[i].x + t * (vertices[next].x - vertices[i].x),
            y: vertices[i].y + t * (vertices[next].y - vertices[i].y),
          })
        }
      }
      pts.push({ ...pts[0] })
      return pts
    }
  },
  {
    id: 'square',
    name: '사각형',
    difficulty: 1,
    generatePoints(cx, cy, size) {
      const pts = []
      const s = size * 0.85
      const corners = [
        { x: cx - s, y: cy - s },
        { x: cx + s, y: cy - s },
        { x: cx + s, y: cy + s },
        { x: cx - s, y: cy + s },
      ]
      for (let i = 0; i < 4; i++) {
        const next = (i + 1) % 4
        const steps = 25
        for (let s = 0; s < steps; s++) {
          const t = s / steps
          pts.push({
            x: corners[i].x + t * (corners[next].x - corners[i].x),
            y: corners[i].y + t * (corners[next].y - corners[i].y),
          })
        }
      }
      pts.push({ ...pts[0] })
      return pts
    }
  },
  {
    id: 'star',
    name: '별',
    difficulty: 2,
    generatePoints(cx, cy, size) {
      const pts = []
      const vertices = []
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 - Math.PI / 2
        const r = i % 2 === 0 ? size : size * 0.45
        vertices.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        })
      }
      for (let i = 0; i < 10; i++) {
        const next = (i + 1) % 10
        const steps = 8
        for (let s = 0; s < steps; s++) {
          const t = s / steps
          pts.push({
            x: vertices[i].x + t * (vertices[next].x - vertices[i].x),
            y: vertices[i].y + t * (vertices[next].y - vertices[i].y),
          })
        }
      }
      pts.push({ ...pts[0] })
      return pts
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
      const pts = []
      const vertices = [
        { x: cx, y: cy - size },
        { x: cx + size * 0.7, y: cy },
        { x: cx, y: cy + size },
        { x: cx - size * 0.7, y: cy },
      ]
      for (let i = 0; i < 4; i++) {
        const next = (i + 1) % 4
        const steps = 25
        for (let s = 0; s < steps; s++) {
          const t = s / steps
          pts.push({
            x: vertices[i].x + t * (vertices[next].x - vertices[i].x),
            y: vertices[i].y + t * (vertices[next].y - vertices[i].y),
          })
        }
      }
      pts.push({ ...pts[0] })
      return pts
    }
  },
  {
    id: 'hexagon',
    name: '육각형',
    difficulty: 2,
    generatePoints(cx, cy, size) {
      const pts = []
      const vertices = []
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 6
        vertices.push({
          x: cx + Math.cos(angle) * size,
          y: cy + Math.sin(angle) * size,
        })
      }
      for (let i = 0; i < 6; i++) {
        const next = (i + 1) % 6
        const steps = 15
        for (let s = 0; s < steps; s++) {
          const t = s / steps
          pts.push({
            x: vertices[i].x + t * (vertices[next].x - vertices[i].x),
            y: vertices[i].y + t * (vertices[next].y - vertices[i].y),
          })
        }
      }
      pts.push({ ...pts[0] })
      return pts
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
      const pts = []
      const vertices = []
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
        vertices.push({
          x: cx + Math.cos(angle) * size,
          y: cy + Math.sin(angle) * size,
        })
      }
      for (let i = 0; i < 5; i++) {
        const next = (i + 1) % 5
        const steps = 18
        for (let s = 0; s < steps; s++) {
          const t = s / steps
          pts.push({
            x: vertices[i].x + t * (vertices[next].x - vertices[i].x),
            y: vertices[i].y + t * (vertices[next].y - vertices[i].y),
          })
        }
      }
      pts.push({ ...pts[0] })
      return pts
    }
  },
  {
    id: 'cross',
    name: '십자가',
    difficulty: 3,
    generatePoints(cx, cy, size) {
      const pts = []
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
      for (let i = 0; i < 12; i++) {
        const next = (i + 1) % 12
        const steps = 8
        for (let s = 0; s < steps; s++) {
          const t = s / steps
          pts.push({
            x: corners[i].x + t * (corners[next].x - corners[i].x),
            y: corners[i].y + t * (corners[next].y - corners[i].y),
          })
        }
      }
      pts.push({ ...pts[0] })
      return pts
    }
  },
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

<template>
  <div class="game-wrapper">
    <!-- 헤더 -->
    <header class="game-header">
      <div class="header-left">
        <span class="level-badge">Lv.{{ level }}</span>
        <span class="shape-name">{{ currentShape?.name || '' }}</span>
      </div>
      <div class="header-center">
        <div class="timer" :class="{ urgent: timeLeft <= 5 }">
          <svg viewBox="0 0 40 40" class="timer-ring">
            <circle cx="20" cy="20" r="17" fill="none" stroke="#eee" stroke-width="3" />
            <circle cx="20" cy="20" r="17" fill="none"
              :stroke="timeLeft <= 5 ? '#ef4444' : '#4D9BC6'"
              stroke-width="3"
              stroke-linecap="round"
              :stroke-dasharray="timerCircumference"
              :stroke-dashoffset="timerCircumference * (1 - timeLeft / timeLimit)"
              style="transition: stroke-dashoffset 0.15s linear;"
              transform="rotate(-90 20 20)"
            />
          </svg>
          <span class="timer-text">{{ timeLeft }}s</span>
        </div>
      </div>
      <div class="header-right">
        <span class="best-score">🏆 {{ highScore }}</span>
      </div>
    </header>

    <!-- 게임 화면 -->
    <main class="game-main">
      <canvas
        ref="canvasRef"
        class="game-canvas"
        @touchstart.prevent="onTouchStart"
        @touchmove.prevent="onTouchMove"
        @touchend.prevent="onTouchEnd"
        @touchcancel.prevent="onTouchEnd"
        @mousedown.prevent="onMouseDown"
        @mousemove.prevent="onMouseMove"
        @mouseup.prevent="onMouseUp"
        @mouseleave.prevent="onMouseUp"
        @contextmenu.prevent
      />
    </main>

    <!-- 하단 점수 -->
    <footer class="game-footer">
      <div class="score-display">
        <span class="score-label">SCORE</span>
        <span class="score-value">{{ score }}</span>
      </div>
      <button v-if="gameState === 'idle' || gameState === 'result'" class="btn-start" @click="startGame">
        {{ gameState === 'result' ? `Lv.${level} 도전!` : '시작!' }}
      </button>
      <button v-if="gameState === 'result'" class="btn-share" @click="shareResult">📤 공유</button>
    </footer>

    <!-- 결과 오버레이 -->
    <Transition name="fade">
      <div v-if="gameState === 'result'" class="result-overlay">
        <div class="result-card" :class="resultGrade">
          <div class="result-grade">{{ resultEmoji }} {{ resultGrade.toUpperCase() }}</div>
          <div class="result-score">{{ lastScore.score }}점</div>
          <div class="result-detail">
            <div class="detail-grid">
              <span>형태</span><span>{{ lastScore.details?.shape ?? '-' }}점</span>
              <span>크기</span><span>{{ lastScore.details?.size ?? '-' }}점</span>
              <span>커버리지</span><span>{{ lastScore.details?.coverage ?? '-' }}점</span>
              <span>방향</span><span>{{ lastScore.details?.direction ?? '-' }}점</span>
              <span>위치</span><span>{{ lastScore.details?.position ?? '-' }}점</span>
            </div>
            <button class="btn-retry" @click="startGame">⏱️ {{ level + 1 }}Lv 바로 도전</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 시작 안내 -->
    <Transition name="fade">
      <div v-if="gameState === 'idle'" class="intro-overlay">
        <div class="intro-card">
          <div class="intro-icon">✏️</div>
          <div class="intro-title">Draw Trace</div>
          <div class="intro-desc">보이는 모양을 따라 그리세요!</div>
          <div class="intro-hint">아래 '시작!' 버튼을 눌러주세요</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { calculateScore } from '../lib/scorer.js'
import { getRandomShape } from '../data/shapes.js'
import { addScore, getBestScore } from '../lib/leaderboard.js'
import { shareResult as shareUtil } from '../lib/share.js'

// Refs
const canvasRef = ref(null)
let ctx = null
let canvasW = 0
let canvasH = 0

// Game state
const gameState = ref('idle') // idle | playing | result
const level = ref(1)
const score = ref(0)
const highScore = ref(0)
const timeLeft = ref(10)
const timeLimit = ref(10)
const currentShape = ref(null)
const targetPoints = ref([])

// Drawing state
const isDrawing = ref(false)
const userPath = reactive([])
let animFrameId = null
let drawPending = false
let gridCanvas = null
let timerInterval = null
let gameStartTime = 0 // Date.now 기반 타이머
let isTouchDevice = false // 터치 이벤트 감지 플래그
let isEnding = false // 이중 endGame 방지 가드

// Result
const lastScore = reactive({ score: 0, accuracy: 0, details: {} })

const resultGrade = computed(() => {
  const s = lastScore.score
  if (s >= 90) return 'perfect'
  if (s >= 75) return 'great'
  if (s >= 60) return 'good'
  if (s >= 40) return 'ok'
  return 'miss'
})

const timerCircumference = 2 * Math.PI * 17 // ≈ 106.81

const resultEmoji = computed(() => {
  const map = { perfect: '💎', great: '🌟', good: '👍', ok: '🤔', miss: '😅' }
  return map[resultGrade.value]
})

const emit = defineEmits(['score', 'share'])

// Init
onMounted(() => {
  initCanvas()
  loadHighScore()
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  clearInterval(timerInterval)
  clearTimeout(resizeTimer)
  cancelAnimationFrame(animFrameId)
  window.removeEventListener('resize', onResize)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  if (gridCanvas) {
    gridCanvas.width = 0
    gridCanvas.height = 0
    gridCanvas = null
  }
  ctx = null
})

function onVisibilityChange() {
  if (document.hidden) {
    // 탭 비활성화 시 타이머 일시정지
    clearInterval(timerInterval)
  } else if (gameState.value === 'playing') {
    // 탭 복귀 시 타이머 재시작 — 남은 시간 기준으로 재계산
    clearInterval(timerInterval)
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000)
    const remaining = Math.max(0, timeLimit.value - elapsed)
    timeLeft.value = remaining
    if (remaining <= 0) {
      endGame()
      return
    }
    startTimerLoop()
  }
}

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.parentElement.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1

  canvasW = rect.width
  canvasH = rect.height
  canvas.width = canvasW * dpr
  canvas.height = canvasH * dpr
  canvas.style.width = canvasW + 'px'
  canvas.style.height = canvasH + 'px'

  ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  // 그리드 오프스크린 캔버스 초기화
  buildGridCache()

  if (targetPoints.value.length > 0) {
    requestDraw()
  }
}

let resizeTimer = null
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    initCanvas()
    if (currentShape.value && targetPoints.value.length === 0) {
      generateTarget()
    }
    requestDraw()
  }, 150)
}

// rAF 배칭 — 매 이벤트마다 drawFrame 직접 호출 대신 1프레임에 1회만 렌더링
function requestDraw() {
  if (drawPending) return
  drawPending = true
  animFrameId = requestAnimationFrame(() => {
    drawPending = false
    drawFrame()
  })
}

// Game flow
function startGame() {
  // 이전 타이머 완전 정리 — 예외 발생 방지
  clearInterval(timerInterval)
  timerInterval = null
  isEnding = false

  gameState.value = 'playing'
  // 결과에서 재도전 시 기존 점수 유지하지 않음 — 각 도전은 독립 채점
  if (gameState.value !== 'result' || level.value === 1) {
    score.value = 0
  }
  userPath.length = 0
  timeLeft.value = Math.max(5, 12 - level.value) // 레벨당 1초 감소
  timeLimit.value = timeLeft.value

  // 레벨 진행에 따른 난이도 설정
  const difficulty = Math.min(3, Math.ceil(level.value / 3))
  currentShape.value = getRandomShape(difficulty)
  generateTarget()
  drawFrame()

  // Date.now 기반 타이머 (150ms 간격 — transition과 정렬)
  gameStartTime = Date.now()
  startTimerLoop()
}

function startTimerLoop() {
  clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    if (isEnding) { clearInterval(timerInterval); return }
    const elapsed = (Date.now() - gameStartTime) / 1000
    const remaining = Math.max(0, Math.ceil(timeLimit.value - elapsed))
    timeLeft.value = remaining
    if (remaining <= 0) {
      clearInterval(timerInterval)
      endGame()
    }
  }, 150)
}

function generateTarget() {
  const shape = currentShape.value
  // 레벨 진행에 따른 타겟 크기 조정 — 고레벨에서 약간 작아짐
  const baseRatio = 0.3
  const levelShrink = Math.min(0.08, (level.value - 1) * 0.008) // 레벨당 0.8% 축소
  const size = Math.min(canvasW, canvasH) * (baseRatio - levelShrink)
  targetPoints.value = shape.generatePoints(canvasW / 2, canvasH / 2, Math.max(40, size))
}

function endGame() {
  if (isEnding) return // 이중 호출 방지
  isEnding = true
  clearInterval(timerInterval)
  timerInterval = null
  isDrawing.value = false

  const result = calculateScore(
    [...userPath],
    targetPoints.value,
    { width: canvasW, height: canvasH }
  )

  Object.assign(lastScore, result)
  score.value = result.score

  if (result.score > highScore.value) {
    highScore.value = result.score
    saveHighScore()
  }

  gameState.value = 'result'
  level.value++
  // isEnding은 다음 startGame()에서 리셋 — 타이머 콜백 중복 호출 완전 차단

  addScore({ gameId: 'draw-trace', score: result.score, name: '나', detail: `${currentShape.value?.name} ${result.score}점` })
  emit('score', result)
  drawFrame()
}

// Touch handlers
let lastInputWasTouch = false // 최근 입력 타입 추적 — 터치/마우스 혼합 환경 안정성
let touchStartPos = null // 터치 시작점 추적 — 첫 드로잉 방향 힌트

function getPos(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  if (e.touches) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    }
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function onTouchStart(e) {
  isTouchDevice = true
  lastInputWasTouch = true
  if (gameState.value !== 'playing') return
  isDrawing.value = true
  userPath.length = 0
  const pos = getPos(e)
  touchStartPos = { x: pos.x, y: pos.y } // 시작점 기록
  userPath.push(pos)
  // 햅틱 피드백 (모바일 터치 반응성 향상)
  if (navigator.vibrate) navigator.vibrate(10)
  // 즉시 첫 프레임 드로잉 — rAF 지연 없이 터치 응답성 극대화
  drawFrame()
  requestDraw()
}

function onTouchMove(e) {
  if (!isDrawing.value) return
  const pos = getPos(e)
  // 최소 거리 필터링 — 너무 가까운 포인트 무시 (성능 + 채점 품질)
  if (userPath.length > 0) {
    const last = userPath[userPath.length - 1]
    const dx = pos.x - last.x
    const dy = pos.y - last.y
    if (dx * dx + dy * dy < 9) return // 3px 미만 무시
  }
  userPath.push(pos)
  requestDraw()
}

function onTouchEnd() {
  if (!isDrawing.value) return
  isDrawing.value = false
  touchStartPos = null
  if (gameState.value !== 'playing') return
  // 최소 이동 거리 + 포인트 수 확인 — 터치 지터로 인한 실수 종료 방지
  if (userPath.length >= 5) {
    let pathLen = 0
    for (let i = 1; i < userPath.length; i++) {
      const dx = userPath[i].x - userPath[i - 1].x
      const dy = userPath[i].y - userPath[i - 1].y
      pathLen += Math.sqrt(dx * dx + dy * dy)
    }
    const minLen = Math.min(canvasW, canvasH) * 0.05
    if (pathLen >= minLen) {
      endGame()
    }
  }
}

// Mouse handlers (desktop) — 최근 터치 직후 mouse 이벤트 무시 (터치 기기 mouse 이벤트 중복 방지)
function onMouseDown(e) {
  if (lastInputWasTouch) { lastInputWasTouch = false; return }
  isTouchDevice = false
  onTouchStart(e)
}
function onMouseMove(e) {
  if (isTouchDevice || !isDrawing.value) return
  const pos = getPos(e)
  if (userPath.length > 0) {
    const last = userPath[userPath.length - 1]
    const dx = pos.x - last.x
    const dy = pos.y - last.y
    if (dx * dx + dy * dy < 9) return
  }
  userPath.push(pos)
  requestDraw()
}
function onMouseUp() {
  if (isTouchDevice) return
  onTouchEnd()
}

// Drawing
function drawFrame() {
  if (!ctx) return
  ctx.clearRect(0, 0, canvasW, canvasH)

  // 배경 그리드
  drawGrid()

  // 타겟 도형
  drawTarget()

  // 사용자 경로
  drawUserPath()

  // 결과면 점수 표시
  if (gameState.value === 'result') {
    drawResultOverlay()
  }
}

// 오프스크린 캔버스에 그리드 캐싱 — 리사이즈 시에만 재생성
function buildGridCache() {
  const dpr = window.devicePixelRatio || 1
  if (gridCanvas) {
    gridCanvas.width = 0
    gridCanvas.height = 0
    gridCanvas = null
  }
  gridCanvas = document.createElement('canvas')
  gridCanvas.width = canvasW * dpr
  gridCanvas.height = canvasH * dpr
  const gCtx = gridCanvas.getContext('2d')
  gCtx.scale(dpr, dpr)
  gCtx.strokeStyle = '#f0f0f0'
  gCtx.lineWidth = 1
  // 그리드 간격 40px로 증가 — 모바일에서 라인 수 감소로 렌더링 성능 향상
  const step = 40
  // 배치 패스 — 개별 stroke() 대신 단일 패스로 묶어서 드로우콜 최소화
  gCtx.beginPath()
  for (let x = 0; x <= canvasW; x += step) {
    gCtx.moveTo(x, 0)
    gCtx.lineTo(x, canvasH)
  }
  for (let y = 0; y <= canvasH; y += step) {
    gCtx.moveTo(0, y)
    gCtx.lineTo(canvasW, y)
  }
  gCtx.stroke()
}

function drawGrid() {
  if (gridCanvas) {
    const dpr = window.devicePixelRatio || 1
    ctx.drawImage(gridCanvas, 0, 0, canvasW * dpr, canvasH * dpr, 0, 0, canvasW, canvasH)
  }
}

function drawTarget() {
  const pts = targetPoints.value
  if (pts.length < 2) return

  // 타겟 도형 (반투명 채우기 + 점선)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y)
  }
  ctx.closePath()

  // 채우기
  ctx.fillStyle = gameState.value === 'playing'
    ? 'rgba(77, 155, 198, 0.08)'
    : 'rgba(77, 155, 198, 0.04)'
  ctx.fill()

  // 점선 테두리
  ctx.setLineDash([8, 6])
  ctx.strokeStyle = 'rgba(77, 155, 198, 0.4)'
  ctx.lineWidth = 2.5
  ctx.stroke()

  // 시작점 마커
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.arc(pts[0].x, pts[0].y, 6, 0, Math.PI * 2)
  ctx.fillStyle = '#4D9BC6'
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.stroke()

  // 화살표 방향 표시 (현재 드로잉 방향 힌트)
  if (pts.length > 3) {
    let hintStart = pts[0]
    let hintEnd = pts[3]
    // 사용자 첫 드로잉 방향으로 힌트 동적 조정
    if (touchStartPos && userPath.length >= 5) {
      const firstPt = userPath[0]
      const midIdx = Math.floor(userPath.length / 2)
      const midPt = userPath[midIdx]
      // 사용자 드로잉 방향과 타겟 도형 방향 비교하여 힌트 방향 결정
      const userDx = midPt.x - firstPt.x
      const userDy = midPt.y - firstPt.y
      const targetDx = hintEnd.x - hintStart.x
      const targetDy = hintEnd.y - hintStart.y
      // 사용자가 타겟과 반대 방향으로 그리면 힌트 뒤집기
      if (userDx * targetDx + userDy * targetDy < 0) {
        const temp = hintStart
        hintStart = hintEnd
        hintEnd = temp
      }
    }
    const dx = hintEnd.x - hintStart.x
    const dy = hintEnd.y - hintStart.y
    const angle = Math.atan2(dy, dx)
    ctx.beginPath()
    ctx.moveTo(hintStart.x + Math.cos(angle) * 14, hintStart.y + Math.sin(angle) * 14)
    ctx.lineTo(
      hintStart.x + Math.cos(angle - 0.5) * 22,
      hintStart.y + Math.sin(angle - 0.5) * 22
    )
    ctx.moveTo(hintStart.x + Math.cos(angle) * 14, hintStart.y + Math.sin(angle) * 14)
    ctx.lineTo(
      hintStart.x + Math.cos(angle + 0.5) * 22,
      hintStart.y + Math.sin(angle + 0.5) * 22
    )
    ctx.strokeStyle = '#4D9BC6'
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.stroke()
  }

  ctx.restore()
}

function drawUserPath() {
  if (userPath.length < 2) return

  // 렌더링 성능: 긴 경로는 150포인트로 간춌려서 드로잉 (채점은 전체 포인트 사용)
  const pts = userPath.length > 150 ? downsamplePath(userPath, 150) : userPath

  ctx.save()

  // 그림자
  ctx.shadowColor = 'rgba(27, 53, 90, 0.3)'
  ctx.shadowBlur = 8

  // 메인 경로 — 베지어 곡선으로 부드러운 렌더링
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y)
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2
      const my = (pts[i].y + pts[i + 1].y) / 2
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
    }
    const last = pts[pts.length - 1]
    ctx.lineTo(last.x, last.y)
  }
  ctx.strokeStyle = '#1B355A'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()

  ctx.shadowBlur = 0

  // 끝점 커서 (원본 경로의 마지막 점 사용)
  const lastPt = userPath[userPath.length - 1]
  ctx.beginPath()
  ctx.arc(lastPt.x, lastPt.y, 8, 0, Math.PI * 2)
  ctx.fillStyle = isDrawing.value ? '#1B355A' : 'rgba(27, 53, 90, 0.5)'
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.restore()
}

/** 간단한 경로 간추리기 (렌더링 전용, 채점은 영향 없음) */
function downsamplePath(points, maxPoints) {
  if (points.length <= maxPoints) return points
  const step = (points.length - 1) / (maxPoints - 1)
  const result = []
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(Math.round(i * step), points.length - 1)
    result.push(points[idx])
  }
  return result
}

function drawResultOverlay() {
  // 반투명 배경만 (타겟+경로는 이미 drawFrame에서 그려짐)
  ctx.save()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.fillRect(0, 0, canvasW, canvasH)
  ctx.restore()
}

// Persistence
function loadHighScore() {
  highScore.value = getBestScore('draw-trace')
}

function saveHighScore() {
  // highScore는 leaderboard에 addScore로 이미 저장됨
}

function shareResult() {
  emit('share')
  shareUtil('모양 따라그리기', lastScore.score)
}
</script>

<style scoped>
.game-wrapper {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  max-width: 480px;
  margin: 0 auto;
  background: #fff;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  overflow: hidden;
  overscroll-behavior: none;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.header-left { display: flex; align-items: center; gap: 10px; }

.level-badge {
  background: #1B355A;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 12px;
}

.shape-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.timer {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-ring { position: absolute; width: 40px; height: 40px; }

.timer-text {
  font-size: 13px;
  font-weight: 700;
  color: #333;
}

.timer.urgent .timer-text { color: #ef4444; animation: pulse-urgent 0.6s ease-in-out infinite; }
@keyframes pulse-urgent {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
@media (prefers-reduced-motion: reduce) {
  .timer.urgent .timer-text { animation: none; }
}

.best-score { font-size: 13px; color: #666; }

.game-main {
  flex: 1;
  position: relative;
  background: #fafbfc;
}

.game-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
  touch-action: none;
  /* will-change removed — canvas doesn't transform, saves GPU memory */
}

.game-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  background: #fff;
  border-top: 1px solid #eee;
  flex-shrink: 0;
}

.score-display { display: flex; flex-direction: column; }
.score-label { font-size: 11px; color: #999; font-weight: 600; letter-spacing: 1px; }
.score-value { font-size: 28px; font-weight: 700; color: #1B355A; }

.btn-start {
  background: linear-gradient(135deg, #4D9BC6, #3A8AB5);
  color: #fff;
  border: none;
  padding: 14px 36px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s;
  box-shadow: 0 4px 12px rgba(77, 155, 198, 0.3);
}
.btn-start:active { transform: scale(0.95); }
.btn-share { background: #1B355A; color: #fff; border: none; padding: 14px 24px; border-radius: 16px; font-size: 14px; font-weight: 600; cursor: pointer; }

/* Result overlay */
.result-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.result-card {
  text-align: center;
  padding: 30px 50px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
}
.result-card.perfect { border-top: 5px solid #FFD700; }
.result-card.great { border-top: 5px solid #4D9BC6; }
.result-card.good { border-top: 5px solid #16A34A; }
.result-card.ok { border-top: 5px solid #F59E0B; }
.result-card.miss { border-top: 5px solid #EF4444; }

.result-grade { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
.result-score { font-size: 42px; font-weight: 700; color: #1B355A; }
.result-detail { font-size: 13px; color: #888; margin-top: 12px; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; text-align: left; }
.detail-grid span:nth-child(odd) { color: #aaa; font-size: 12px; }
.detail-grid span:nth-child(even) { color: #333; font-weight: 600; }

.btn-retry {
  margin-top: 16px;
  width: 100%;
  background: linear-gradient(135deg, #4D9BC6, #3A8AB5);
  color: #fff;
  border: none;
  padding: 12px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s;
  box-shadow: 0 4px 12px rgba(77, 155, 198, 0.25);
}
.btn-retry:active { transform: scale(0.95); }

/* Intro overlay */
.intro-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
}

.intro-card {
  text-align: center;
  padding: 30px;
}
.intro-icon { font-size: 48px; margin-bottom: 12px; }
.intro-title { font-size: 28px; font-weight: 700; color: #1B355A; }
.intro-desc { font-size: 16px; color: #666; margin-top: 8px; }
.intro-hint { font-size: 13px; color: #999; margin-top: 16px; }

/* Transitions */
.fade-enter-active { transition: opacity 0.3s ease; }
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

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
              :stroke-dasharray="107"
              :stroke-dashoffset="107 * (1 - timeLeft / timeLimit)"
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
        @mousedown.prevent="onMouseDown"
        @mousemove.prevent="onMouseMove"
        @mouseup.prevent="onMouseUp"
        @mouseleave.prevent="onMouseUp"
      />
    </main>

    <!-- 하단 점수 -->
    <footer class="game-footer">
      <div class="score-display">
        <span class="score-label">SCORE</span>
        <span class="score-value">{{ score }}</span>
      </div>
      <button v-if="gameState === 'idle' || gameState === 'result'" class="btn-start" @click="startGame">
        {{ gameState === 'result' ? '다시하기' : '시작!' }}
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
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { calculateScore } from '../lib/scorer.js'
import { shapes, getRandomShape } from '../data/shapes.js'
import { addScore } from '../lib/leaderboard.js'
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
let timerInterval = null

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
})

onUnmounted(() => {
  clearInterval(timerInterval)
  cancelAnimationFrame(animFrameId)
  window.removeEventListener('resize', onResize)
})

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

  if (targetPoints.value.length > 0) {
    drawFrame()
  }
}

function onResize() {
  initCanvas()
  if (currentShape.value && targetPoints.value.length === 0) {
    generateTarget()
  }
  drawFrame()
}

// Game flow
function startGame() {
  gameState.value = 'playing'
  score.value = 0
  userPath.length = 0
  timeLeft.value = Math.max(5, 12 - level.value) // 레벨당 1초 감소
  timeLimit.value = timeLeft.value

  const difficulty = Math.min(3, Math.ceil(level.value / 3))
  currentShape.value = getRandomShape(difficulty)
  generateTarget()
  drawFrame()

  // 타이머 시작
  clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      endGame()
    }
  }, 1000)
}

function generateTarget() {
  const shape = currentShape.value
  const size = Math.min(canvasW, canvasH) * 0.3
  targetPoints.value = shape.generatePoints(canvasW / 2, canvasH / 2, size)
}

function endGame() {
  clearInterval(timerInterval)
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

  addScore({ gameId: 'draw-trace', score: result.score, name: '나', detail: `${currentShape.value?.name} ${result.score}점` })
  emit('score', result)
  drawFrame()
}

// Touch handlers
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
  if (gameState.value !== 'playing') return
  isDrawing.value = true
  userPath.length = 0
  userPath.push(getPos(e))
  drawFrame()
}

function onTouchMove(e) {
  if (!isDrawing.value) return
  const pos = getPos(e)
  userPath.push(pos)
  drawFrame()
}

function onTouchEnd() {
  if (!isDrawing.value) return
  isDrawing.value = false
  // 그리기 완료 → 바로 채점
  endGame()
}

// Mouse handlers (desktop)
function onMouseDown(e) { onTouchStart(e) }
function onMouseMove(e) {
  if (!isDrawing.value) return
  const pos = getPos(e)
  userPath.push(pos)
  drawFrame()
}
function onMouseUp() { onTouchEnd() }

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

function drawGrid() {
  ctx.strokeStyle = '#f0f0f0'
  ctx.lineWidth = 1
  const step = 30
  for (let x = 0; x < canvasW; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvasH)
    ctx.stroke()
  }
  for (let y = 0; y < canvasH; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvasW, y)
    ctx.stroke()
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

  // 화살표 방향 표시
  if (pts.length > 3) {
    const dx = pts[3].x - pts[0].x
    const dy = pts[3].y - pts[0].y
    const angle = Math.atan2(dy, dx)
    ctx.beginPath()
    ctx.moveTo(pts[0].x + Math.cos(angle) * 14, pts[0].y + Math.sin(angle) * 14)
    ctx.lineTo(
      pts[0].x + Math.cos(angle - 0.5) * 22,
      pts[0].y + Math.sin(angle - 0.5) * 22
    )
    ctx.moveTo(pts[0].x + Math.cos(angle) * 14, pts[0].y + Math.sin(angle) * 14)
    ctx.lineTo(
      pts[0].x + Math.cos(angle + 0.5) * 22,
      pts[0].y + Math.sin(angle + 0.5) * 22
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

  ctx.save()

  // 그림자
  ctx.shadowColor = 'rgba(27, 53, 90, 0.3)'
  ctx.shadowBlur = 8

  // 메인 경로
  ctx.beginPath()
  ctx.moveTo(userPath[0].x, userPath[0].y)
  for (let i = 1; i < userPath.length; i++) {
    ctx.lineTo(userPath[i].x, userPath[i].y)
  }
  ctx.strokeStyle = '#1B355A'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()

  ctx.shadowBlur = 0

  // 끝점 커서
  const last = userPath[userPath.length - 1]
  ctx.beginPath()
  ctx.arc(last.x, last.y, 8, 0, Math.PI * 2)
  ctx.fillStyle = isDrawing.value ? '#1B355A' : 'rgba(27, 53, 90, 0.5)'
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.restore()
}

function drawResultOverlay() {
  // 결과 배경
  ctx.save()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.fillRect(0, 0, canvasW, canvasH)

  // 사용자 경로 + 타겟 오버레이
  drawTarget()
  drawUserPath()
  ctx.restore()
}

// Persistence
function loadHighScore() {
  const saved = localStorage.getItem('drawtrace-highscore')
  if (saved) highScore.value = parseInt(saved, 10)
}

function saveHighScore() {
  localStorage.setItem('drawtrace-highscore', String(highScore.value))
}

function shareResult() {
  emit('share')
  shareUtil('모양 따라그리기', lastScore.score)
}
</script>

<style scoped>
.game-wrapper {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  width: 100vw;
  max-width: 480px;
  margin: 0 auto;
  background: #fff;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  overflow: hidden;
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

.timer.urgent .timer-text { color: #ef4444; }

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
}

.game-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #fff;
  border-top: 1px solid #eee;
  flex-shrink: 0;
}

.score-display { display: flex; flex-direction: column; }
.score-label { font-size: 11px; color: #999; font-weight: 600; letter-spacing: 1px; }
.score-value { font-size: 28px; font-weight: 800; color: #1B355A; }

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

.result-grade { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
.result-score { font-size: 42px; font-weight: 800; color: #1B355A; }
.result-detail { font-size: 13px; color: #888; margin-top: 8px; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; text-align: left; }
.detail-grid span:nth-child(odd) { color: #aaa; font-size: 12px; }
.detail-grid span:nth-child(even) { color: #333; font-weight: 600; }

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
.intro-title { font-size: 28px; font-weight: 800; color: #1B355A; }
.intro-desc { font-size: 16px; color: #666; margin-top: 8px; }
.intro-hint { font-size: 13px; color: #999; margin-top: 16px; }

/* Transitions */
.fade-enter-active { transition: opacity 0.3s ease; }
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

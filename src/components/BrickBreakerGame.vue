<template>
  <div class="brick-breaker" ref="containerRef">
    <div class="hud">
      <div class="hud-left">
        <span class="hud-score">⭐ {{ score }}</span>
        <span class="hud-stage">Stage {{ stage }}</span>
      </div>
      <div class="hud-center">
        <span v-for="i in lives" :key="i" class="hud-heart">❤️</span>
      </div>
      <div class="hud-right">
        <span class="hud-best">🏆 {{ bestScore }}</span>
      </div>
    </div>
    <div class="active-effects">
      <template v-if="activeEffects.length > 0">
        <span v-for="ef in activeEffects" :key="ef.name" class="effect-badge" :style="{ background: ef.bg }">
          {{ ef.icon }} {{ ef.name }} <span class="effect-timer">{{ ef.remaining }}s</span>
        </span>
      </template>
    </div>
    <canvas ref="canvasRef" @click="handleClick" @touchstart.prevent="handleTouchStart" @touchmove.prevent="handleTouchMove" @touchend.prevent="handleTouchEnd" @mousemove="handleMouseMove"></canvas>
    <div v-if="gameState === 'idle'" class="overlay" @click="handleOverlayClick" @touchstart.prevent="handleOverlayTouch">
      <div class="overlay-content">
        <div class="overlay-icon">🧱</div>
        <div class="overlay-title">핑퐁 벽돌깨기</div>
        <div class="overlay-sub">터치해서 시작</div>
      </div>
    </div>
    <div v-if="gameState === 'gameover'" class="overlay" @click="handleOverlayClick" @touchstart.prevent="handleOverlayTouch">
      <div class="overlay-content">
        <div class="overlay-icon">💥</div>
        <div class="overlay-title">게임 오버</div>
        <div class="overlay-score">점수: {{ score }}</div>
        <div class="overlay-best">최고: {{ bestScore }}</div>
        <button class="overlay-btn" @click.stop="restart" @touchstart.prevent.stop="restart">다시하기</button>
      </div>
    </div>
    <div v-if="gameState === 'stageclear'" class="overlay" @click="handleOverlayClick" @touchstart.prevent="handleOverlayTouch">
      <div class="overlay-content">
        <div class="overlay-icon">🎉</div>
        <div class="overlay-title">Stage {{ stage }} 클리어!</div>
        <div class="overlay-bonus">보너스: ❤️{{ lives }} × 100 = {{ lives * 100 }}</div>
        <div class="overlay-sub">터치해서 다음 스테이지</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { addScore, getBestScore } from '../lib/leaderboard'

const emit = defineEmits(['score', 'share'])

const containerRef = ref(null)
const canvasRef = ref(null)

const score = ref(0)
const lives = ref(3)
const stage = ref(1)
const bestScore = ref(0)
const gameState = ref('idle') // idle, playing, gameover, stageclear

// Active timed effects
const activeEffects = ref([])

let ctx = null
let canvasW = 0
let canvasH = 0
let dpr = 1
let animId = null

// Game objects
let paddle = { x: 0, y: 0, w: 100, h: 14, baseW: 100 }
let balls = []
let bricks = []
let items = []
let shieldActive = false

// Timed effects state
let fireball = { active: false, endTime: 0 }
let magnet = { active: false, endTime: 0 }
let paddleExpand = { active: false, endTime: 0 }
let paddleShrink = { active: false, endTime: 0 }
let reverseControl = { active: false, endTime: 0 }
let ghostBall = { active: false, endTime: 0 }
let chaosBounce = { active: false, endTime: 0 }
let speedMultiplier = 1

// Ball stuck to paddle (for magnet or initial launch)
let stuckBall = null

// Input
let touchX = null
let mouseX = null
let useMouseControl = false

const PADDLE_Y_OFFSET = 40
const BALL_RADIUS = 7
const BALL_BASE_SPEED = 4.5
const ITEM_SIZE = 22
const ITEM_SPEED = 2.5
const ITEM_DROP_CHANCE = 0.25

const BRICK_COLORS = [
  ['#FF6B6B', '#EE5A5A'], // red - 10pt
  ['#FF9F43', '#EE8E32'], // orange - 10pt
  ['#FECA57', '#EDB946'], // yellow - 10pt
  ['#48DBFB', '#37CAEA'], // cyan - 10pt
  ['#FF6348', '#EE5237'], // tomato - 10pt
  ['#A29BFE', '#918AED'], // purple - 10pt
]

const HARD_BRICK_COLOR = ['#636E72', '#535B5F'] // 2 hits, 30pt

// Item definitions
const ITEM_DEFS = [
  // Good items
  { type: 'fireball', icon: '🔥', label: '파이어볼', color: '#FF4444', good: true },
  { type: 'multiball', icon: '🌊', label: '멀티볼', color: '#4488FF', good: true },
  { type: 'magnet', icon: '🧲', label: '자석', color: '#9944FF', good: true },
  { type: 'shield', icon: '🛡️', label: '쉴드', color: '#44CC44', good: true },
  { type: 'expand', icon: '📏', label: '패들확장', color: '#FFCC00', good: true },
  // Bad items
  { type: 'speedup', icon: '💀', label: '속도업', color: '#222222', good: false },
  { type: 'shrink', icon: '📉', label: '패들축소', color: '#888888', good: false },
  { type: 'reverse', icon: '🌀', label: '역방향', color: '#FF8800', good: false },
  { type: 'ghost', icon: '👻', label: '고스트볼', color: '#88DDFF', good: false },
  { type: 'chaos', icon: '🔀', label: '혼란', color: '#FF66AA', good: false },
]

function initGame() {
  bestScore.value = getBestScore('brick-breaker')
  setupCanvas()
  resetStage()
}

function setupCanvas() {
  const container = containerRef.value
  const canvas = canvasRef.value
  if (!container || !canvas) return

  dpr = window.devicePixelRatio || 1

  // viewport 전체 높이에서 nav + hud + effects 영역 제외
  const navH = 48 // game-nav 높이
  const hudH = 40 // hud min-height
  const effectsH = 30 // active-effects min-height
  const viewH = window.innerHeight

  canvasW = Math.min(window.innerWidth, 600)
  canvasH = viewH - navH - hudH - effectsH

  canvas.width = canvasW * dpr
  canvas.height = canvasH * dpr
  canvas.style.width = canvasW + 'px'
  canvas.style.height = canvasH + 'px'

  ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
}

function resetStage() {
  const rows = Math.min(3 + Math.floor(stage.value * 0.7), 8)
  const cols = Math.min(6 + Math.floor(stage.value * 0.5), 10)
  const brickW = (canvasW - 20) / cols
  const brickH = 22
  const topOffset = 30

  bricks = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isHard = stage.value >= 2 && Math.random() < 0.15 + stage.value * 0.03
      const colorIdx = r % BRICK_COLORS.length
      bricks.push({
        x: 10 + c * brickW,
        y: topOffset + r * (brickH + 3),
        w: brickW - 3,
        h: brickH,
        color: isHard ? HARD_BRICK_COLOR[0] : BRICK_COLORS[colorIdx][0],
        colorAlt: isHard ? HARD_BRICK_COLOR[1] : BRICK_COLORS[colorIdx][1],
        hits: isHard ? 2 : 1,
        maxHits: isHard ? 2 : 1,
        points: isHard ? 30 : 10,
        alive: true,
      })
    }
  }

  // Reset paddle
  paddle.baseW = Math.max(80, Math.min(120, canvasW * 0.22))
  paddle.w = paddle.baseW
  paddle.x = (canvasW - paddle.w) / 2
  paddle.y = canvasH - PADDLE_Y_OFFSET
  paddle.h = 14

  // Reset ball
  resetBall()

  items = []
  shieldActive = false

  // Clear timed effects
  clearAllEffects()

  // 캔버스 리사이즈 시 그라디언트 캐시 무효화
  brickGradCache.clear()
  lastPaddleColor = ''
  paddleGradCache = null
}

function resetBall() {
  balls = [{
    x: canvasW / 2,
    y: paddle.y - BALL_RADIUS - 2,
    dx: 0,
    dy: 0,
    speed: BALL_BASE_SPEED * speedMultiplier,
    launched: false,
  }]
  stuckBall = balls[0]
}

function launchBall(ball) {
  if (ball.launched) return
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6
  ball.dx = Math.cos(angle) * ball.speed
  ball.dy = Math.sin(angle) * ball.speed
  ball.launched = true
  stuckBall = null
}

function startGame() {
  gameState.value = 'playing'
  score.value = 0
  lives.value = 3
  stage.value = 1
  speedMultiplier = 1
  resetStage()
  ensureLoop()
}

function restart() {
  gameState.value = 'playing'
  score.value = 0
  lives.value = 3
  stage.value = 1
  speedMultiplier = 1
  resetStage()
  ensureLoop()
}

function loseLife() {
  lives.value--
  if (navigator.vibrate) navigator.vibrate([20, 50, 20]) // 라이프 상실 햅틱
  if (lives.value <= 0) {
    endGame()
  } else {
    resetBall()
  }
}

function endGame() {
  gameState.value = 'gameover'
  bestScore.value = Math.max(bestScore.value, score.value)
  addScore({ gameId: 'brick-breaker', score: score.value })
  emit('score', { score: score.value })
  draw() // gameover overlay 전 최종 프레임
}

function nextStage() {
  const bonus = lives.value * 100
  score.value += bonus
  stage.value++
  resetStage()
  gameState.value = 'playing'
  ensureLoop()
}

// -- Item system --
function spawnItem(x, y) {
  if (Math.random() > ITEM_DROP_CHANCE) return
  const def = ITEM_DEFS[Math.floor(Math.random() * ITEM_DEFS.length)]
  items.push({
    x, y,
    type: def.type,
    icon: def.icon,
    label: def.label,
    color: def.color,
    good: def.good,
  })
}

function activateItem(item) {
  score.value += 50
  const now = Date.now()
  switch (item.type) {
    case 'fireball':
      fireball = { active: true, endTime: now + 10000 }
      break
    case 'multiball':
      if (balls.length < 10) {
        const src = balls.find(b => b.launched) || balls[0]
        for (let i = 0; i < 2; i++) {
          const angle = Math.random() * Math.PI * 2
          balls.push({
            x: src.x,
            y: src.y,
            dx: Math.cos(angle) * src.speed,
            dy: Math.sin(angle) * src.speed,
            speed: src.speed,
            launched: true,
          })
        }
      }
      break
    case 'magnet':
      magnet = { active: true, endTime: now + 8000 }
      break
    case 'shield':
      shieldActive = true
      break
    case 'expand':
      paddleExpand = { active: true, endTime: now + 15000 }
      paddleShrink = { active: false, endTime: 0 }
      break
    case 'speedup':
      speedMultiplier = Math.min(speedMultiplier * 1.3, 2.5)
      balls.forEach(b => {
        const s = Math.sqrt(b.dx * b.dx + b.dy * b.dy)
        if (s > 0) {
          const newSpeed = BALL_BASE_SPEED * speedMultiplier
          b.dx = (b.dx / s) * newSpeed
          b.dy = (b.dy / s) * newSpeed
          b.speed = newSpeed
        }
      })
      break
    case 'shrink':
      paddleShrink = { active: true, endTime: now + 10000 }
      paddleExpand = { active: false, endTime: 0 }
      break
    case 'reverse':
      reverseControl = { active: true, endTime: now + 8000 }
      break
    case 'ghost':
      ghostBall = { active: true, endTime: now + 5000 }
      break
    case 'chaos':
      chaosBounce = { active: true, endTime: now + 6000 }
      break
  }
}

function clearAllEffects() {
  fireball = { active: false, endTime: 0 }
  magnet = { active: false, endTime: 0 }
  paddleExpand = { active: false, endTime: 0 }
  paddleShrink = { active: false, endTime: 0 }
  reverseControl = { active: false, endTime: 0 }
  ghostBall = { active: false, endTime: 0 }
  chaosBounce = { active: false, endTime: 0 }
}

function updateEffects() {
  const now = Date.now()
  if (fireball.active && now > fireball.endTime) fireball.active = false
  if (magnet.active && now > magnet.endTime) { magnet.active = false; stuckBall = null }
  if (paddleExpand.active && now > paddleExpand.endTime) paddleExpand.active = false
  if (paddleShrink.active && now > paddleShrink.endTime) paddleShrink.active = false
  if (reverseControl.active && now > reverseControl.endTime) reverseControl.active = false
  if (ghostBall.active && now > ghostBall.endTime) ghostBall.active = false
  if (chaosBounce.active && now > chaosBounce.endTime) chaosBounce.active = false

  // Update paddle width
  let targetW = paddle.baseW
  if (paddleExpand.active) targetW = paddle.baseW * 1.5
  if (paddleShrink.active) targetW = paddle.baseW * 0.5
  targetW = Math.max(30, targetW)
  paddle.w += (targetW - paddle.w) * 0.15

  // Build active effects display
  const eff = []
  const checkEffect = (obj, name, icon, bg) => {
    if (obj.active) eff.push({ name, icon, bg, remaining: Math.ceil((obj.endTime - now) / 1000) })
  }
  checkEffect(fireball, '파이어볼', '🔥', '#FF4444')
  checkEffect(magnet, '자석', '🧲', '#9944FF')
  checkEffect(paddleExpand, '확장', '📏', '#FFCC00')
  checkEffect(paddleShrink, '축소', '📉', '#888888')
  checkEffect(reverseControl, '역방향', '🌀', '#FF8800')
  checkEffect(ghostBall, '고스트', '👻', '#88DDFF')
  checkEffect(chaosBounce, '혼란', '🔀', '#FF66AA')
  if (shieldActive) eff.push({ name: '쉴드', icon: '🛡️', bg: '#44CC44', remaining: '1' })
  activeEffects.value = eff
}

// -- Game loop --
function gameLoop() {
  if (gameState.value !== 'playing') {
    draw()
    animId = null
    return
  }

  update()
  draw()
  animId = requestAnimationFrame(gameLoop)
}

// overlay 상태에서 초기 화면 렌더링 (idle/gameover/stageclear)
function drawOverlay() {
  if (!ctx) return
  draw()
}

/** idle → playing 전환 시 루프 재시작 */
function ensureLoop() {
  if (animId) return
  animId = requestAnimationFrame(gameLoop)
}

function update() {
  updateEffects()

  // Move paddle
  let targetX = paddle.x
  if (useMouseControl && mouseX !== null) {
    targetX = mouseX - paddle.w / 2
  } else if (touchX !== null) {
    targetX = touchX - paddle.w / 2
  }
  const dir = reverseControl.active ? -1 : 1
  const diff = (targetX - paddle.x) * dir
  paddle.x += diff * 0.55
  paddle.x = Math.max(0, Math.min(canvasW - paddle.w, paddle.x))

  // Stuck ball follows paddle
  if (stuckBall) {
    stuckBall.x = paddle.x + paddle.w / 2
    stuckBall.y = paddle.y - BALL_RADIUS - 2
  }

  // Update balls
  const ballsToRemove = []
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i]
    if (!ball.launched) continue

    ball.x += ball.dx
    ball.y += ball.dy

    // Wall bounce
    if (ball.x - BALL_RADIUS <= 0) {
      ball.x = BALL_RADIUS
      ball.dx = Math.abs(ball.dx)
      if (chaosBounce.active) ball.dy += (Math.random() - 0.5) * 2
    }
    if (ball.x + BALL_RADIUS >= canvasW) {
      ball.x = canvasW - BALL_RADIUS
      ball.dx = -Math.abs(ball.dx)
      if (chaosBounce.active) ball.dy += (Math.random() - 0.5) * 2
    }
    if (ball.y - BALL_RADIUS <= 0) {
      ball.y = BALL_RADIUS
      ball.dy = Math.abs(ball.dy)
      if (chaosBounce.active) ball.dx += (Math.random() - 0.5) * 2
    }

    // Bottom - lose ball
    if (ball.y + BALL_RADIUS >= canvasH) {
      if (shieldActive) {
        shieldActive = false
        ball.dy = -Math.abs(ball.dy)
        ball.y = canvasH - BALL_RADIUS - 1
      } else {
        ballsToRemove.push(i)
        continue
      }
    }

    // Paddle collision
    if (
      ball.dy > 0 &&
      ball.y + BALL_RADIUS >= paddle.y &&
      ball.y + BALL_RADIUS <= paddle.y + paddle.h + 4 &&
      ball.x >= paddle.x - 2 &&
      ball.x <= paddle.x + paddle.w + 2
    ) {
      if (magnet.active) {
        ball.launched = false
        stuckBall = ball
        ball.dx = 0
        ball.dy = 0
      } else {
        const hitPos = (ball.x - paddle.x) / paddle.w // 0~1
        const angle = -Math.PI / 2 + (hitPos - 0.5) * 1.2
        ball.dx = Math.cos(angle) * ball.speed
        ball.dy = Math.sin(angle) * ball.speed
        ball.y = paddle.y - BALL_RADIUS - 1
      }
    }

    // Brick collision
    for (const brick of bricks) {
      if (!brick.alive) continue
      if (ballHitsBrick(ball, brick)) {
        brick.hits--
        if (brick.hits <= 0) {
          brick.alive = false
          score.value += brick.points
          spawnItem(brick.x + brick.w / 2, brick.y + brick.h / 2)
        }
        if (!fireball.active) {
          // Determine bounce direction
          const bCx = brick.x + brick.w / 2
          const bCy = brick.y + brick.h / 2
          const dx = ball.x - bCx
          const dy = ball.y - bCy
          if (Math.abs(dx / brick.w) > Math.abs(dy / brick.h)) {
            ball.dx = dx > 0 ? Math.abs(ball.dx) : -Math.abs(ball.dx)
          } else {
            ball.dy = dy > 0 ? Math.abs(ball.dy) : -Math.abs(ball.dy)
          }
        }
        break // one brick per frame per ball
      }
    }

    // Normalize speed
    const sp = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy)
    if (sp > 0 && !stuckBall) {
      ball.dx = (ball.dx / sp) * ball.speed
      ball.dy = (ball.dy / sp) * ball.speed
    }
  }

  // Remove lost balls
  for (let i = ballsToRemove.length - 1; i >= 0; i--) {
    balls.splice(ballsToRemove[i], 1)
  }

  // All balls lost
  if (balls.length === 0) {
    loseLife()
    return
  }

  // Update items
  const itemsToRemove = []
  for (let i = 0; i < items.length; i++) {
    items[i].y += ITEM_SPEED
    // Paddle catch
    if (
      items[i].y + ITEM_SIZE >= paddle.y &&
      items[i].y <= paddle.y + paddle.h &&
      items[i].x + ITEM_SIZE >= paddle.x &&
      items[i].x <= paddle.x + paddle.w
    ) {
      activateItem(items[i])
      itemsToRemove.push(i)
      continue
    }
    // Off screen
    if (items[i].y > canvasH + 20) {
      itemsToRemove.push(i)
    }
  }
  for (let i = itemsToRemove.length - 1; i >= 0; i--) {
    items.splice(itemsToRemove[i], 1)
  }

  // Check stage clear
  if (bricks.every(b => !b.alive)) {
    gameState.value = 'stageclear'
    draw() // overlay 표시 전 최종 프레임 렌더링
  }
}

function ballHitsBrick(ball, brick) {
  const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.w))
  const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.h))
  const dx = ball.x - closestX
  const dy = ball.y - closestY
  return dx * dx + dy * dy <= BALL_RADIUS * BALL_RADIUS
}

// 그라디언트 캐시 — 벽돌 색상별로 1회만 생성 후 재사용
let brickGradCache = new Map()
let lastPaddleColor = ''
let paddleGradCache = null

function draw() {
  if (!ctx) return
  ctx.clearRect(0, 0, canvasW, canvasH)

  // Background
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, canvasW, canvasH)

  // Shield line
  if (shieldActive) {
    ctx.strokeStyle = '#44CC44'
    ctx.lineWidth = 3
    ctx.setLineDash([8, 4])
    ctx.beginPath()
    ctx.moveTo(0, canvasH - 5)
    ctx.lineTo(canvasW, canvasH - 5)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Bricks — 캐시된 그라디언트 재사용
  for (const brick of bricks) {
    if (!brick.alive) continue
    const cacheKey = `${brick.color}|${brick.colorAlt}|${brick.h}`
    let grad = brickGradCache.get(cacheKey)
    if (!grad) {
      grad = ctx.createLinearGradient(0, 0, 0, brick.h)
      grad.addColorStop(0, brick.color)
      grad.addColorStop(1, brick.colorAlt)
      brickGradCache.set(cacheKey, grad)
    }
    ctx.fillStyle = grad
    roundRect(ctx, brick.x, brick.y, brick.w, brick.h, 4)
    ctx.fill()

    // Hard brick indicator
    if (brick.maxHits > 1 && brick.hits > 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1.5
      roundRect(ctx, brick.x + 2, brick.y + 2, brick.w - 4, brick.h - 4, 3)
      ctx.stroke()
    }
  }

  // Items
  for (const item of items) {
    ctx.fillStyle = item.color
    ctx.globalAlpha = 0.85
    roundRect(ctx, item.x - ITEM_SIZE / 2, item.y - ITEM_SIZE / 2, ITEM_SIZE, ITEM_SIZE, 6)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.font = `${ITEM_SIZE - 4}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.icon, item.x, item.y)
  }

  // Paddle — 색상 변경 시에만 그라디언트 재생성
  const pColor = reverseControl.active ? 'rev' : 'norm'
  if (pColor !== lastPaddleColor) {
    paddleGradCache = ctx.createLinearGradient(0, 0, 0, paddle.h)
    paddleGradCache.addColorStop(0, reverseControl.active ? '#FF8800' : '#4D9BC6')
    paddleGradCache.addColorStop(1, reverseControl.active ? '#CC6600' : '#3A7CA5')
    lastPaddleColor = pColor
  }
  ctx.fillStyle = paddleGradCache
  roundRect(ctx, paddle.x, paddle.y, paddle.w, paddle.h, 7)
  ctx.fill()

  // Balls
  for (const ball of balls) {
    ctx.globalAlpha = ghostBall.active ? 0.25 : 1
    if (fireball.active) {
      ctx.fillStyle = '#FF4444'
      ctx.shadowColor = '#FF4444'
      ctx.shadowBlur = 10
    } else {
      ctx.fillStyle = '#FFFFFF'
      ctx.shadowColor = '#FFFFFF'
      ctx.shadowBlur = 6
    }
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }
}

function roundRect(ctx, x, y, w, h, r) {
  // 네이티브 Canvas roundRect API 사용 (성능 향상)
  if (ctx.roundRect) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    return
  }
  // Fallback: 구형 브라우저
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// -- Input handlers --
function handleOverlayClick() {
  if (gameState.value === 'idle') { startGame(); return }
  if (gameState.value === 'stageclear') { nextStage(); return }
}

function handleOverlayTouch(e) {
  if (gameState.value === 'idle') { startGame(); return }
  if (gameState.value === 'stageclear') { nextStage(); return }
}

function handleClick(e) {
  if (gameState.value === 'idle') {
    startGame()
    return
  }
  if (gameState.value === 'stageclear') {
    nextStage()
    return
  }
  if (gameState.value === 'playing' && stuckBall) {
    launchBall(stuckBall)
  }
}

function handleTouchStart(e) {
  if (gameState.value === 'idle') { startGame(); return }
  if (gameState.value === 'stageclear') { nextStage(); return }
  if (gameState.value === 'playing' && stuckBall && e.touches.length > 0) {
    launchBall(stuckBall)
  }
  if (e.touches.length > 0) {
    const rect = canvasRef.value.getBoundingClientRect()
    touchX = e.touches[0].clientX - rect.left
    useMouseControl = false
  }
}

function handleTouchMove(e) {
  if (e.touches.length > 0) {
    const rect = canvasRef.value.getBoundingClientRect()
    touchX = e.touches[0].clientX - rect.left
  }
}

function handleTouchEnd() {
  touchX = null
}

function handleMouseMove(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  mouseX = e.clientX - rect.left
  useMouseControl = true
}

let resizeTimeout = null
function handleResize() {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    setupCanvas()
    if (gameState.value === 'idle') resetStage()
  }, 200)
}

onMounted(() => {
  initGame()
  // idle 상태에서는 루프를 돌지 않음 — 시작 시 ensureLoop()로 진입
  draw() // 초기 화면 1회 렌더링
  window.addEventListener('resize', handleResize)
  // 화면 방향 전환 감지 (모바일)
  screen.orientation?.addEventListener?.('change', handleResize)
})

onUnmounted(() => {
  if (animId) { cancelAnimationFrame(animId); animId = null }
  window.removeEventListener('resize', handleResize)
  screen.orientation?.removeEventListener?.('change', handleResize)
})
</script>

<style scoped>
.brick-breaker {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: #16213e;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
  min-height: 40px;
}

.hud-left, .hud-center, .hud-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hud-center { gap: 2px; }
.hud-heart { font-size: 16px; }
.hud-score { color: #FECA57; }
.hud-best { color: #aaa; font-size: 12px; }
.hud-stage { color: #48DBFB; }

.active-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 14px 6px;
  background: #16213e;
  flex-shrink: 0;
  min-height: 30px;
}

.effect-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
}

.effect-timer {
  font-size: 10px;
  opacity: 0.8;
}

canvas {
  flex: 1;
  display: block;
  touch-action: none;
  -webkit-touch-callout: none;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  z-index: 10;
}

.overlay-content {
  text-align: center;
  color: #fff;
  padding: 30px;
}

.overlay-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.overlay-title {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 8px;
}

.overlay-score {
  font-size: 18px;
  color: #FECA57;
  margin-bottom: 4px;
}

.overlay-best {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 16px;
}

.overlay-bonus {
  font-size: 16px;
  color: #48DBFB;
  margin-bottom: 8px;
}

.overlay-sub {
  font-size: 14px;
  opacity: 0.6;
  animation: pulse 1.5s infinite;
}

.overlay-btn {
  background: #4D9BC6;
  color: #fff;
  border: none;
  padding: 12px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
</style>

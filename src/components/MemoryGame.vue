<template>
  <div class="game-wrapper">
    <header class="game-header">
      <div class="header-left"><span class="level-badge">Round {{ round }}</span></div>
      <div class="header-center">
        <div class="timer" :class="{ urgent: timeLeft <= 10 }">
          <svg viewBox="0 0 40 40" class="timer-ring">
            <circle cx="20" cy="20" r="17" fill="none" stroke="#eee" stroke-width="3" />
            <circle cx="20" cy="20" r="17" fill="none"
              :stroke="timeLeft <= 10 ? '#ef4444' : '#4D9BC6'"
              stroke-width="3"
              stroke-linecap="round"
              :stroke-dasharray="timerCircumference"
              :stroke-dashoffset="timerCircumference * (1 - timeLeft / timeLimit)"
              style="transition: stroke-dashoffset 0.25s linear;"
              transform="rotate(-90 20 20)"
            />
          </svg>
          <span class="timer-text">{{ timeLeft }}s</span>
        </div>
      </div>
      <div class="header-right">
        <span class="pairs-found">🧩 {{ found }}/{{ totalPairs }}</span>
      </div>
    </header>

    <main class="game-main">
      <div class="card-grid" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
        <div
          v-for="(card, i) in cards"
          :key="i"
          class="card"
          :class="{ flipped: card.flipped, matched: card.matched }"
          @click="flipCard(i)"
        >
          <div class="card-inner">
            <div class="card-front">❓</div>
            <div class="card-back">{{ card.emoji }}</div>
          </div>
        </div>
      </div>
    </main>

    <footer class="game-footer">
      <div class="score-display">
        <span class="score-label">SCORE</span>
        <span class="score-value">{{ score }}</span>
      </div>
      <div class="moves-info" v-if="gameState === 'playing'">{{ moves }}수</div>
      <button v-if="gameState === 'idle'" class="btn-start" @click="startGame">시작!</button>
      <button v-if="gameState === 'done'" class="btn-start" @click="startGame">다시하기</button>
      <button v-if="gameState === 'done'" class="btn-share" @click="$emit('share')">📤 공유</button>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { addScore } from '../lib/leaderboard'
import { shuffle } from '../lib/utils'
import { hapticSuccess } from '../lib/haptics'

const emit = defineEmits(['score', 'share'])

const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐸', '🐵', '🦄', '🐉']
const timerCircumference = 2 * Math.PI * 17

// 라운드별 그리드 설정 — 난이도 상승
const ROUND_CONFIGS = [
  { cols: 3, rows: 4, time: 50 },  // Round 1: 6 pairs (쉬움)
  { cols: 4, rows: 4, time: 60 },  // Round 2: 8 pairs (보통)
  { cols: 4, rows: 5, time: 70 },  // Round 3: 10 pairs (어려움)
  { cols: 5, rows: 4, time: 80 },  // Round 4: 10 pairs (시간제한)
  { cols: 6, rows: 4, time: 90 },  // Round 5: 12 pairs (최난이도)
]

const gameState = ref('idle') // idle | playing | done
const cards = ref([])
const flipped = ref([])
const round = ref(1)
const score = ref(0)
const found = ref(0)
const timeLeft = ref(60)
const timeLimit = ref(60)
const moves = ref(0)
const cols = ref(4)
const totalPairs = ref(8)
let timerInterval = null
let gameStartTime = 0
let flipTimeout = null
let isChecking = false // 더블탭 치팅 방지

function startGame() {
  gameState.value = 'playing'
  round.value = 1
  score.value = 0
  setupRound()
}

function setupRound() {
  const config = ROUND_CONFIGS[Math.min(round.value - 1, ROUND_CONFIGS.length - 1)]
  cols.value = config.cols
  totalPairs.value = (config.cols * config.rows) / 2
  timeLimit.value = config.time
  timeLeft.value = config.time
  found.value = 0
  moves.value = 0
  flipped.value = []
  isChecking = false
  clearTimeout(flipTimeout)

  const selected = shuffle(EMOJIS).slice(0, totalPairs.value)
  const pairs = shuffle([...selected, ...selected])
  cards.value = pairs.map(emoji => ({ emoji, flipped: false, matched: false }))

  clearInterval(timerInterval)
  gameStartTime = Date.now()
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000)
    timeLeft.value = Math.max(0, timeLimit.value - elapsed)
    if (timeLeft.value <= 0) endGame()
  }, 250)
}

function flipCard(index) {
  if (gameState.value !== 'playing') return
  if (cards.value[index].flipped || cards.value[index].matched) return
  if (flipped.value.length >= 2) return
  if (isChecking) return // 매칭 체크 중에는 추가 클릭 무시

  if (navigator.vibrate) navigator.vibrate(10)
  cards.value[index].flipped = true
  flipped.value.push(index)

  if (flipped.value.length === 2) {
    moves.value++
    const [a, b] = flipped.value
    if (cards.value[a].emoji === cards.value[b].emoji) {
      cards.value[a].matched = true
      cards.value[b].matched = true
      found.value++
      flipped.value = []
      if (navigator.vibrate) navigator.vibrate([10, 30, 10]) // 매칭 성공 햅틱 패턴
      // 매칭 보너스: 쌍당 3초 연장 (트렌드: 진행 보상)
      timeLeft.value += 3
      timeLimit.value += 3
      if (found.value >= totalPairs) endGame()
    } else {
      isChecking = true
      flipTimeout = setTimeout(() => {
        cards.value[a].flipped = false
        cards.value[b].flipped = false
        flipped.value = []
        isChecking = false
      }, 600)
    }
  }
}

function endGame() {
  clearInterval(timerInterval)
  clearTimeout(flipTimeout)
  isChecking = false

  // 모든 라운드 클리어 여부
  const isAllClear = found.value >= totalPairs.value && round.value >= ROUND_CONFIGS.length

  if (found.value >= totalPairs.value && !isAllClear) {
    // 다음 라운드로 진행 — 누적 점수
    const pairBonus = found.value * 100
    const timeBonus = Math.max(0, timeLeft.value) * 5
    const movePenalty = Math.max(0, (moves.value - totalPairs.value * 2) * 3)
    const roundScore = Math.max(0, pairBonus + timeBonus - movePenalty)
    score.value += roundScore
    round.value++
    setupRound()
    return
  }

  gameState.value = 'done'
  hapticSuccess()

  // 최종 라운드 점수 합산
  const pairBonus = found.value * 100
  const timeBonus = Math.max(0, timeLeft.value) * 5
  const movePenalty = Math.max(0, (moves.value - totalPairs.value * 2) * 3)
  const roundScore = Math.max(0, pairBonus + timeBonus - movePenalty)
  score.value += roundScore

  addScore({ gameId: 'memory', score: score.value, name: '나', detail: `Round ${round.value} ${moves.value}moves` })
  emit('score', { score: score.value, detail: { found: found.value, totalPairs: totalPairs.value, moves: moves.value, timeLeft: timeLeft.value } })
}

onUnmounted(() => { clearInterval(timerInterval); clearTimeout(flipTimeout) })
</script>

<style scoped>
.game-wrapper { display: flex; flex-direction: column; height: 100%; user-select: none; -webkit-user-select: none; touch-action: none; overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
.game-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid #eee; flex-shrink: 0; }
.header-left { display: flex; align-items: center; gap: 10px; }
.level-badge { background: #1B355A; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px; }
.timer { position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.timer-ring { position: absolute; width: 40px; height: 40px; }
.timer-text { font-size: 13px; font-weight: 700; color: #333; }
.timer.urgent .timer-text { color: #ef4444; animation: pulse-urgent 0.6s ease-in-out infinite; }
@keyframes pulse-urgent {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
@media (prefers-reduced-motion: reduce) {
  .timer.urgent .timer-text { animation: none; }
}
.pairs-found { font-size: 13px; color: #666; }
.game-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; }
.card-grid { display: grid; gap: 8px; width: 100%; max-width: 400px; }
.card { aspect-ratio: 1; perspective: 600px; cursor: pointer; }
.card-inner { width: 100%; height: 100%; position: relative; transition: transform 0.4s; transform-style: preserve-3d; }
.card.flipped .card-inner, .card.matched .card-inner { transform: rotateY(180deg); }
.card-front, .card-back { position: absolute; inset: 0; border-radius: 12px; display: flex; align-items: center; justify-content: center; backface-visibility: hidden; font-size: 28px; }
.card-front { background: linear-gradient(135deg, #4D9BC6, #1B355A); color: #fff; }
.card-back { background: #f0f5fa; transform: rotateY(180deg); }
.card.matched .card-back { background: #E8F5E9; }
.game-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-top: 1px solid #eee; flex-shrink: 0; gap: 8px; }
.score-display { display: flex; flex-direction: column; }
.score-label { font-size: 11px; color: #999; font-weight: 600; letter-spacing: 1px; }
.score-value { font-size: 24px; font-weight: 700; color: #1B355A; }
.btn-start { background: linear-gradient(135deg, #4D9BC6, #3A8AB5); color: #fff; border: none; padding: 12px 28px; border-radius: 14px; font-size: 15px; font-weight: 700; cursor: pointer; transition: transform 0.1s; box-shadow: 0 4px 12px rgba(77, 155, 198, 0.3); }
.btn-start:active { transform: scale(0.95); }
.btn-share { background: #1B355A; color: #fff; border: none; padding: 12px 20px; border-radius: 14px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.1s; }
.btn-share:active { transform: scale(0.95); }
.moves-info { font-size: 13px; color: #888; font-weight: 600; }
</style>

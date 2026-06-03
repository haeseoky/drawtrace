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

const emit = defineEmits(['score', 'share'])

const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮']
const cols = 4
const rows = 4
const totalPairs = (cols * rows) / 2
const timerCircumference = 2 * Math.PI * 17

const gameState = ref('idle') // idle | playing | done
const cards = ref([])
const flipped = ref([])
const round = ref(1)
const score = ref(0)
const found = ref(0)
const timeLeft = ref(60)
const timeLimit = ref(60)
const moves = ref(0)
let timerInterval = null
let gameStartTime = 0
let flipTimeout = null
let isChecking = false // 더블탭 치팅 방지

function startGame() {
  gameState.value = 'playing'
  found.value = 0
  moves.value = 0
  timeLeft.value = 60
  timeLimit.value = 60
  flipped.value = []
  clearTimeout(flipTimeout)

  const selected = shuffle(EMOJIS).slice(0, totalPairs)
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
  gameState.value = 'done'

  // 점수: 짝 찾기 보너스 + 시간 보너스 - 무브 패널티
  const pairBonus = found.value * 100
  const timeBonus = Math.max(0, timeLeft.value) * 5
  const movePenalty = Math.max(0, (moves.value - totalPairs * 2) * 3)
  score.value = Math.max(0, pairBonus + timeBonus - movePenalty)

  addScore({ gameId: 'memory', score: score.value, name: '나', detail: `${found.value}/${totalPairs} ${moves.value}moves` })
  emit('score', { score: score.value, detail: { found: found.value, totalPairs, moves: moves.value, timeLeft: timeLeft.value } })
}

onUnmounted(() => { clearInterval(timerInterval); clearTimeout(flipTimeout) })
</script>

<style scoped>
.game-wrapper { display: flex; flex-direction: column; height: 100%; user-select: none; -webkit-user-select: none; }
.game-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid #eee; flex-shrink: 0; }
.header-left { display: flex; align-items: center; gap: 10px; }
.level-badge { background: #1B355A; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px; }
.timer { position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.timer-ring { position: absolute; width: 40px; height: 40px; }
.timer-text { font-size: 13px; font-weight: 700; color: #333; }
.timer.urgent .timer-text { color: #ef4444; }
.pairs-found { font-size: 13px; color: #666; }
.game-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; }
.card-grid { display: grid; gap: 8px; width: 100%; max-width: 340px; }
.card { aspect-ratio: 1; perspective: 600px; cursor: pointer; }
.card-inner { width: 100%; height: 100%; position: relative; transition: transform 0.4s; transform-style: preserve-3d; }
.card.flipped .card-inner, .card.matched .card-inner { transform: rotateY(180deg); }
.card-front, .card-back { position: absolute; inset: 0; border-radius: 12px; display: flex; align-items: center; justify-content: center; backface-visibility: hidden; font-size: 28px; }
.card-front { background: linear-gradient(135deg, #4D9BC6, #1B355A); color: #fff; }
.card-back { background: #f0f5fa; transform: rotateY(180deg); }
.card.matched .card-back { background: #E8F5E9; }
.game-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-top: 1px solid #eee; flex-shrink: 0; }
.score-display { display: flex; flex-direction: column; }
.score-label { font-size: 11px; color: #999; font-weight: 600; letter-spacing: 1px; }
.score-value { font-size: 24px; font-weight: 800; color: #1B355A; }
.btn-start { background: linear-gradient(135deg, #4D9BC6, #3A8AB5); color: #fff; border: none; padding: 12px 28px; border-radius: 14px; font-size: 15px; font-weight: 700; cursor: pointer; }
.btn-share { background: #1B355A; color: #fff; border: none; padding: 12px 20px; border-radius: 14px; font-size: 14px; font-weight: 600; cursor: pointer; }
</style>

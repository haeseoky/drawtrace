<template>
  <div class="game-wrapper">
    <header class="game-header">
      <div class="header-left"><span class="level-badge">Round {{ round }}</span></div>
      <div class="header-center">
        <div class="timer"><span class="timer-text">{{ timeLeft }}s</span></div>
      </div>
      <div class="header-right">
        <span class="best-score">🏆 {{ bestScore }}</span>
      </div>
    </header>

    <main class="game-main">
      <div class="color-question">
        <div class="color-word" :style="{ color: displayColor }">{{ displayText }}</div>
        <div class="color-hint">글자의 <strong>색상</strong>을 선택하세요!</div>
      </div>
      <div class="color-options">
        <button
          v-for="(opt, i) in options"
          :key="i"
          class="color-btn"
          :style="{ background: opt.hex }"
          @click="selectAnswer(opt)"
        />
      </div>
      <Transition name="pop">
        <div v-if="feedback" class="feedback" :class="feedback">{{ feedback === 'correct' ? '✅ 정답!' : '❌ 틀림!' }}</div>
      </Transition>
    </main>

    <footer class="game-footer">
      <div class="score-display">
        <span class="score-label">SCORE</span>
        <span class="score-value">{{ score }}</span>
      </div>
      <div class="combo" v-if="combo > 1">🔥 x{{ combo }}</div>
      <button v-if="gameState === 'idle'" class="btn-start" @click="startGame">시작!</button>
      <button v-if="gameState === 'done'" class="btn-start" @click="startGame">다시하기</button>
      <button v-if="gameState === 'done'" class="btn-share" @click="$emit('share')">📤 공유</button>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { addScore, getBestScore } from '../lib/leaderboard'
import { shuffle } from '../lib/utils'

const emit = defineEmits(['score', 'share'])

const COLORS = [
  { name: '빨강', hex: '#DC2626' },
  { name: '파랑', hex: '#2563EB' },
  { name: '초록', hex: '#16A34A' },
  { name: '노랑', hex: '#EAB308' },
  { name: '보라', hex: '#7C3AED' },
  { name: '주황', hex: '#EA580C' },
]

const gameState = ref('idle')
const round = ref(0)
const score = ref(0)
const combo = ref(0)
const timeLeft = ref(30)
const timeLimit = ref(30)
const feedback = ref(null)
const bestScore = ref(getBestScore('color-match'))

const displayText = ref('')
const displayColor = ref('')
const correctHex = ref('')
const options = ref([])

let timerInterval = null
let gameStartTime = 0

function generateRound() {
  const textColor = COLORS[Math.floor(Math.random() * COLORS.length)]
  let textWord
  do {
    textWord = COLORS[Math.floor(Math.random() * COLORS.length)]
  } while (textWord.name === textColor.name)

  displayText.value = textWord.name
  displayColor.value = textColor.hex
  correctHex.value = textColor.hex

  // 보기 생성: 정답 + 3개 오답 (Fisher-Yates 셔플)
  const wrongColors = COLORS.filter(c => c.hex !== textColor.hex)
  const shuffledWrong = shuffle(wrongColors).slice(0, 3)
  options.value = shuffle([...shuffledWrong, textColor])
}

function startGame() {
  gameState.value = 'playing'
  score.value = 0
  combo.value = 0
  round.value = 0
  timeLeft.value = 30
  timeLimit.value = 30

  clearInterval(timerInterval)
  gameStartTime = Date.now()
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000)
    timeLeft.value = Math.max(0, timeLimit.value - elapsed)
    if (timeLeft.value <= 0) endGame()
  }, 250)

  nextRound()
}

function nextRound() {
  feedback.value = null
  round.value++
  generateRound()
}

function selectAnswer(opt) {
  if (gameState.value !== 'playing') return
  if (feedback.value) return
  if (navigator.vibrate) navigator.vibrate(10)

  if (opt.hex === correctHex.value) {
    combo.value++
    score.value += 10 * combo.value
    feedback.value = 'correct'
  } else {
    combo.value = 0
    feedback.value = 'wrong'
  }

  setTimeout(() => {
    if (gameState.value === 'playing') nextRound()
  }, 500)
}

function endGame() {
  clearInterval(timerInterval)
  gameState.value = 'done'
  feedback.value = null
  addScore({ gameId: 'color-match', score: score.value, name: '나', detail: `${round.value}rounds` })
  if (score.value > bestScore.value) bestScore.value = score.value
  emit('score', { score: score.value, detail: { rounds: round.value } })
}

onUnmounted(() => { clearInterval(timerInterval) })
</script>

<style scoped>
.game-wrapper { display: flex; flex-direction: column; height: 100%; user-select: none; -webkit-user-select: none; }
.game-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid #eee; flex-shrink: 0; }
.header-left { display: flex; align-items: center; gap: 10px; }
.level-badge { background: #1B355A; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px; }
.timer-text { font-size: 14px; font-weight: 700; }
.best-score { font-size: 13px; color: #666; }
.game-main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; position: relative; }
.color-question { text-align: center; margin-bottom: 32px; }
.color-word { font-size: 48px; font-weight: 800; margin-bottom: 12px; }
.color-hint { font-size: 14px; color: #888; }
.color-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; width: 100%; max-width: 280px; }
.color-btn { aspect-ratio: 1.6; border: none; border-radius: 16px; cursor: pointer; transition: transform 0.1s; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.color-btn:active { transform: scale(0.92); }
.feedback { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 32px; font-weight: 800; z-index: 10; }
.feedback.correct { color: #16A34A; }
.feedback.wrong { color: #DC2626; }
.game-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-top: 1px solid #eee; flex-shrink: 0; gap: 8px; }
.score-display { display: flex; flex-direction: column; }
.score-label { font-size: 11px; color: #999; font-weight: 600; letter-spacing: 1px; }
.score-value { font-size: 24px; font-weight: 800; color: #1B355A; }
.combo { font-size: 16px; font-weight: 700; color: #DC2626; }
.btn-start { background: linear-gradient(135deg, #4D9BC6, #3A8AB5); color: #fff; border: none; padding: 12px 28px; border-radius: 14px; font-size: 15px; font-weight: 700; cursor: pointer; }
.btn-share { background: #1B355A; color: #fff; border: none; padding: 12px 20px; border-radius: 14px; font-size: 14px; font-weight: 600; cursor: pointer; }
.pop-enter-active { transition: all 0.2s ease-out; }
.pop-leave-active { transition: all 0.15s ease-in; }
.pop-enter-from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
.pop-leave-to { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
</style>

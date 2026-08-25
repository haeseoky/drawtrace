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
          :aria-label="opt.name"
          @click="selectAnswer(opt)"
        >
          <span class="color-label">{{ opt.name }}</span>
        </button>
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
const timerCircumference = 2 * Math.PI * 17

const displayText = ref('')
const displayColor = ref('')
const correctHex = ref('')
const options = ref([])

let timerInterval = null
let gameStartTime = 0
let feedbackTimeout = null

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
  if (feedback.value) return // 피드백 표시 중 중복 클릭 방지
  if (navigator.vibrate) navigator.vibrate(10)

  if (opt.hex === correctHex.value) {
    combo.value++
    score.value += 10 * combo.value
    feedback.value = 'correct'
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]) // 정답 햅틱 패턴
    // 콤보 5의 배수마다 5초 연장 (트렌드: 인터미턴트 리워드)
    if (combo.value > 0 && combo.value % 5 === 0) {
      timeLeft.value += 5
      timeLimit.value += 5
    }
  } else {
    combo.value = 0
    feedback.value = 'wrong'
  }

  clearTimeout(feedbackTimeout)
  feedbackTimeout = setTimeout(() => {
    feedback.value = null
    if (gameState.value === 'playing') nextRound()
  }, 450)
}

function endGame() {
  clearInterval(timerInterval)
  timerInterval = null
  clearTimeout(feedbackTimeout)
  gameState.value = 'done'
  feedback.value = null
  addScore({ gameId: 'color-match', score: score.value, name: '나', detail: `${round.value}rounds` })
  if (score.value > bestScore.value) bestScore.value = score.value
  emit('score', { score: score.value, detail: { rounds: round.value } })
}

onUnmounted(() => { clearInterval(timerInterval); clearTimeout(feedbackTimeout) })
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
.best-score { font-size: 13px; color: #666; }
.game-main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; position: relative; }
.color-question { text-align: center; margin-bottom: 32px; }
.color-word { font-size: 48px; font-weight: 700; margin-bottom: 12px; }
.color-hint { font-size: 14px; color: #888; }
.color-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; width: 100%; max-width: 320px; }
.color-btn { aspect-ratio: 1.6; border: none; border-radius: 16px; cursor: pointer; transition: transform 0.1s; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; align-items: flex-end; justify-content: center; padding-bottom: 8px; }
.color-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.85); text-shadow: 0 1px 3px rgba(0,0,0,0.3); }
.color-btn:active { transform: scale(0.92); }
.feedback { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 32px; font-weight: 700; z-index: 10; }
.feedback.correct { color: #16A34A; }
.feedback.wrong { color: #DC2626; }
.game-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-top: 1px solid #eee; flex-shrink: 0; gap: 8px; }
.score-display { display: flex; flex-direction: column; }
.score-label { font-size: 11px; color: #999; font-weight: 600; letter-spacing: 1px; }
.score-value { font-size: 24px; font-weight: 700; color: #1B355A; }
.combo { font-size: 16px; font-weight: 700; color: #DC2626; }
.btn-start { background: linear-gradient(135deg, #4D9BC6, #3A8AB5); color: #fff; border: none; padding: 12px 28px; border-radius: 14px; font-size: 15px; font-weight: 700; cursor: pointer; transition: transform 0.1s; box-shadow: 0 4px 12px rgba(77, 155, 198, 0.3); }
.btn-start:active { transform: scale(0.95); }
.btn-share { background: #1B355A; color: #fff; border: none; padding: 12px 20px; border-radius: 14px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.1s; }
.btn-share:active { transform: scale(0.95); }
.pop-enter-active { transition: all 0.2s ease-out; }
.pop-leave-active { transition: all 0.15s ease-in; }
.pop-enter-from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
.pop-leave-to { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
</style>

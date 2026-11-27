<template>
  <div class="game-wrapper">
    <!-- 스크린 리더 상태 발표 (a11y) -->
    <div class="sr-only" role="status" aria-live="polite">{{ srAnnouncement }}</div>
    <header class="game-header">
      <div class="header-left"><span class="level-badge">Round {{ round }}/{{ TOTAL_ROUNDS }}</span></div>
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
        <div v-if="gameState === 'playing'" class="pairs-found">🧩 {{ found }}/{{ totalPairs }}</div>
      </div>
    </header>

    <main class="game-main">
      <div class="card-grid" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
        <div
          v-for="(card, i) in cards"
          :key="i"
          class="card"
          :class="{ flipped: card.flipped || previewing, matched: card.matched }"
          @click="flipCard(i)"
        >
          <div class="card-inner">
            <div class="card-front">❓</div>
            <div class="card-back">{{ card.emoji }}</div>
          </div>
        </div>
      </div>
      <Transition name="banner">
        <div v-if="previewing" class="preview-badge">미리보기 — 기억하세요!</div>
      </Transition>
    </main>

    <Transition name="banner">
      <div v-if="roundClear" class="round-clear-overlay">
        <div class="round-clear-title">Round {{ round }} 클리어!</div>
        <div class="round-clear-score">+{{ lastRoundScore }}점</div>
        <div v-if="lastPerfectRound" class="round-clear-perfect">퍼펙트 보너스 +500</div>
      </div>
    </Transition>

    <footer class="game-footer">
      <div class="score-display">
        <span class="score-label">SCORE</span>
        <span class="score-value">{{ score }}</span>
      </div>
      <div class="moves-info" v-if="gameState === 'playing'">
        {{ moves }}수
        <span v-if="combo >= 2" class="combo-badge">{{ combo }}연속!</span>
      </div>
      <button v-if="gameState === 'idle'" class="btn-start" @click="startGame">시작!</button>
      <button v-if="gameState === 'done'" class="btn-start" @click="startGame">다시하기</button>
      <button v-if="gameState === 'done'" class="btn-share" @click="$emit('share')">📤 공유</button>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { addScore } from '../lib/leaderboard'
import { shuffle } from '../lib/utils'
import { hapticSuccess, hapticTick, haptic } from '../lib/haptics'

const emit = defineEmits(['score', 'share'])

const srAnnouncement = computed(() => {
  if (gameState.value === 'done') return `게임 종료. 최종 점수 ${score.value}점.${lastPerfect.value ? ' 퍼펙트 라운드 보너스가 포함되었습니다.' : ''}`
  if (gameState.value === 'playing') return `라운드 ${round.value} 진행 중. 점수 ${score.value}점.`
  return '기억력 카드 게임. 시작 버튼을 눌러 플레이하세요.'
})

const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐸', '🐵', '🦄', '🐉']
const TOTAL_ROUNDS = ROUND_CONFIGS.length
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
let roundMistakes = 0 // 이번 라운드 실수 수 (퍼펙트 보너스용)
const combo = ref(0) // 연속 매칭 콤보
const lastPerfect = ref(false) // 마지막 라운드 퍼펙트 여부 (sr 발표용)
const roundClear = ref(false) // 라운드 클리어 배너 표시 중
const lastRoundScore = ref(0)
const lastPerfectRound = ref(false)
let roundClearTimeout = null
const previewing = ref(false) // 라운드 시작 카드 미리보기 중
let previewTimeout = null

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
  combo.value = 0
  roundMistakes = 0
  clearTimeout(flipTimeout)
  clearTimeout(roundClearTimeout)
  roundClear.value = false

  gameStartTime = Date.now()
  const selected = shuffle(EMOJIS).slice(0, totalPairs.value)
  const pairs = shuffle([...selected, ...selected])
  cards.value = pairs.map(emoji => ({ emoji, flipped: false, matched: false }))

  // 라운드 시작 미리보기: 전체 카드를 잠깐 공개 (라운드가 오를수록 짧아짐)
  previewing.value = true
  clearTimeout(previewTimeout)
  previewTimeout = setTimeout(() => { previewing.value = false }, Math.max(900, 2300 - round.value * 300))

  const timer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000)
    timeLeft.value = Math.max(0, timeLimit.value - elapsed)
    if (timeLeft.value <= 0) endGame()
  }, 250)
  timerInterval = timer
}

function flipCard(index) {
  if (gameState.value !== 'playing' || previewing.value) return
  if (cards.value[index].flipped || cards.value[index].matched) return
  if (flipped.value.length >= 2) return
  if (isChecking) return // 매칭 체크 중에는 추가 클릭 무시

  hapticTick()
  cards.value[index].flipped = true
  flipped.value.push(index)

  if (flipped.value.length === 2) {
    moves.value++
    const [a, b] = flipped.value
    if (cards.value[a].emoji === cards.value[b].emoji) {
      cards.value[a].matched = true
      cards.value[b].matched = true
      found.value++
      combo.value++
      flipped.value = []
      haptic([10, 30, 10]) // 매칭 성공 햅틱 패턴
      // 매칭 보너스: 쌍당 3초 + 콤보 보너스 (연속 매칭 시 +1초씩 가산, 최대 +5)
      const comboBonus = Math.min(5, combo.value - 1)
      timeLeft.value += 3 + comboBonus
      timeLimit.value += 3 + comboBonus
      if (found.value >= totalPairs) endGame()
    } else {
      combo.value = 0
      roundMistakes++
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

// 라운드 점수 계산 (중복 제거)
function calcRoundScore() {
  const pairBonus = found.value * 100
  const timeBonus = Math.max(0, timeLeft.value) * 5
  // 패널티 상한: 획득 보너스의 50% — 실수해도 라운드 보상감 유지 (백로그 #9)
  const movePenalty = Math.min(
    Math.max(0, (moves.value - totalPairs.value * 2) * 3),
    (pairBonus + timeBonus) * 0.5
  )
  return Math.max(0, Math.round(pairBonus + timeBonus - movePenalty))
}

function endGame() {
  clearInterval(timerInterval)
  clearTimeout(flipTimeout)
  isChecking = false

  // 모든 라운드 클리어 여부
  const isAllClear = found.value >= totalPairs.value && round.value >= ROUND_CONFIGS.length

  if (found.value >= totalPairs.value && !isAllClear) {
    // 다음 라운드로 진행 — 누적 점수
    const roundScore = calcRoundScore()
    const perfectBonus = roundMistakes === 0 ? 500 : 0
    score.value += roundScore + perfectBonus
    // 라운드 클리어 피드백: 배너 1.4초 표시 후 다음 라운드 시작
    roundClear.value = true
    lastRoundScore.value = roundScore + perfectBonus
    lastPerfectRound.value = perfectBonus > 0
    haptic([10, 30, 10, 30, 10])
    clearTimeout(roundClearTimeout)
    roundClearTimeout = setTimeout(() => {
      roundClear.value = false
      round.value++
      setupRound()
    }, 1400)
    return
  }

  gameState.value = 'done'
  hapticSuccess()

  // 최종 라운드 점수 합산
  const roundScore = calcRoundScore()
  const perfectBonus = roundMistakes === 0 ? 500 : 0
  lastPerfect.value = perfectBonus > 0
  score.value += roundScore + perfectBonus

  addScore({ gameId: 'memory', score: score.value, name: '나', detail: `Round ${round.value} ${moves.value}moves` })
  emit('score', { score: score.value, detail: { found: found.value, totalPairs: totalPairs.value, moves: moves.value, timeLeft: timeLeft.value, perfectBonus } })
}

function onKeyDown(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return
  if (gameState.value === 'idle' || gameState.value === 'done') {
    e.preventDefault()
    startGame()
  }
}
onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => { clearInterval(timerInterval); clearTimeout(flipTimeout); clearTimeout(roundClearTimeout); clearTimeout(previewTimeout); window.removeEventListener('keydown', onKeyDown) })
</script>

<style scoped>
.game-wrapper { position: relative; display: flex; flex-direction: column; height: 100%; user-select: none; -webkit-user-select: none; touch-action: none; overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
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
.round-clear-overlay { position: absolute; inset: 0; background: rgba(27, 53, 90, 0.88); z-index: 20; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 12px; text-align: center; }
.round-clear-title { font-size: 30px; font-weight: 800; color: #fff; margin-bottom: 10px; }
.round-clear-score { font-size: 22px; font-weight: 700; color: #8FD3F4; }
.round-clear-perfect { margin-top: 8px; font-size: 14px; font-weight: 700; color: #FFD54F; }
.banner-enter-active { transition: all 0.25s ease-out; }
.banner-leave-active { transition: all 0.2s ease-in; }
.banner-enter-from { opacity: 0; transform: scale(0.92); }
.banner-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .banner-enter-active, .banner-leave-active { transition: none; }
}
.preview-badge { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); background: #1B355A; color: #fff; font-size: 13px; font-weight: 700; padding: 8px 18px; border-radius: 14px; z-index: 10; pointer-events: none; box-shadow: 0 4px 12px rgba(27, 53, 90, 0.3); }
.preview-badge.banner-enter-active { transition: all 0.2s ease-out; }
.preview-badge.banner-leave-active { transition: all 0.2s ease-in; }
.preview-badge.banner-enter-from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
.preview-badge.banner-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .preview-badge.banner-enter-active, .preview-badge.banner-leave-active { transition: none; }
}
.game-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; }
.card-grid { display: grid; gap: 8px; width: 100%; max-width: 400px; }
.card { aspect-ratio: 1; perspective: 600px; cursor: pointer; }
.card-inner { width: 100%; height: 100%; position: relative; transition: transform 0.4s; transform-style: preserve-3d; }
.card.flipped .card-inner, .card.matched .card-inner { transform: rotateY(180deg); }
.card-front, .card-back { position: absolute; inset: 0; border-radius: 12px; display: flex; align-items: center; justify-content: center; backface-visibility: hidden; font-size: 28px; }
.card-front { background: linear-gradient(135deg, #4D9BC6, #1B355A); color: #fff; }
.card-back { background: #f0f5fa; transform: rotateY(180deg); }
.card.matched .card-back { background: #E8F5E9; }
.card.matched .card-inner { animation: match-pop 0.35s ease-out; }
@keyframes match-pop {
  0% { transform: rotateY(180deg) scale(1); }
  50% { transform: rotateY(180deg) scale(1.1); }
  100% { transform: rotateY(180deg) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .card.matched .card-inner { animation: none; }
}
.game-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-top: 1px solid #eee; flex-shrink: 0; gap: 8px; }
.score-display { display: flex; flex-direction: column; }
.score-label { font-size: 11px; color: #999; font-weight: 600; letter-spacing: 1px; }
.score-value { font-size: 24px; font-weight: 700; color: #1B355A; }
.btn-start { background: linear-gradient(135deg, #4D9BC6, #3A8AB5); color: #fff; border: none; padding: 12px 28px; border-radius: 14px; font-size: 15px; font-weight: 700; cursor: pointer; transition: transform 0.1s; box-shadow: 0 4px 12px rgba(77, 155, 198, 0.3); }
.btn-start:active { transform: scale(0.95); }
.btn-share { background: #1B355A; color: #fff; border: none; padding: 12px 20px; border-radius: 14px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.1s; }
.btn-share:active { transform: scale(0.95); }
.moves-info { font-size: 13px; color: #888; font-weight: 600; }
.combo-badge { color: #E65100; font-weight: 700; margin-left: 6px; animation: combo-pop 0.3s ease-out; }
@keyframes combo-pop {
  0% { transform: scale(1.5); }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .combo-badge { animation: none; }
}
</style>

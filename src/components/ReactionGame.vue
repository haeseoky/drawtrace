<template>
  <div class="game-wrapper">
    <header class="game-header">
      <div class="header-left"><span class="level-badge">Round {{ round }}</span></div>
      <div class="header-center">
        <div class="timer" :class="{ urgent: phase === 'wait' && waitDone }">
          <span class="timer-text">{{ phase === 'ready' ? '준비' : phase === 'wait' ? '기다려!' : (reactionTime + 'ms') }}</span>
        </div>
      </div>
      <div class="header-right"><span class="best-score">🏆 {{ bestMs }}ms</span></div>
    </header>

    <main class="game-main" :class="phase" @click="onTap">
      <div v-if="phase === 'ready'" class="phase-content">
        <div class="phase-icon">⚡</div>
        <div class="phase-text">화면을 터치하면 시작합니다</div>
      </div>
      <div v-if="phase === 'wait'" class="phase-content wait">
        <div class="phase-icon">🔴</div>
        <div class="phase-text">초록색이 되면 터치!</div>
      </div>
      <div v-if="phase === 'go'" class="phase-content go">
        <div class="phase-icon">🟢</div>
        <div class="phase-text">지금!</div>
      </div>
      <div v-if="phase === 'result'" class="phase-content">
        <div class="reaction-time">{{ reactionTime }}ms</div>
        <div class="reaction-grade" :class="grade">{{ gradeEmoji }} {{ gradeText }}</div>
        <div class="phase-hint">터치하면 다음 라운드</div>
      </div>
      <div v-if="phase === 'fail'" class="phase-content fail">
        <div class="phase-icon">😅</div>
        <div class="phase-text">너무 빨리 터치했어요!</div>
        <div class="phase-hint">터치하면 재시도</div>
      </div>
    </main>

    <footer class="game-footer">
      <div class="score-display">
        <span class="score-label">AVG</span>
        <span class="score-value">{{ avgTime }}ms</span>
      </div>
      <div class="round-info">{{ rounds.length }}/{{ totalRounds }}</div>
      <button v-if="phase === 'ready' && rounds.length > 0" class="btn-share" @click.stop="$emit('share')">📤 공유</button>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { addScore, getBestScore } from '../lib/leaderboard'

const emit = defineEmits(['score', 'share'])

const phase = ref('ready') // ready | wait | go | result | fail
const round = ref(1)
const totalRounds = 5
const rounds = ref([])
const reactionTime = ref(0)
const waitDone = ref(false)
let waitTimeout = null
let goTimestamp = 0
// performance.now() 사용 — Date.now()보다 서브밀리초 정밀도
// 백그라운드 탭에서 performance.now()가 멈추는 이슈 대응
const getTimestamp = () => {
  if (document.hidden) return Date.now()
  return performance.now()
}

// bestMs는 '반응시간 ms'이므로 localStorage에서 직접 읽기 (getBestScore는 점수 기준)
const bestMs = ref(parseInt(localStorage.getItem('reaction-best-ms') || '0', 10))

const avgTime = computed(() => {
  if (rounds.value.length === 0) return 0
  return Math.round(rounds.value.reduce((a, b) => a + b, 0) / rounds.value.length)
})

const grade = computed(() => {
  const t = reactionTime.value
  if (t < 200) return 'insane'
  if (t < 250) return 'fast'
  if (t < 350) return 'good'
  if (t < 500) return 'ok'
  return 'slow'
})

const gradeText = computed(() => {
  const map = { insane: '미친 반응속도!', fast: '빠르다!', good: '좋아요!', ok: '괜찮네요', slow: '조금 느려요' }
  return map[grade.value]
})

const gradeEmoji = computed(() => {
  const map = { insane: '⚡', fast: '🔥', good: '👍', ok: '😊', slow: '🐢' }
  return map[grade.value]
})

function onTap() {
  if (phase.value === 'ready') {
    startRound()
  } else if (phase.value === 'wait') {
    // 너무 빨리 누름
    clearTimeout(waitTimeout)
    phase.value = 'fail'
  } else if (phase.value === 'go') {
    reactionTime.value = Math.round(getTimestamp() - goTimestamp)
    rounds.value.push(reactionTime.value)
    phase.value = 'result'

    if (rounds.value.length >= totalRounds) {
      const avg = avgTime.value
      const score = Math.max(0, Math.round(100 - (avg - 150) * 0.2))
      addScore({ gameId: 'reaction', score, name: '나', detail: `${avg}ms` })
      if (avg < bestMs.value || bestMs.value === 0) {
        bestMs.value = avg
        localStorage.setItem('reaction-best-ms', String(avg))
      }
      emit('score', { score, detail: { avgMs: avg, rounds: [...rounds.value] } })
    }
  } else if (phase.value === 'result' || phase.value === 'fail') {
    if (rounds.value.length >= totalRounds) {
      // 게임 종료 후 재시작
      rounds.value = []
      round.value = 1
    } else {
      round.value++
    }
    phase.value = 'ready'
  }
}

function startRound() {
  phase.value = 'wait'
  waitDone.value = false
  const delay = 1500 + Math.random() * 3000
  waitTimeout = setTimeout(() => {
    phase.value = 'go'
    goTimestamp = getTimestamp()
    waitDone.value = true
  }, delay)
}

onUnmounted(() => { clearTimeout(waitTimeout) })
</script>

<style scoped>
.game-wrapper { display: flex; flex-direction: column; height: 100%; user-select: none; -webkit-user-select: none; }
.game-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid #eee; flex-shrink: 0; }
.header-left { display: flex; align-items: center; gap: 10px; }
.level-badge { background: #1B355A; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px; }
.timer-text { font-size: 14px; font-weight: 700; }
.best-score { font-size: 13px; color: #666; }
.game-main { flex: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s; }
.game-main.wait { background: #DC2626; }
.game-main.go { background: #16A34A; }
.game-main.fail { background: #F59E0B; }
.phase-content { text-align: center; color: #333; }
.game-main.wait .phase-content, .game-main.go .phase-content { color: #fff; }
.phase-icon { font-size: 64px; margin-bottom: 16px; }
.phase-text { font-size: 20px; font-weight: 700; }
.phase-hint { font-size: 13px; opacity: 0.6; margin-top: 16px; }
.reaction-time { font-size: 56px; font-weight: 800; color: #1B355A; }
.reaction-grade { font-size: 20px; font-weight: 700; margin-top: 8px; }
.reaction-grade.insane { color: #7C3AED; }
.reaction-grade.fast { color: #DC2626; }
.reaction-grade.good { color: #16A34A; }
.reaction-grade.ok { color: #F59E0B; }
.reaction-grade.slow { color: #888; }
.game-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-top: 1px solid #eee; flex-shrink: 0; }
.score-display { display: flex; flex-direction: column; }
.score-label { font-size: 11px; color: #999; font-weight: 600; letter-spacing: 1px; }
.score-value { font-size: 24px; font-weight: 800; color: #1B355A; }
.round-info { font-size: 14px; color: #888; font-weight: 600; }
.btn-share { background: #4D9BC6; color: #fff; border: none; padding: 10px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; }
</style>

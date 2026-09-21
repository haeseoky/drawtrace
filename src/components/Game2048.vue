<template>
  <div class="game-wrapper">
    <!-- 스크린 리더 상태 발표 (a11y) -->
    <div class="sr-only" role="status" aria-live="polite">{{ srAnnouncement }}</div>
    <header class="game-header" :class="{ shake: shaking }" @animationend="shaking = false">
      <div class="header-left"><span class="level-badge">2048</span></div>
      <div class="header-center">
        <span class="tile-hint">같은 숫자를 합쳐 <strong>2048</strong>을 만드세요</span>
      </div>
      <div class="header-right">
        <span class="best-score">🏆 {{ bestScore }}</span>
      </div>
    </header>

    <main class="game-main">
      <div class="board" ref="boardRef" tabindex="0" role="grid" aria-label="2048 보드" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
        <div class="bg-cells">
          <div v-for="i in 16" :key="i" class="bg-cell"></div>
        </div>
        <TransitionGroup name="tile">
          <div
            v-for="tile in tiles"
            :key="tile.id"
            class="tile"
            :class="tileClass(tile.value)"
            :style="tileStyle(tile)"
          >{{ tile.value }}</div>
        </TransitionGroup>
        <div v-if="gameState === 'won'" class="over-overlay">
          <div class="over-title win">2048 달성!</div>
          <div class="over-score">{{ score }}점</div>
          <button class="btn-continue" @click="gameState = 'playing'; boardRef?.focus()">계속하기</button>
        </div>
        <div v-if="gameState === 'over'" class="over-overlay">
          <div class="over-title">게임 종료</div>
          <div class="over-score">{{ score }}점</div>
          <button v-if="canUndo" class="btn-continue undo" @click="undo">↩ 되돌리기</button>
        </div>
      </div>
      <div v-if="gameState === 'idle'" class="intro-overlay">
        <div class="intro-title">2048</div>
        <p class="intro-desc">스와이프(또는 방향키)로 타일을 밀어 <strong>같은 숫자</strong>를 합치세요.
          타일이 더 이상 움직일 수 없으면 게임이 끝납니다.</p>
      </div>
    </main>

    <footer class="game-footer">
      <div class="score-display">
        <span class="score-label">SCORE</span>
        <span class="score-value">{{ score }}</span>
        <Transition name="gain">
          <span v-if="gainPopup" :key="gainPopup.key" class="gain-popup">+{{ gainPopup.amount }}</span>
        </Transition>
      </div>
      <div class="footer-btns">
        <button v-if="gameState === 'playing' && canUndo" class="btn-undo" @click="undo">↩ 되돌리기</button>
        <button v-if="gameState === 'idle'" class="btn-start" @click="startGame">시작!</button>
        <button v-else class="btn-restart" @click="startGame">다시하기</button>
        <button v-if="gameState === 'over'" class="btn-share" @click="$emit('share')">📤 공유</button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { addScore, getBestScore } from '../lib/leaderboard'
import { hapticSuccess } from '../lib/haptics'
import { slide } from '../lib/game2048'

const emit = defineEmits(['score', 'share'])

const SIZE = 4
const TILE_COLORS = {
  2:    { bg: '#EEE4DA', fg: '#776E65' },
  4:    { bg: '#EDE0C8', fg: '#776E65' },
  8:    { bg: '#F2B179', fg: '#FFF' },
  16:   { bg: '#F59563', fg: '#FFF' },
  32:   { bg: '#F67C5F', fg: '#FFF' },
  64:   { bg: '#F65E3B', fg: '#FFF' },
  128:  { bg: '#EDCF72', fg: '#FFF' },
  256:  { bg: '#EDCC61', fg: '#FFF' },
  512:  { bg: '#EDC850', fg: '#FFF' },
  1024: { bg: '#EDC53F', fg: '#FFF' },
  2048: { bg: '#EDC22E', fg: '#FFF' },
}

const gameState = ref('idle')
const score = ref(0)
const bestScore = ref(getBestScore('2048'))
const board = ref([]) // {id, value, r, c, merged}
let tileId = 0
let wonShown = false
const shaking = ref(false)
const gainPopup = ref(null) // { amount, key }
let gainKey = 0
const undoSnapshot = ref(null) // { board, score } — 1스텝 되돌리기
const canUndo = computed(() => !!undoSnapshot.value)

const srAnnouncement = computed(() => {
  if (gameState.value === 'over') return `게임 종료. 최종 점수 ${score.value}점.`
  if (gameState.value === 'playing') return `2048 진행 중. 점수 ${score.value}점.`
  return '2048 게임. 시작 버튼을 눌러 플레이하세요.'
})

const tiles = computed(() => board.value.flat().filter(Boolean))

function tileClass(v) { return 'tile-' + v }
function tileStyle(t) {
  return {
    transform: `translate(calc(${t.c} * (var(--cell) + var(--gap))), calc(${t.r} * (var(--cell) + var(--gap))))`,
  }
}

function emptyCells() {
  const cells = []
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!board.value[r][c]) cells.push({ r, c })
  return cells
}

function spawnTile() {
  const cells = emptyCells()
  if (cells.length === 0) return
  const { r, c } = cells[Math.floor(Math.random() * cells.length)]
  // 90% 2, 10% 4 (원작 난이도)
  board.value[r][c] = { id: ++tileId, value: Math.random() < 0.9 ? 2 : 4, r, c }
}

function startGame() {
  board.value = Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  score.value = 0
  wonShown = false
  undoSnapshot.value = null
  gameState.value = 'playing'
  spawnTile()
  spawnTile()
  boardRef.value?.focus()
}

function getLine(dir, i) {
  // dir: 0=left, 1=right, 2=up, 3=down — 슬라이드 방향 순서로 한 줄 수집
  const line = []
  for (let j = 0; j < SIZE; j++) {
    if (dir < 2) line.push(board.value[i][dir === 1 ? SIZE - 1 - j : j])
    else line.push(board.value[dir === 3 ? SIZE - 1 - j : j][i])
  }
  return line
}

function setLine(dir, i, out) {
  for (let j = 0; j < SIZE; j++) {
    const t = out[j]
    if (dir < 2) board.value[i][dir === 1 ? SIZE - 1 - j : j] = t ? { ...t, r: i, c: dir === 1 ? SIZE - 1 - j : j } : null
    else {
      const r = dir === 3 ? SIZE - 1 - j : j
      board.value[r][i] = t ? { ...t, r, c: i } : null
    }
  }
}

function move(dir) {
  if (gameState.value !== 'playing' && gameState.value !== 'won') return
  undoSnapshot.value = { board: board.value.map(row => row.map(t => t ? { ...t } : null)), score: score.value }
  let movedAny = false
  for (let i = 0; i < SIZE; i++) {
    const line = getLine(dir, i)
    const { out, gained, moved } = slide(line)
    if (moved) movedAny = true
    setLine(dir, i, out)
    if (gained) {
      score.value += gained
      gainPopup.value = { amount: gained, key: ++gainKey }
    }
  }
  if (!movedAny) {
    // 유효하지 않은 이동 — 흔들림 + 짧은 진동으로 피드백
    shaking.value = true
    if (navigator.vibrate) navigator.vibrate([30])
    return
  }
  if (navigator.vibrate) navigator.vibrate(8)
  spawnTile()
  if (score.value > bestScore.value) bestScore.value = score.value
  if (!wonShown && hasWon()) {
    wonShown = true
    gameState.value = 'won'
    hapticSuccess()
    addScore({ gameId: '2048', score: score.value, name: '나', detail: '2048' })
    emit('score', { score: score.value, detail: { game: '2048' } })
    return
  }
  if (isGameOver()) endGame()
}

function hasWon() {
  for (const row of board.value) for (const t of row) if (t && t.value >= 2048) return true
  return false
}

function isGameOver() {
  if (emptyCells().length > 0) return false
  // 인접 같은 값 있으면 이동 가능
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const v = board.value[r][c].value
      if (c + 1 < SIZE && board.value[r][c + 1].value === v) return false
      if (r + 1 < SIZE && board.value[r + 1][c].value === v) return false
    }
  return true
}

function undo() {
  if (!undoSnapshot.value || (gameState.value !== 'playing' && gameState.value !== 'over' && gameState.value !== 'won')) return
  board.value = undoSnapshot.value.board
  score.value = undoSnapshot.value.score
  undoSnapshot.value = null
  gameState.value = 'playing'
  if (navigator.vibrate) navigator.vibrate([15])
  boardRef.value?.focus()
}

function endGame() {
  gameState.value = 'over'
  hapticSuccess()
  addScore({ gameId: '2048', score: score.value, name: '나', detail: '2048' })
  emit('score', { score: score.value, detail: { game: '2048' } })
}

// 터치 스와이프
let touchStart = null
function onTouchStart(e) {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
}
function onTouchEnd(e) {
  if (!touchStart) return
  const dx = e.changedTouches[0].clientX - touchStart.x
  const dy = e.changedTouches[0].clientY - touchStart.y
  touchStart = null
  const absX = Math.abs(dx), absY = Math.abs(dy)
  if (Math.max(absX, absY) < 24) return // 너무 짧은 스와이프 무시
  if (absX > absY) move(dx > 0 ? 1 : 0)
  else move(dy > 0 ? 3 : 2)
}

// 키보드 (a11y)
function onKeydown(e) {
  if (gameState.value !== 'playing' && gameState.value !== 'won') return
  const map = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3 }
  if (e.key in map) { e.preventDefault(); move(map[e.key]) }
  else if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); undo() }
}
onMounted(() => { document.addEventListener('keydown', onKeydown) })
onUnmounted(() => { document.removeEventListener('keydown', onKeydown) })
</script>

<style scoped>
.game-wrapper { display: flex; flex-direction: column; height: 100%; user-select: none; -webkit-user-select: none; touch-action: none; overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
.game-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid #eee; flex-shrink: 0; }
.level-badge { background: #1B355A; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px; }
.tile-hint { font-size: 12px; color: #888; }
.best-score { font-size: 13px; color: #666; }
.game-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; position: relative; }

.board {
  --cell: calc((min(90vw, 360px) - 5 * 8px) / 4);
  --gap: 8px;
  position: relative;
  width: calc(var(--cell) * 4 + var(--gap) * 5);
  height: calc(var(--cell) * 4 + var(--gap) * 5);
  background: #BBADA0;
  border-radius: 12px;
  padding: var(--gap);
  box-sizing: border-box;
  touch-action: none;
  outline: none;
}
.board:focus-visible { box-shadow: 0 0 0 3px #8B7BC7; }

.bg-cells { position: absolute; inset: var(--gap); display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); gap: var(--gap); }
.bg-cell { background: rgba(238, 228, 218, 0.35); border-radius: 6px; }

.tile {
  position: absolute;
  top: var(--gap);
  left: var(--gap);
  width: var(--cell);
  height: var(--cell);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: calc(var(--cell) * 0.4);
  transition: transform 0.12s ease-in-out;
  will-change: transform;
  z-index: 2;
}
.tile-1024, .tile-2048 { font-size: calc(var(--cell) * 0.32); }
.tile-128, .tile-256, .tile-512 { font-size: calc(var(--cell) * 0.36); }

.tile-enter-active { transition: transform 0.12s ease-out, opacity 0.12s; }
.tile-enter-from { transform: scale(0.3) !important; opacity: 0; }
.tile-leave-active { transition: opacity 0.1s; z-index: 1; }
.tile-leave-to { opacity: 0; }

.over-overlay { position: absolute; inset: 0; background: rgba(238, 228, 218, 0.8); z-index: 5; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 12px; }
.over-title { font-size: 26px; font-weight: 800; color: #776E65; }
.over-title.win { color: #EDC22E; }
.btn-continue { margin-top: 14px; background: #EDC22E; color: #fff; border: none; padding: 10px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; }
.btn-continue.undo { background: #8B7BC7; }
.over-score { font-size: 18px; font-weight: 700; color: #776E65; margin-top: 6px; }

.intro-overlay { position: absolute; inset: 24px; max-width: 380px; margin: 0 auto; background: rgba(255,255,255,0.94); z-index: 6; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; border-radius: 12px; }
.intro-title { font-size: 28px; font-weight: 800; color: #1B355A; margin-bottom: 12px; }
.intro-desc { font-size: 14px; color: #555; line-height: 1.6; }

.game-header.shake { animation: header-shake 0.25s ease-in-out; }
@keyframes header-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  50% { transform: translateX(6px); }
  75% { transform: translateX(-3px); }
}

.game-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-top: 1px solid #eee; flex-shrink: 0; gap: 8px; }
.score-display { display: flex; flex-direction: column; }
.score-label { font-size: 11px; color: #999; font-weight: 600; letter-spacing: 1px; }
.score-value { font-size: 24px; font-weight: 700; color: #1B355A; }
.score-display { position: relative; }
.gain-popup { position: absolute; right: 0; top: 100%; font-size: 16px; font-weight: 800; color: #776E65; pointer-events: none; }
.gain-enter-active { transition: transform 0.6s ease-out, opacity 0.6s; }
.gain-enter-from { opacity: 1; }
.gain-leave-to { opacity: 0; transform: translateY(18px); }
.gain-leave-active { transition: opacity 0.3s, transform 0.5s ease-out; }
.footer-btns { display: flex; gap: 8px; }
.btn-start, .btn-restart { background: linear-gradient(135deg, #4D9BC6, #3A8AB5); color: #fff; border: none; padding: 12px 28px; border-radius: 14px; font-size: 15px; font-weight: 700; cursor: pointer; transition: transform 0.1s; box-shadow: 0 4px 12px rgba(77, 155, 198, 0.3); }
.btn-start:active, .btn-restart:active { transform: scale(0.95); }
.btn-share { background: #1B355A; color: #fff; border: none; padding: 12px 20px; border-radius: 14px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.1s; }
.btn-share:active { transform: scale(0.95); }
.btn-undo { background: #fff; color: #1B355A; border: 1.5px solid #1B355A; padding: 12px 18px; border-radius: 14px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.1s; }
.btn-undo:active { transform: scale(0.95); }

.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>

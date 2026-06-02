<template>
  <div class="home">
    <header class="home-header">
      <h1 class="logo">🎮 Game Hub</h1>
      <p class="subtitle">원하는 게임을 선택하세요</p>
    </header>

    <div class="game-grid">
      <button
        v-for="game in games"
        :key="game.id"
        class="game-card"
        @click="goGame(game.route)"
      >
        <div class="game-icon">{{ game.icon }}</div>
        <div class="game-info">
          <div class="game-name">{{ game.name }}</div>
          <div class="game-desc">{{ game.desc }}</div>
        </div>
        <div class="game-badge" :class="game.status">{{ statusText(game.status) }}</div>
      </button>
    </div>

    <div class="section-title">🏆 전체 랭킹 TOP 5</div>
    <div class="global-rank">
      <div v-for="(entry, i) in globalRank" :key="i" class="rank-row">
        <span class="rank-pos">{{ medals[i] || i + 1 }}</span>
        <span class="rank-game">{{ entry.gameLabel }}</span>
        <span class="rank-score">{{ entry.score }}점</span>
      </div>
      <div v-if="globalRank.length === 0" class="rank-empty">아직 기록이 없습니다</div>
    </div>

    <div class="footer-info">
      <p>🚀 더 많은 게임이 추가됩니다!</p>
      <p class="footer-link">game.nutalk.co.kr</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getLeaderboard } from '../lib/leaderboard'

const router = useRouter()
const globalRank = ref([])
const medals = ['🥇', '🥈', '🥉']

const games = [
  {
    id: 'draw-trace',
    name: '모양 따라그리기',
    desc: '보이는 모양을 정확하게 따라 그리세요!',
    icon: '✏️',
    route: '/draw-trace',
    status: 'playable',
  },
  {
    id: 'reaction',
    name: '반응 속도 테스트',
    desc: '초록색이 되는 순간 최대한 빨리 터치!',
    icon: '⚡',
    route: '/reaction',
    status: 'playable',
  },
  {
    id: 'memory',
    name: '기억력 카드',
    desc: '카드를 뒤집고 같은 그림 짝 맞추기',
    icon: '🧠',
    route: '/memory',
    status: 'playable',
  },
  {
    id: 'color-match',
    name: '컬러 매치',
    desc: '글자 색상과 일치하는 버튼을 빠르게!',
    icon: '🎨',
    route: '/color-match',
    status: 'playable',
  },
]

const gameLabels = {
  'draw-trace': '✏️ 따라그리기',
  'reaction': '⚡ 반응속도',
  'memory': '🧠 기억력카드',
  'color-match': '🎨 컬러매치',
}

onMounted(() => {
  const all = getLeaderboard()
  all.forEach(e => { e.gameLabel = gameLabels[e.gameId] || e.gameId })
  all.sort((a, b) => b.score - a.score)
  globalRank.value = all.slice(0, 5)
})

function goGame(route) { router.push(route) }
function statusText(s) { return s === 'playable' ? 'PLAY' : 'SOON' }
</script>

<style scoped>
.home {
  min-height: 100dvh;
  background: linear-gradient(180deg, #1B355A 0%, #2A4A72 35%, #f5f5f5 35%);
  padding-bottom: 40px;
}

.home-header {
  text-align: center;
  padding: 40px 20px 28px;
  color: #fff;
}

.logo { font-size: 26px; font-weight: 800; }
.subtitle { font-size: 14px; opacity: 0.7; margin-top: 4px; }

.game-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  max-width: 480px;
  margin: 0 auto;
}

.game-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: none;
  border-radius: 14px;
  padding: 16px 18px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.12s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.game-card:active { transform: scale(0.98); }

.game-icon {
  font-size: 32px;
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f5fa;
  border-radius: 12px;
}

.game-info { flex: 1; min-width: 0; }
.game-name { font-size: 15px; font-weight: 700; color: #1B355A; }
.game-desc { font-size: 12px; color: #888; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.game-badge { flex-shrink: 0; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 8px; }
.game-badge.playable { background: #E8F5E9; color: #16A34A; }
.game-badge.soon { background: #F5F5F5; color: #999; }

.section-title {
  max-width: 480px;
  margin: 24px auto 10px;
  padding: 0 20px;
  font-size: 16px;
  font-weight: 700;
  color: #1B355A;
}

.global-rank {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 20px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  overflow: hidden;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}
.rank-row:last-child { border-bottom: none; }

.rank-pos { width: 28px; text-align: center; font-weight: 700; }
.rank-game { flex: 1; color: #555; }
.rank-score { font-weight: 700; color: #1B355A; }
.rank-empty { text-align: center; color: #aaa; font-size: 13px; padding: 20px 0; }

.footer-info { text-align: center; margin-top: 28px; color: #aaa; font-size: 12px; }
.footer-link { margin-top: 4px; color: #4D9BC6; }
</style>

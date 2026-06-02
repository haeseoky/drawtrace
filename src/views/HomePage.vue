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

    <div class="coming-soon">
      <p>🚀 더 많은 게임이 곧 추가됩니다!</p>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

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
    desc: '화면이 바뀌는 순간 최대한 빨리 터치!',
    icon: '⚡',
    route: '/reaction',
    status: 'soon',
  },
  {
    id: 'memory',
    name: '기억력 카드',
    desc: '카드를 뒤집고 같은 그림 짝 맞추기',
    icon: '🧠',
    route: '/memory',
    status: 'soon',
  },
  {
    id: 'color-match',
    name: '컬러 매치',
    desc: '글자 색상과 일치하는 버튼을 빠르게!',
    icon: '🎨',
    route: '/color-match',
    status: 'soon',
  },
]

function goGame(route) {
  router.push(route)
}

function statusText(s) {
  return s === 'playable' ? 'PLAY' : 'SOON'
}
</script>

<style scoped>
.home {
  min-height: 100dvh;
  background: linear-gradient(180deg, #1B355A 0%, #2A4A72 40%, #f5f5f5 40%);
  padding-bottom: 40px;
}

.home-header {
  text-align: center;
  padding: 48px 20px 36px;
  color: #fff;
}

.logo {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 14px;
  opacity: 0.7;
  margin-top: 6px;
}

.game-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  max-width: 480px;
  margin: 0 auto;
}

.game-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border: none;
  border-radius: 16px;
  padding: 18px 20px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.game-card:active {
  transform: scale(0.98);
}

.game-icon {
  font-size: 36px;
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f5fa;
  border-radius: 14px;
}

.game-info {
  flex: 1;
  min-width: 0;
}

.game-name {
  font-size: 16px;
  font-weight: 700;
  color: #1B355A;
}

.game-desc {
  font-size: 13px;
  color: #888;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.game-badge {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 10px;
  letter-spacing: 0.5px;
}

.game-badge.playable {
  background: #E8F5E9;
  color: #16A34A;
}

.game-badge.soon {
  background: #F5F5F5;
  color: #999;
}

.coming-soon {
  text-align: center;
  margin-top: 32px;
  color: #aaa;
  font-size: 13px;
}
</style>

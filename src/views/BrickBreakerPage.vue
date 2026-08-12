<template>
  <div class="game-page">
    <nav class="game-nav">
      <button class="btn-back" aria-label="게임 선택으로 돌아가기" @click="goBack">← 게임 선택</button>
      <span class="nav-title">🧱 핑퐁 벽돌깨기</span>
      <span class="nav-spacer"></span>
    </nav>
    <BrickBreakerGame @score="onScore" @share="onShare" />
    <Leaderboard ref="lbRef" game-id="brick-breaker" />
    <ShareModal :visible="showShare" game-name="핑퐁 벽돌깨기" :score="shareScore" @close="showShare = false" />
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BrickBreakerGame from '../components/BrickBreakerGame.vue'
import ShareModal from '../components/ShareModal.vue'
import Leaderboard from '../components/Leaderboard.vue'
const router = useRouter()
const showShare = ref(false)
const shareScore = ref(0)
const lbRef = ref(null)
function goBack() { router.push('/') }
function onScore(result) {
  shareScore.value = result.score || 0
  lbRef.value?.load()
}
function onShare() { showShare.value = true }
</script>
<style scoped>
.game-page { position: fixed; inset: 0; height: 100%; width: 100%; display: flex; flex-direction: column; overflow: hidden; touch-action: none; overscroll-behavior: none; }
.game-nav { display: flex; align-items: center; padding: 10px 16px; padding-top: calc(10px + env(safe-area-inset-top, 0px)); background: #fff; border-bottom: 1px solid #eee; flex-shrink: 0; gap: 12px; }
.btn-back { background: none; border: none; font-size: 14px; color: #4D9BC6; font-weight: 600; cursor: pointer; }
.nav-title { font-size: 15px; font-weight: 700; color: #1B355A; }
.nav-spacer { flex: 1; }
</style>

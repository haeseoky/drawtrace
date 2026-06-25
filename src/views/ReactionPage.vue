<template>
  <div class="game-page">
    <nav class="game-nav">
      <button class="btn-back" aria-label="게임 선택으로 돌아가기" @click="goBack">← 게임 선택</button>
      <span class="nav-title">⚡ 반응 속도 테스트</span>
      <span class="nav-spacer"></span>
    </nav>
    <ReactionGame @score="onScore" @share="onShare" ref="gameRef" />
    <Leaderboard ref="lbRef" game-id="reaction" />
    <ShareModal :visible="showShare" game-name="반응 속도" :score="shareScore" @close="showShare = false" />
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ReactionGame from '../components/ReactionGame.vue'
import ShareModal from '../components/ShareModal.vue'
import Leaderboard from '../components/Leaderboard.vue'
const router = useRouter()
const gameRef = ref()
const lbRef = ref(null)
const showShare = ref(false)
const shareScore = ref(0)

function goBack() { router.push('/') }
function onScore(result) {
  shareScore.value = result.score || 0
  lbRef.value?.load()
}
function onShare() { showShare.value = true }
</script>
<style scoped>
.game-page { height: 100dvh; display: flex; flex-direction: column; overflow-y: auto; }
.game-nav { display: flex; align-items: center; padding: 10px 16px; padding-top: calc(10px + env(safe-area-inset-top, 0px)); background: #fff; border-bottom: 1px solid #eee; flex-shrink: 0; gap: 12px; }
.btn-back { background: none; border: none; font-size: 14px; color: #4D9BC6; font-weight: 600; cursor: pointer; }
.nav-title { font-size: 15px; font-weight: 700; color: #1B355A; }
.nav-spacer { flex: 1; }
</style>

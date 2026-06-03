<template>
  <div class="game-page">
    <nav class="game-nav">
      <button class="btn-back" @click="goBack">← 게임 선택</button>
      <span class="nav-title">🎨 컬러 매치</span>
      <span class="nav-spacer"></span>
    </nav>
    <ColorMatchGame @score="onScore" @share="onShare" />
    <Leaderboard v-show="false" :game-id="'color-match'" ref="lbRef" />
    <ShareModal :visible="showShare" game-name="컬러 매치" :score="shareScore" @close="showShare = false" />
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ColorMatchGame from '../components/ColorMatchGame.vue'
import Leaderboard from '../components/Leaderboard.vue'
import ShareModal from '../components/ShareModal.vue'
const router = useRouter()
const lbRef = ref()
const showShare = ref(false)
const shareScore = ref(0)
function goBack() { router.push('/') }
function onScore(result) {
  lbRef.value?.load()
  shareScore.value = result.score || 0
}
function onShare() { showShare.value = true }
</script>
<style scoped>
.game-page { height: 100dvh; display: flex; flex-direction: column; overflow-y: auto; }
.game-nav { display: flex; align-items: center; padding: 10px 16px; background: #fff; border-bottom: 1px solid #eee; flex-shrink: 0; gap: 12px; }
.btn-back { background: none; border: none; font-size: 14px; color: #4D9BC6; font-weight: 600; cursor: pointer; }
.nav-title { font-size: 15px; font-weight: 700; color: #1B355A; }
.nav-spacer { flex: 1; }
</style>

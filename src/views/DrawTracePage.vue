<template>
  <div class="game-page">
    <nav class="game-nav">
      <button class="btn-back" aria-label="게임 선택으로 돌아가기" @click="goBack">← 게임 선택</button>
      <span class="nav-title">✏️ 모양 따라그리기</span>
      <span class="nav-spacer"></span>
    </nav>
    <div class="game-area">
      <DrawGame @score="onScore" @share="onShare" />
    </div>
    <div class="leaderboard-section">
      <Leaderboard ref="lbRef" game-id="draw-trace" />
    </div>
    <ShareModal
      :visible="showShare"
      :game-name="shareData.name"
      :score="shareData.score"
      @close="showShare = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import DrawGame from '../components/DrawGame.vue'
import ShareModal from '../components/ShareModal.vue'
import Leaderboard from '../components/Leaderboard.vue'

const router = useRouter()
const showShare = ref(false)
const shareData = reactive({ name: '모양 따라그리기', score: 0 })
const lbRef = ref(null)

function goBack() { router.push('/') }
function onScore(result) {
  shareData.score = result?.score || 0
  lbRef.value?.load()
}
function onShare() { showShare.value = true }
</script>

<style scoped>
.game-page { position: fixed; inset: 0; display: flex; flex-direction: column; overflow: hidden; overscroll-behavior: none; }
.game-nav { display: flex; align-items: center; padding: 10px 16px; padding-top: calc(10px + env(safe-area-inset-top, 0px)); background: #fff; border-bottom: 1px solid #eee; flex-shrink: 0; gap: 12px; }
.game-area { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.leaderboard-section { flex-shrink: 0; max-height: 35vh; overflow-y: auto; }
.btn-back { background: none; border: none; font-size: 14px; color: #4D9BC6; font-weight: 600; cursor: pointer; }
.nav-title { font-size: 15px; font-weight: 700; color: #1B355A; }
.nav-spacer { flex: 1; }
</style>

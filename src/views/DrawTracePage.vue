<template>
  <div class="game-page">
    <nav class="game-nav">
      <button class="btn-back" @click="goBack">← 게임 선택</button>
      <span class="nav-title">✏️ 모양 따라그리기</span>
      <span class="nav-spacer"></span>
    </nav>
    <DrawGame />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import DrawGame from '../components/DrawGame.vue'

const router = useRouter()
function goBack() {
  router.push('/')
}
</script>

<style scoped>
.game-page {
  height: 100dvh;
  display: flex;
  flex-direction: column;
}

.game-nav {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
  gap: 12px;
}

.btn-back {
  background: none;
  border: none;
  font-size: 14px;
  color: #4D9BC6;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 0;
}

.nav-title {
  font-size: 15px;
  font-weight: 700;
  color: #1B355A;
}

.nav-spacer {
  flex: 1;
}
</style>

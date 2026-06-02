<template>
  <Transition name="slide">
    <div v-if="visible" class="share-modal">
      <div class="share-card">
        <h3 class="share-title">📤 결과 공유하기</h3>
        <div class="share-score">{{ gameName }} {{ score }}점!</div>
        <div class="share-buttons">
          <button class="share-btn kakao" @click="share('kakao')">💬 카카오톡</button>
          <button class="share-btn telegram" @click="share('telegram')">✈️ 텔레그램</button>
          <button class="share-btn twitter" @click="share('twitter')">🐦 X</button>
          <button class="share-btn copy" @click="share('copy')">📋 복사</button>
        </div>
        <button class="share-close" @click="$emit('close')">닫기</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { shareResult, getKakaoShareUrl, getTelegramShareUrl, getTwitterShareUrl } from '../lib/share'

const props = defineProps({ visible: Boolean, gameName: String, score: Number })
const emit = defineEmits(['close'])

async function share(type) {
  if (type === 'copy') {
    const result = await shareResult(props.gameName || '', props.score ?? 0)
    alert(result === 'clipboard' ? '클립보드에 복사되었습니다!' : '복사 실패')
  } else if (type === 'kakao') {
    window.open(getKakaoShareUrl(props.gameName, props.score ?? 0), '_blank')
  } else if (type === 'telegram') {
    window.open(getTelegramShareUrl(props.gameName, props.score ?? 0), '_blank')
  } else if (type === 'twitter') {
    window.open(getTwitterShareUrl(props.gameName, props.score ?? 0), '_blank')
  }
}
</script>

<style scoped>
.share-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.share-card { background: #fff; border-radius: 20px; padding: 28px; width: 100%; max-width: 340px; text-align: center; }
.share-title { font-size: 18px; font-weight: 700; color: #1B355A; margin-bottom: 8px; }
.share-score { font-size: 16px; color: #4D9BC6; font-weight: 600; margin-bottom: 20px; }
.share-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.share-btn { border: none; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.1s; }
.share-btn:active { transform: scale(0.95); }
.share-btn.kakao { background: #FEE500; color: #191919; }
.share-btn.telegram { background: #0088cc; color: #fff; }
.share-btn.twitter { background: #000; color: #fff; }
.share-btn.copy { background: #f0f0f0; color: #333; }
.share-close { background: none; border: none; color: #888; font-size: 14px; cursor: pointer; padding: 8px; }
.slide-enter-active, .slide-leave-active { transition: opacity 0.2s; }
.slide-enter-from, .slide-leave-to { opacity: 0; }
</style>

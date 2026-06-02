<template>
  <div class="leaderboard">
    <h3 class="lb-title">🏆 랭킹</h3>
    <div v-if="entries.length === 0" class="lb-empty">아직 기록이 없습니다</div>
    <div v-else class="lb-list">
      <div v-for="(e, i) in entries.slice(0, 10)" :key="e.id" class="lb-row" :class="{ 'lb-me': e.isMine }">
        <span class="lb-rank">{{ i < 3 ? medals[i] : i + 1 }}</span>
        <span class="lb-name">{{ e.name || '익명' }}</span>
        <span class="lb-score">{{ e.score }}점</span>
        <span class="lb-date">{{ formatDate(e.timestamp) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { getTopScores } from '../lib/leaderboard'

const props = defineProps({ gameId: String })
const entries = ref([])
const medals = ['🥇', '🥈', '🥉']

onMounted(() => { load() })
watch(() => props.gameId, () => { load() })

function load() {
  entries.value = getTopScores(props.gameId, 10)
}

function formatDate(ts) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

defineExpose({ load })
</script>

<style scoped>
.leaderboard { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.lb-title { font-size: 16px; font-weight: 700; color: #1B355A; margin-bottom: 12px; }
.lb-empty { text-align: center; color: #aaa; font-size: 13px; padding: 20px 0; }
.lb-list { display: flex; flex-direction: column; gap: 4px; }
.lb-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; font-size: 13px; }
.lb-row:nth-child(odd) { background: #f8f9fa; }
.lb-row.lb-me { background: #E8F5E9; }
.lb-rank { width: 28px; text-align: center; font-weight: 700; flex-shrink: 0; }
.lb-name { flex: 1; font-weight: 500; color: #333; }
.lb-score { font-weight: 700; color: #1B355A; min-width: 50px; text-align: right; }
.lb-date { font-size: 11px; color: #aaa; min-width: 70px; text-align: right; }
</style>

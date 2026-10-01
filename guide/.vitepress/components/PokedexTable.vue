<template>
  <div class="pokedex">
    <div class="toolbar">
      <div class="type-filter" role="group" aria-label="属性筛选">
        <button
          v-for="t in TYPES"
          :key="t"
          type="button"
          class="type-chip"
          :class="['t-' + t, { active: selectedTypes.includes(t) }]"
          @click="toggleType(t)"
        >
          {{ t }}
        </button>
      </div>
    </div>

    <p class="result-info">
      共 {{ filtered.length }} 只宝可梦
      <button v-if="hasFilter" type="button" class="reset-btn" @click="resetFilters">
        清除筛选
      </button>
    </p>

    <div class="table-wrap">
      <table class="dex-table">
        <thead>
          <tr>
            <th class="col-no">编号</th>
            <th>宝可梦</th>
            <th>属性</th>
            <th class="num">种族值</th>
            <th>标记</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filtered" :key="p.id">
            <td class="col-no">{{ String(p.id).padStart(3, '0') }}</td>
            <td>
              <a :href="detailUrl(p.id)" class="dex-name">{{ p.nameZh }}</a>
              <span class="name-en">{{ p.nameEn }}</span>
            </td>
            <td>
              <span class="type-row">
                <span
                  v-for="t in p.types"
                  :key="t"
                  class="type-tag"
                  :class="'t-' + t"
                >{{ t }}</span>
              </span>
            </td>
            <td class="num">{{ p.stats.total }}</td>
            <td>
              <span v-if="p.legendary" class="mark legendary">传说</span>
              <span v-else-if="p.mythical" class="mark mythical">幻之</span>
              <span v-else class="mark-none">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import data from '../data/pokedex.json'

// 属性配色统一定义在 style.css 的 .t-{属性} 变量中，此处只列名称
const TYPES = [
  '一般', '火', '水', '电', '草', '冰', '格斗', '毒', '地面', '飞行',
  '超能', '虫', '岩石', '幽灵', '龙', '恶', '钢', '妖精'
]

const selectedTypes = ref([])

const dex = data.dex

const filtered = computed(() => {
  if (!selectedTypes.value.length) return dex
  return dex.filter((p) => p.types.some((t) => selectedTypes.value.includes(t)))
})

const hasFilter = computed(() => selectedTypes.value.length > 0)

function detailUrl(id) {
  return `/pokedex/${String(id).padStart(3, '0')}`
}

function toggleType(t) {
  const i = selectedTypes.value.indexOf(t)
  if (i >= 0) selectedTypes.value.splice(i, 1)
  else selectedTypes.value.push(t)
}

function resetFilters() {
  selectedTypes.value = []
}
</script>

<style scoped>
.pokedex {
  margin: 1rem 0;
}

.toolbar {
  margin-bottom: 0.5rem;
}

.type-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.type-chip {
  width: 2.9rem;
  padding: 0.2rem 0;
  text-align: center;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--t);
  color: var(--t-fg, #fff);
  font-size: 0.8rem;
  cursor: pointer;
  transition: filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.type-chip:hover {
  filter: brightness(1.1);
}

.type-chip.active {
  font-weight: 600;
  transform: scale(1.05);
  box-shadow: 0 0 0 2px var(--vp-c-bg), 0 0 0 4px var(--t);
}

.result-info {
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin: 0.5rem 0 1rem;
}

.reset-btn {
  margin-left: 0.6rem;
  padding: 0.1rem 0.55rem;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 999px;
  background: transparent;
  color: var(--vp-c-brand-1);
  font-size: 0.78rem;
  cursor: pointer;
}

.table-wrap {
  overflow-x: auto;
}

.dex-table {
  display: table;
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

/* 名称列吸收剩余宽度，让表格自适应撑满容器 */
.dex-table th:nth-child(2),
.dex-table td:nth-child(2) {
  width: 100%;
}

.dex-table th,
.dex-table td {
  padding: 0.45rem 0.8rem;
  border: none;
  border-bottom: 1px solid var(--vp-c-divider);
  text-align: left;
  white-space: nowrap;
}

.dex-table thead th {
  position: sticky;
  top: 0;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
  font-weight: 600;
}

.dex-table tbody tr:last-child td {
  border-bottom: none;
}

.dex-table tbody tr {
  transition: background-color 0.12s ease;
}

.dex-table tbody tr:hover {
  background: var(--vp-c-bg-soft);
}

.dex-name {
  font-weight: 600;
  text-decoration: none;
}

.dex-name:hover {
  color: var(--vp-c-brand-1);
}

.name-en {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-transform: capitalize;
}

.type-row {
  display: flex;
  gap: 0.3rem;
}

.type-tag {
  padding: 0.08rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--t-fg, #fff);
  background: var(--t, #888);
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.col-no {
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

.mark {
  padding: 0.05rem 0.45rem;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 600;
}

.mark.legendary {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.mark.mythical {
  background: rgba(168, 85, 247, 0.15);
  color: #a855f7;
}

.mark-none {
  color: var(--vp-c-text-3);
}
</style>

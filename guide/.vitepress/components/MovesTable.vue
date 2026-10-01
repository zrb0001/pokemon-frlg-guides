<template>
  <div class="moves">
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
      共 {{ filtered.length }} 个招式
      <button v-if="hasFilter" type="button" class="reset-btn" @click="resetFilters">
        清除筛选
      </button>
    </p>

    <div class="table-wrap">
      <table class="move-table">
        <thead>
          <tr>
            <th class="col-no">编号</th>
            <th>招式</th>
            <th>属性</th>
            <th>分类</th>
            <th class="num">威力</th>
            <th class="num">命中</th>
            <th class="num">PP</th>
            <th class="col-src">来源</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in filtered" :key="m.id">
            <td class="col-no">{{ String(m.id).padStart(3, '0') }}</td>
            <td>
              <a :href="detailUrl(m.id)" class="move-name">{{ m.nameZh }}</a>
              <span class="name-en">{{ m.nameEn }}</span>
            </td>
            <td><span class="mv-type" :class="'t-' + m.type">{{ m.type }}</span></td>
            <td><span class="cat-tag">{{ m.category }}</span></td>
            <td class="num">{{ num(m.power) }}</td>
            <td class="num">{{ num(m.accuracy) }}</td>
            <td class="num">{{ num(m.pp) }}</td>
            <td class="col-src">
              <span v-if="m.machine" class="tm-badge">{{ m.machine }}</span>
              <span v-else class="src-none">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import data from '../data/pokemon-details.json'

// 属性配色统一定义在 style.css 的 .t-{属性} 变量中，此处只列名称（与数据中的属性名一致）
const TYPES = [
  '一般', '火', '水', '电', '草', '冰', '格斗', '毒', '地面', '飞行',
  '超能', '虫', '岩石', '幽灵', '龙', '恶', '钢', '妖精'
]

const selectedTypes = ref([])

const moves = Object.entries(data.moves)
  .map(([id, m]) => ({ id: Number(id), ...m, machine: data.machines[id] ?? null }))
  .sort((a, b) => a.id - b.id)

const num = (v) => (v ?? null) === null ? '—' : String(v)

const filtered = computed(() => {
  if (!selectedTypes.value.length) return moves
  return moves.filter((m) => selectedTypes.value.includes(m.type))
})

const hasFilter = computed(() => selectedTypes.value.length > 0)

function detailUrl(id) {
  return `/moves/${String(id).padStart(3, '0')}`
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
.moves {
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

.move-table {
  display: table;
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

/* 名称列吸收剩余宽度，让表格自适应撑满容器 */
.move-table th:nth-child(2),
.move-table td:nth-child(2) {
  width: 100%;
}

.move-table th,
.move-table td {
  padding: 0.45rem 0.8rem;
  border: none;
  border-bottom: 1px solid var(--vp-c-divider);
  text-align: left;
  white-space: nowrap;
}

.move-table thead th {
  position: sticky;
  top: 0;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
  font-weight: 600;
}

.move-table tbody tr:last-child td {
  border-bottom: none;
}

.move-table tbody tr {
  transition: background-color 0.12s ease;
}

.move-table tbody tr:hover {
  background: var(--vp-c-bg-soft);
}

.move-name {
  font-weight: 600;
  text-decoration: none;
}

.move-name:hover {
  color: var(--vp-c-brand-1);
}

.name-en {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-transform: capitalize;
}

.cat-tag {
  display: inline-block;
  padding: 0.05rem 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.col-no {
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

.tm-badge {
  padding: 0.05rem 0.4rem;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 4px;
  color: var(--vp-c-brand-1);
  font-size: 0.72rem;
  font-weight: 600;
}

.src-none {
  color: var(--vp-c-text-3);
}
</style>

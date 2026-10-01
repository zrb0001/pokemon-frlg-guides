<template>
  <button
    type="button"
    class="palette-toggle"
    :title="isLeafGreen ? '切换为火红配色' : '切换为叶绿配色'"
    @click="toggle"
  >
    <span class="dot" aria-hidden="true" />
    <span>{{ isLeafGreen ? '叶绿' : '火红' }}</span>
  </button>
</template>

<script setup>
import { ref } from 'vue'

const isLeafGreen = ref(false)

function toggle() {
  isLeafGreen.value = !isLeafGreen.value
  document.documentElement.dataset.palette = isLeafGreen.value
    ? 'leafgreen'
    : 'firered'
}
</script>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  id: string
  data: { text: string }
}>()

const copied = ref(false)

import { ref } from 'vue'

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1200)
}
</script>

<template>
  <div class="output-node">
    <Handle type="target" :position="Position.Left" class="handle-dot" />
    <div class="node-header">
      <span class="material-icons icon">output</span>
      <span class="name">输出</span>
      <button @click="copyText(data.text)" class="copy-btn">
        <span class="material-icons">{{ copied ? 'check' : 'content_copy' }}</span>
      </button>
    </div>
    <div class="node-body">
      <pre class="output-text">{{ data.text || '(空)' }}</pre>
    </div>
  </div>
</template>

<style scoped>
.output-node {
  background: #1f1a14;
  border: 2px solid #000;
  border-radius: 8px;
  width: 240px;
  font-family: 'Space Grotesk', sans-serif;
  box-shadow: 3px 3px 0 0 #000;
}
.output-node:hover { border-color: #84cc16; }
.node-header {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px; border-bottom: 1px solid #333;
}
.node-header .icon { font-size: 14px; color: #84cc16; }
.node-header .name { font-size: 11px; font-weight: 700; color: #e5e5e5; flex: 1; }
.copy-btn {
  background: none; border: none; cursor: pointer; padding: 2px;
  color: #666; display: flex; align-items: center; border-radius: 4px;
}
.copy-btn:hover { color: #84cc16; }
.copy-btn .material-icons { font-size: 14px; }
.node-body { padding: 6px 8px; }
.output-text {
  background: #231c0f; color: #e5e5e5; border: 1px solid #444;
  border-radius: 4px; padding: 4px 6px; font-size: 10px; font-family: monospace;
  max-height: 80px; overflow: auto; white-space: pre-wrap; word-break: break-all;
  margin: 0;
}
.handle-dot {
  width: 12px !important; height: 12px !important;
  background: #f9b11f !important; border: 2px solid #000 !important; border-radius: 50%;
}
</style>

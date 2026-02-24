<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  id: string
  data: { text: string }
}>()

const emit = defineEmits<{
  (e: 'updateText', value: string): void
}>()
</script>

<template>
  <div class="input-node">
    <div class="node-header">
      <span class="material-icons icon">input</span>
      <span class="name">输入</span>
    </div>
    <div class="node-body">
      <textarea :value="data.text" @input="emit('updateText', ($event.target as HTMLTextAreaElement).value)"
        rows="3" placeholder="在此输入文本..." class="text-area" />
    </div>
    <Handle type="source" :position="Position.Right" class="handle-dot" />
  </div>
</template>

<style scoped>
.input-node {
  background: #1f1a14;
  border: 2px solid #000;
  border-radius: 8px;
  width: 220px;
  font-family: 'Space Grotesk', sans-serif;
  box-shadow: 3px 3px 0 0 #000;
}
.input-node:hover { border-color: #f9b11f; }
.node-header {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px; border-bottom: 1px solid #333;
}
.node-header .icon { font-size: 14px; color: #f9b11f; }
.node-header .name { font-size: 11px; font-weight: 700; color: #e5e5e5; }
.node-body { padding: 6px 8px; }
.text-area {
  width: 100%; background: #231c0f; color: #e5e5e5; border: 1px solid #444;
  border-radius: 4px; padding: 4px 6px; font-size: 10px; font-family: monospace;
  outline: none; resize: vertical; min-height: 40px;
}
.text-area:focus { border-color: #f9b11f; }
.handle-dot {
  width: 12px !important; height: 12px !important;
  background: #f9b11f !important; border: 2px solid #000 !important; border-radius: 50%;
}
</style>

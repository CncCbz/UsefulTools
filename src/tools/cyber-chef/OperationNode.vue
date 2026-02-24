<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { operations, type OperationDef } from './operations'

const props = defineProps<{
  id: string
  data: {
    opId: string
    params: Record<string, any>
    enabled: boolean
    error: string
    output: string
  }
}>()

const emit = defineEmits<{
  (e: 'remove'): void
  (e: 'toggle'): void
  (e: 'updateParam', key: string, value: any): void
}>()

const opDef = computed<OperationDef | undefined>(() => operations.find(o => o.id === props.data.opId))
</script>

<template>
  <div class="op-node" :class="{ disabled: !data.enabled, 'has-error': data.error }">
    <!-- 顶部 target handle -->
    <Handle type="target" :position="Position.Left" class="handle-dot" />

    <!-- 头部 -->
    <div class="node-header">
      <span class="material-icons icon">{{ opDef?.icon || 'extension' }}</span>
      <span class="name">{{ opDef?.name || data.opId }}</span>
      <div class="actions">
        <button @click="emit('toggle')" class="action-btn" :title="data.enabled ? '禁用' : '启用'">
          <span class="material-icons">{{ data.enabled ? 'visibility' : 'visibility_off' }}</span>
        </button>
        <button @click="emit('remove')" class="action-btn delete" title="删除">
          <span class="material-icons">close</span>
        </button>
      </div>
    </div>

    <!-- 参数区 -->
    <div v-if="opDef?.params.length" class="node-params">
      <label v-for="param in opDef.params" :key="param.key" class="param-row">
        <span class="param-label">{{ param.label }}:</span>
        <select v-if="param.type === 'select'" :value="data.params[param.key]"
          @change="emit('updateParam', param.key, ($event.target as HTMLSelectElement).value)"
          class="param-input param-select">
          <option v-for="opt in param.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <input v-else-if="param.type === 'number'" :value="data.params[param.key]" type="number"
          @input="emit('updateParam', param.key, Number(($event.target as HTMLInputElement).value))"
          class="param-input param-number" />
        <input v-else-if="param.type === 'boolean'" :checked="data.params[param.key]" type="checkbox"
          @change="emit('updateParam', param.key, ($event.target as HTMLInputElement).checked)"
          class="param-checkbox" />
        <input v-else :value="data.params[param.key]" type="text"
          @input="emit('updateParam', param.key, ($event.target as HTMLInputElement).value)"
          class="param-input param-text" />
      </label>
    </div>

    <!-- 错误提示 -->
    <div v-if="data.error" class="node-error">
      <span class="material-icons">error</span>{{ data.error }}
    </div>

    <!-- 底部 source handle -->
    <Handle type="source" :position="Position.Right" class="handle-dot" />
  </div>
</template>

<style scoped>
.op-node {
  background: #1f1a14;
  border: 2px solid #000;
  border-radius: 8px;
  min-width: 180px;
  max-width: 240px;
  font-family: 'Space Grotesk', sans-serif;
  box-shadow: 3px 3px 0 0 #000;
  transition: border-color 0.15s;
}
.op-node:hover { border-color: #f9b11f; }
.op-node.disabled { opacity: 0.5; }
.op-node.has-error { border-color: #ff6b6b; }

.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid #333;
}
.node-header .icon { font-size: 14px; color: #f9b11f; }
.node-header .name { font-size: 11px; font-weight: 700; color: #e5e5e5; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.actions { display: flex; gap: 2px; }
.action-btn {
  background: none; border: none; cursor: pointer; padding: 2px;
  color: #666; display: flex; align-items: center; justify-content: center;
  border-radius: 4px; transition: color 0.15s;
}
.action-btn:hover { color: #f9b11f; }
.action-btn.delete:hover { color: #ff6b6b; }
.action-btn .material-icons { font-size: 14px; }

.node-params { padding: 4px 8px 6px; }
.param-row { display: flex; align-items: center; gap: 4px; margin-bottom: 3px; }
.param-label { font-size: 10px; color: #888; white-space: nowrap; }
.param-input {
  height: 20px; background: #231c0f; color: #e5e5e5; border: 1px solid #444;
  border-radius: 4px; padding: 0 4px; font-size: 10px; font-family: monospace;
  outline: none; flex: 1; min-width: 0;
}
.param-input:focus { border-color: #f9b11f; }
.param-select { padding-right: 12px; }
.param-number { width: 50px; text-align: center; flex: none; }
.param-checkbox { accent-color: #f9b11f; }

.node-error {
  padding: 2px 8px 4px; font-size: 10px; color: #ff6b6b;
  display: flex; align-items: center; gap: 3px;
}
.node-error .material-icons { font-size: 12px; }

.handle-dot {
  width: 12px !important;
  height: 12px !important;
  background: #f9b11f !important;
  border: 2px solid #000 !important;
  border-radius: 50%;
}
</style>

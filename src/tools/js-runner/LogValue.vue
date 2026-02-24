<script setup lang="ts">
import { ref } from 'vue'

export interface LogVal {
  t: 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'function' | 'symbol' | 'object' | 'array' | 'error' | 'date' | 'regexp'
  /** 折叠时的预览文本 */
  p: string
  /** 对象/数组的子条目 */
  e?: { k: string; v: LogVal }[]
}

const props = defineProps<{ node: LogVal; depth?: number }>()
const open = ref(false)
const hasChildren = props.node.e && props.node.e.length > 0

const colorMap: Record<string, string> = {
  string: 'text-neon-green',
  number: 'text-electric-blue',
  boolean: 'text-vibrant-purple',
  null: 'text-gray-500 italic',
  undefined: 'text-gray-500 italic',
  function: 'text-gray-400 italic',
  symbol: 'text-primary',
  date: 'text-primary',
  regexp: 'text-coral-red',
  error: 'text-coral-red',
  object: 'text-gray-200',
  array: 'text-gray-200',
}
</script>

<template>
  <span class="inline">
    <!-- 可折叠节点 -->
    <template v-if="hasChildren">
      <span
        class="cursor-pointer select-none inline-flex items-baseline gap-0.5 hover:brightness-125"
        @click="open = !open"
      >
        <span class="text-gray-500 text-[11px] leading-none" style="font-family: monospace;">{{ open ? '▼' : '▶' }}</span>
        <span :class="colorMap[node.t]">{{ node.p }}</span>
      </span>
      <div v-if="open" class="pl-4 border-l border-white/10 ml-1.5 mt-0.5">
        <div v-for="(entry, i) in node.e" :key="i" class="leading-6">
          <span class="text-primary/80">{{ entry.k }}</span><span class="text-gray-500">: </span>
          <LogValue :node="entry.v" :depth="(depth ?? 0) + 1" />
        </div>
      </div>
    </template>
    <!-- 叶子节点 -->
    <span v-else :class="colorMap[node.t]">{{ node.p }}</span>
  </span>
</template>

<script lang="ts">
export default { name: 'LogValue' }
</script>


<script setup lang="ts">
import { ref } from 'vue'

const count = ref(5)
const version = ref<'v4' | 'v7'>('v4')
const uuids = ref<string[]>([])
const copyField = ref('')

function generateV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function generateV7(): string {
  const now = Date.now()
  const hex = now.toString(16).padStart(12, '0')
  const rand = () => Math.random().toString(16).slice(2)
  const r = rand() + rand()
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-7${r.slice(0, 3)}-${((parseInt(r[3], 16) & 0x3) | 0x8).toString(16)}${r.slice(4, 7)}-${r.slice(7, 19)}`
}

function generate() {
  const fn = version.value === 'v4' ? generateV4 : generateV7
  uuids.value = Array.from({ length: count.value }, () => fn())
}

async function copy(text: string, field: string) {
  await navigator.clipboard.writeText(text)
  copyField.value = field
  setTimeout(() => { copyField.value = '' }, 1200)
}

async function copyAll() {
  await navigator.clipboard.writeText(uuids.value.join('\n'))
  copyField.value = 'all'
  setTimeout(() => { copyField.value = '' }, 1200)
}

// 初始生成
generate()
</script>

<template>
  <div class="flex flex-col h-full gap-5">
    <!-- 控制区 -->
    <div class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-icons text-primary text-lg">fingerprint</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">UUID 生成器</span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex gap-2">
          <button v-for="v in (['v4', 'v7'] as const)" :key="v" @click="version = v"
            class="h-10 px-4 font-bold border-2 border-black rounded text-sm transition-all"
            :class="version === v ? 'bg-primary text-black shadow-none translate-x-0.5 translate-y-0.5' : 'bg-bg-dark text-gray-400 shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5'">
            {{ v.toUpperCase() }}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">数量:</span>
          <input v-model.number="count" type="number" min="1" max="100"
            class="w-16 h-10 bg-bg-dark text-gray-100 border-2 border-black rounded px-2 font-mono text-sm text-center outline-none focus:border-primary" />
        </div>
        <button @click="generate"
          class="h-10 px-5 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-sm">
          生成
        </button>
        <button v-if="uuids.length" @click="copyAll"
          class="h-10 px-4 bg-bg-dark text-gray-400 font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-sm">
          {{ copyField === 'all' ? '已复制' : '全部复制' }}
        </button>
      </div>
    </div>

    <!-- 结果列表 -->
    <div class="flex-1 overflow-auto bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
      <div v-for="(uuid, i) in uuids" :key="i"
        class="flex items-center justify-between py-2 px-3 rounded hover:bg-white/5 cursor-pointer group"
        @click="copy(uuid, String(i))">
        <span class="font-mono text-sm text-gray-100 select-all">{{ uuid }}</span>
        <span class="material-icons text-sm opacity-0 group-hover:opacity-100 transition-opacity"
          :class="copyField === String(i) ? 'text-neon-green' : 'text-gray-500'">
          {{ copyField === String(i) ? 'check' : 'content_copy' }}
        </span>
      </div>
    </div>
  </div>
</template>

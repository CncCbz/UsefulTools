<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'

const props = defineProps<{
  navMode?: number
}>()

const searchQuery = ref('')
const localIp = ref('...')
const copied = ref(false)

const pageTitle = computed(() => {
  if (props.navMode === 1) return { prefix: '我的', highlight: '收藏' }
  return { prefix: 'Studio', highlight: '工具集' }
})

onMounted(async () => {
  try {
    localIp.value = await invoke<string>('get_local_ip')
  } catch {
    localIp.value = '未知'
  }
})

async function copyIp() {
  try {
    await navigator.clipboard.writeText(localIp.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {}
}
</script>

<template>
  <header class="w-full p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 z-10">
    <div>
      <h1
        class="text-4xl md:text-5xl font-bold uppercase tracking-tighter text-white"
        style="-webkit-text-stroke: 1.5px black; filter: drop-shadow(4px 4px 0 rgba(0,0,0,1));"
      >
        {{ pageTitle.prefix }}<span class="text-primary">{{ pageTitle.highlight }}</span>
      </h1>
    </div>

    <!-- Search -->
    <div class="w-full md:w-auto flex-1 max-w-xl">
      <div class="relative group">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索工具..."
          data-search-input
          class="w-full bg-white text-black font-bold uppercase placeholder-gray-500 border-[3px] border-black rounded-lg py-2.5 px-5 shadow-hard-sm focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] focus:ring-0 focus:border-black transition-all outline-none text-sm"
        />
        <span class="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-black text-2xl pointer-events-none">search</span>
      </div>
    </div>

    <!-- Local IP -->
    <button
      class="flex items-center gap-2 px-4 py-2 border-2 border-black bg-deep-charcoal rounded shadow-hard-sm font-bold text-sm uppercase hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all select-none"
      title="点击复制 IP"
      @click="copyIp"
    >
      <span class="material-icons text-primary text-lg">lan</span>
      <span class="text-white/70">IP</span>
      <span class="text-primary">{{ localIp }}</span>
      <span
        class="material-icons text-xs transition-all"
        :class="copied ? 'text-neon-green' : 'text-white/40'"
      >{{ copied ? 'check' : 'content_copy' }}</span>
    </button>

  </header>
</template>


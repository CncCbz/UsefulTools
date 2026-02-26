<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { tools } from '../data/tools'
import { useTabs } from '../composables/useTabs'
import { useFavorites } from '../composables/useFavorites'

const model = defineModel<boolean>({ default: false })
const { openTab } = useTabs()
const { isFavorite } = useFavorites()

const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const filtered = computed(() => {
  if (!query.value.trim()) return tools
  const q = query.value.toLowerCase()
  return tools.filter(t =>
    t.subtitle.toLowerCase().includes(q) ||
    t.categories.some(c => c.toLowerCase().includes(q))
  )
})

watch(model, (val) => {
  if (val) {
    query.value = ''
    selectedIndex.value = 0
    nextTick(() => inputRef.value?.focus())
  }
})

watch(query, () => { selectedIndex.value = 0 })

function select(toolId: string) {
  openTab(toolId)
  model.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, filtered.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter' && filtered.value.length > 0) {
    e.preventDefault()
    select(filtered.value[selectedIndex.value].id)
  } else if (e.key === 'Escape') {
    model.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="model" class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" @click.self="model = false">
      <div class="absolute inset-0 bg-black/50" @click="model = false" />
      <div class="relative w-full max-w-lg bg-deep-charcoal border-3 border-black rounded-xl shadow-hard-xl overflow-hidden z-10">
        <!-- 搜索输入 -->
        <div class="flex items-center gap-2 px-4 py-3 border-b-2 border-black/40">
          <span class="material-icons text-primary text-lg">search</span>
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="搜索工具..."
            class="flex-1 bg-transparent text-white text-sm font-bold outline-none placeholder-white/30"
            @keydown="onKeydown"
          />
          <kbd class="text-[10px] text-white/30 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 font-bold">ESC</kbd>
        </div>

        <!-- 结果列表 -->
        <div class="max-h-[50vh] overflow-y-auto py-1 scrollbar-thin">
          <button
            v-for="(tool, i) in filtered"
            :key="tool.id"
            class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
            :class="i === selectedIndex ? 'bg-primary/15 text-primary' : 'text-white/60 hover:bg-white/5 hover:text-white/80'"
            @click="select(tool.id)"
            @mouseenter="selectedIndex = i"
          >
            <span class="material-icons text-base">{{ tool.icon }}</span>
            <div class="flex-1 min-w-0">
              <span class="text-xs font-bold">{{ tool.subtitle }}</span>
              <span class="text-[10px] text-white/30 ml-2">{{ tool.categories.join(' · ') }}</span>
            </div>
            <span v-if="isFavorite(tool.id)" class="material-icons text-coral-red text-xs">favorite</span>
          </button>
          <div v-if="filtered.length === 0" class="text-center text-white/20 text-xs py-8">
            无匹配工具
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

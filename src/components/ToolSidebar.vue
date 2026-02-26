<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePluginStore } from '../composables/usePluginStore'
import { useTabs } from '../composables/useTabs'
import { useFavorites } from '../composables/useFavorites'

const route = useRoute()
const { openTab } = useTabs()
const { isFavorite } = useFavorites()
const { activeTools, allCategories } = usePluginStore()

const activeFilter = ref<'all' | 'fav'>('all')

// 默认折叠所有分类
const collapsedCats = reactive(new Set<string>(allCategories.value))

// 当分类变化时，新分类也默认折叠
watch(allCategories, (cats) => {
  for (const cat of cats) {
    if (!collapsedCats.has(cat)) collapsedCats.add(cat)
  }
})

// 路由变化时自动展开当前工具所在分类
watch(() => route.path, (path) => {
  const tool = activeTools.value.find(t => t.route === path)
  if (tool) {
    for (const cat of tool.categories) {
      collapsedCats.delete(cat)
    }
  }
}, { immediate: true })

function toggleCat(cat: string) {
  if (collapsedCats.has(cat)) collapsedCats.delete(cat)
  else collapsedCats.add(cat)
}

const filteredTools = computed(() => {
  if (activeFilter.value === 'fav') {
    return activeTools.value.filter(t => isFavorite(t.id))
  }
  return activeTools.value
})

const groupedTools = computed(() => {
  const map = new Map<string, ToolInfo[]>()
  for (const t of filteredTools.value) {
    for (const cat of t.categories) {
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(t)
    }
  }
  return map
})
</script>

<template>
  <aside class="h-full w-52 bg-deep-charcoal border-r-3 border-black flex flex-col shrink-0 select-none">
    <!-- 全部/收藏筛选 -->
    <div class="flex gap-1 px-2 py-2 shrink-0">
      <button
        class="flex-1 text-center py-1 rounded text-[10px] font-bold transition-all"
        :class="activeFilter === 'all' ? 'bg-primary/20 text-primary' : 'text-white/40 hover:text-white/60'"
        @click="activeFilter = 'all'"
      >全部</button>
      <button
        class="flex-1 text-center py-1 rounded text-[10px] font-bold transition-all"
        :class="activeFilter === 'fav' ? 'bg-coral-red/20 text-coral-red' : 'text-white/40 hover:text-white/60'"
        @click="activeFilter = 'fav'"
      >
        <span class="material-icons text-[10px] align-middle mr-0.5">favorite</span>收藏
      </button>
    </div>

    <!-- 工具列表 -->
    <div class="flex-1 overflow-y-auto px-1 pb-2 scrollbar-thin">
      <div v-for="[cat, catTools] in groupedTools" :key="cat" class="mt-1">
        <button
          class="w-full flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white/25 uppercase tracking-wider hover:text-white/40 transition-colors"
          @click="toggleCat(cat)"
        >
          <span class="material-icons transition-transform duration-150" style="font-size: 10px" :class="collapsedCats.has(cat) ? '-rotate-90' : ''">expand_more</span>
          {{ cat }}
        </button>
        <template v-if="!collapsedCats.has(cat)">
          <button
            v-for="tool in catTools"
            :key="tool.id"
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all"
            :class="route.path === tool.route
              ? 'bg-primary/15 text-primary font-bold'
              : 'text-white/50 hover:text-white/80 hover:bg-white/5'"
            @click="openTab(tool.id)"
          >
            <span class="material-icons text-sm">{{ tool.icon }}</span>
            <span class="truncate">{{ tool.subtitle }}</span>
          </button>
        </template>
      </div>
      <div v-if="filteredTools.length === 0" class="text-center text-white/20 text-xs py-6">
        无匹配工具
      </div>
    </div>
  </aside>
</template>

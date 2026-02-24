<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import DashboardHeader from './components/DashboardHeader.vue'
import { tools } from './data/tools'
import { useFavorites } from './composables/useFavorites'

const route = useRoute()
const router = useRouter()
const sidebarNav = ref(0)
const { isFavorite, toggleFavorite } = useFavorites()

const isHome = computed(() => route.path === '/')
const currentTool = computed(() => tools.find(t => t.route === route.path))
const currentToolName = computed(() => currentTool.value?.subtitle || '')
const currentToolIcon = computed(() => currentTool.value?.icon || 'build')
const currentToolId = computed(() => currentTool.value?.id || '')
</script>

<template>
  <!-- 首页：带 Sidebar + Header 的 Dashboard 布局 -->
  <div v-if="isHome" class="h-screen overflow-hidden flex flex-col md:flex-row">
    <Sidebar v-model="sidebarNav" />

    <main class="flex-1 flex flex-col h-full overflow-hidden relative">
      <div
        class="absolute inset-0 opacity-10 pointer-events-none z-0"
        style="background-image: radial-gradient(#f9b11f 1px, transparent 1px); background-size: 20px 20px;"
      />

      <DashboardHeader :nav-mode="sidebarNav" />

      <div class="flex-1 overflow-y-auto p-6 md:p-8 z-10 pb-20">
        <router-view :nav-mode="sidebarNav" />
      </div>
    </main>
  </div>

  <!-- 工具页：全屏布局 -->
  <div v-else class="h-screen flex flex-col overflow-hidden bg-bg-dark">
    <header class="flex items-center gap-3 px-5 py-3 border-b-4 border-black bg-deep-charcoal z-10 shrink-0">
      <button
        class="px-3 py-1.5 bg-deep-charcoal text-white font-bold border-2 border-white/20 rounded shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:border-primary transition-all flex items-center gap-1.5 text-sm"
        @click="router.push('/')"
      >
        <span class="material-icons text-base">arrow_back</span>
        返回
      </button>
      <div class="w-px h-6 bg-white/10" />
      <span class="material-icons text-primary text-xl">{{ currentToolIcon }}</span>
      <span class="text-lg font-bold text-white uppercase tracking-wide">{{ currentToolName }}</span>

      <!-- 收藏按钮 -->
      <button
        class="ml-auto w-9 h-9 rounded-lg border-2 flex items-center justify-center transition-all hover:scale-110"
        :class="isFavorite(currentToolId) ? 'bg-coral-red border-coral-red' : 'bg-transparent border-white/20 hover:border-coral-red'"
        @click="toggleFavorite(currentToolId)"
      >
        <span class="material-icons text-lg" :class="isFavorite(currentToolId) ? 'text-white' : 'text-gray-400'">
          {{ isFavorite(currentToolId) ? 'favorite' : 'favorite_border' }}
        </span>
      </button>
    </header>

    <div class="flex-1 overflow-y-auto p-5">
      <router-view />
    </div>
  </div>
</template>
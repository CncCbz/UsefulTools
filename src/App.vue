<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import Sidebar from './components/Sidebar.vue'
import DashboardHeader from './components/DashboardHeader.vue'
import { tools } from './data/tools'
import { useFavorites } from './composables/useFavorites'
import { useSettings, exportAllData, importAllData } from './composables/useSettings'

const route = useRoute()
const router = useRouter()
const settings = useSettings()
const sidebarNav = ref(settings.value.defaultPage)
const { isFavorite, toggleFavorite } = useFavorites()

const isHome = computed(() => route.path === '/')
const currentTool = computed(() => tools.find(t => t.route === route.path))
const currentToolName = computed(() => currentTool.value?.subtitle || '')
const currentToolIcon = computed(() => currentTool.value?.icon || 'build')
const currentToolId = computed(() => currentTool.value?.id || '')

// 保持首页滚动位置
const homeScrollRef = ref<HTMLElement | null>(null)
let savedScrollTop = 0

watch(isHome, (val, oldVal) => {
  if (oldVal && !val && homeScrollRef.value) {
    savedScrollTop = homeScrollRef.value.scrollTop
  }
  if (val && !oldVal) {
    nextTick(() => {
      if (homeScrollRef.value) {
        homeScrollRef.value.scrollTop = savedScrollTop
      }
    })
  }
})

// 设置弹窗
const showSettings = ref(false)
const settingsTab = ref<'general' | 'about'>('general')

// 全局搜索快捷键
function handleGlobalKey(e: KeyboardEvent) {
  const shortcut = settings.value.searchShortcut
  const ctrl = shortcut.includes('Ctrl')
  const alt = shortcut.includes('Alt')
  const key = shortcut.split('+').pop()?.toUpperCase()

  if (ctrl === (e.ctrlKey || e.metaKey) && alt === e.altKey && e.key.toUpperCase() === key) {
    e.preventDefault()
    if (!isHome.value) router.push('/')
    nextTick(() => {
      const input = document.querySelector<HTMLInputElement>('[data-search-input]')
      input?.focus()
    })
  }
}

onMounted(() => document.addEventListener('keydown', handleGlobalKey))
onBeforeUnmount(() => document.removeEventListener('keydown', handleGlobalKey))

// 导出数据
async function handleExport() {
  try {
    const filePath = await save({
      defaultPath: `usefultools-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (!filePath) return
    await writeTextFile(filePath, exportAllData())
  } catch {}
}

// 导入数据
async function handleImport() {
  try {
    const filePath = await open({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      multiple: false,
    })
    if (!filePath) return
    const content = await readTextFile(filePath as string)
    importAllData(content)
    sidebarNav.value = settings.value.defaultPage
    importSuccess.value = true
    setTimeout(() => { importSuccess.value = false }, 2000)
  } catch {
    importError.value = true
    setTimeout(() => { importError.value = false }, 2000)
  }
}

const importSuccess = ref(false)
const importError = ref(false)
</script>

<template>
  <!-- 首页：带 Sidebar + Header 的 Dashboard 布局 -->
  <div v-if="isHome" class="h-screen overflow-hidden flex flex-col md:flex-row">
    <Sidebar v-model="sidebarNav" @open-settings="showSettings = true" />

    <main class="flex-1 flex flex-col h-full overflow-hidden relative">
      <div
        class="absolute inset-0 opacity-10 pointer-events-none z-0"
        style="background-image: radial-gradient(#f9b11f 1px, transparent 1px); background-size: 20px 20px;"
      />

      <DashboardHeader :nav-mode="sidebarNav" />

      <div ref="homeScrollRef" class="flex-1 overflow-y-auto p-6 md:p-8 z-10 pb-20">
        <router-view :nav-mode="sidebarNav" />
      </div>
    </main>

    <!-- 设置弹窗 -->
    <Teleport to="body">
      <div v-if="showSettings" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/60" @click="showSettings = false" />
        <div class="relative bg-deep-charcoal border-4 border-black rounded-xl shadow-hard p-8 w-full max-w-lg z-10 max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-white uppercase tracking-tight">
              <span class="text-primary">设置</span>
            </h2>
            <button
              class="w-9 h-9 rounded-lg border-2 border-white/20 flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-all"
              @click="showSettings = false"
            >
              <span class="material-icons text-white text-lg">close</span>
            </button>
          </div>

          <!-- Tab 切换 -->
          <div class="flex gap-2 mb-6">
            <button
              v-for="tab in [{ key: 'general' as const, label: '通用', icon: 'tune' }, { key: 'about' as const, label: '关于', icon: 'info' }]"
              :key="tab.key"
              class="flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 font-bold text-xs uppercase transition-all"
              :class="settingsTab === tab.key
                ? 'bg-primary border-black text-black shadow-hard-sm'
                : 'bg-[#332b1f] border-black text-white/60 hover:text-white hover:border-primary'"
              @click="settingsTab = tab.key"
            >
              <span class="material-icons text-sm">{{ tab.icon }}</span>
              {{ tab.label }}
            </button>
          </div>

          <!-- 通用设置 -->
          <div v-if="settingsTab === 'general'" class="space-y-1">
            <!-- 默认首页 -->
            <div class="flex items-center justify-between py-3">
              <div>
                <span class="text-white font-bold text-sm">默认首页</span>
                <p class="text-white/40 text-xs mt-0.5">启动时显示的页面</p>
              </div>
              <div class="flex gap-2">
                <button
                  v-for="opt in [{ val: 0, label: '工具', icon: 'construction' }, { val: 1, label: '收藏', icon: 'favorite' }]"
                  :key="opt.val"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-bold text-xs uppercase transition-all"
                  :class="settings.defaultPage === opt.val
                    ? 'bg-primary border-black text-black shadow-hard-sm'
                    : 'bg-[#332b1f] border-black text-white/60 hover:text-white hover:border-primary'"
                  @click="settings.defaultPage = opt.val"
                >
                  <span class="material-icons text-sm">{{ opt.icon }}</span>
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <!-- 卡片列数 -->
            <div class="flex items-center justify-between py-3 border-t border-white/10">
              <div>
                <span class="text-white font-bold text-sm">卡片列数</span>
                <p class="text-white/40 text-xs mt-0.5">首页工具卡片的列数</p>
              </div>
              <div class="flex gap-1.5">
                <button
                  v-for="opt in [{ val: 0, label: '自动' }, { val: 3, label: '3' }, { val: 4, label: '4' }, { val: 5, label: '5' }, { val: 6, label: '6' }]"
                  :key="opt.val"
                  class="px-2.5 py-1.5 rounded-lg border-2 font-bold text-xs transition-all min-w-[36px] text-center"
                  :class="settings.gridColumns === opt.val
                    ? 'bg-primary border-black text-black shadow-hard-sm'
                    : 'bg-[#332b1f] border-black text-white/60 hover:text-white hover:border-primary'"
                  @click="settings.gridColumns = opt.val"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <!-- 搜索快捷键 -->
            <div class="flex items-center justify-between py-3 border-t border-white/10">
              <div>
                <span class="text-white font-bold text-sm">搜索快捷键</span>
                <p class="text-white/40 text-xs mt-0.5">全局聚焦搜索框</p>
              </div>
              <div class="flex gap-1.5">
                <button
                  v-for="opt in ['Ctrl+K', 'Ctrl+F', 'Alt+S']"
                  :key="opt"
                  class="px-3 py-1.5 rounded-lg border-2 font-bold text-xs transition-all"
                  :class="settings.searchShortcut === opt
                    ? 'bg-primary border-black text-black shadow-hard-sm'
                    : 'bg-[#332b1f] border-black text-white/60 hover:text-white hover:border-primary'"
                  @click="settings.searchShortcut = opt"
                >
                  {{ opt }}
                </button>
              </div>
            </div>

            <!-- 导出/导入 -->
            <div class="flex items-center justify-between py-3 border-t border-white/10">
              <div>
                <span class="text-white font-bold text-sm">数据管理</span>
                <p class="text-white/40 text-xs mt-0.5">导出或导入设置、收藏、排序</p>
              </div>
              <div class="flex gap-2">
                <button
                  class="flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-black bg-[#332b1f] font-bold text-xs text-white/60 hover:text-white hover:border-primary transition-all"
                  @click="handleExport"
                >
                  <span class="material-icons text-sm">download</span>
                  导出
                </button>
                <button
                  class="flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-black bg-[#332b1f] font-bold text-xs text-white/60 hover:text-white hover:border-primary transition-all"
                  @click="handleImport"
                >
                  <span class="material-icons text-sm">upload</span>
                  导入
                </button>
              </div>
            </div>
            <div v-if="importSuccess" class="text-neon-green text-xs font-bold flex items-center gap-1">
              <span class="material-icons text-sm">check_circle</span> 导入成功，刷新页面后完全生效
            </div>
            <div v-if="importError" class="text-coral-red text-xs font-bold flex items-center gap-1">
              <span class="material-icons text-sm">error</span> 导入失败，请检查文件格式
            </div>
          </div>

          <!-- 关于 -->
          <div v-if="settingsTab === 'about'" class="space-y-4">
            <div class="flex items-center gap-4 py-3">
              <div class="w-14 h-14 bg-primary border-3 border-black rounded-xl shadow-hard-sm flex items-center justify-center shrink-0">
                <span class="material-icons text-black text-3xl">grid_view</span>
              </div>
              <div>
                <h3 class="text-white font-bold text-lg uppercase">UsefulTools</h3>
                <p class="text-white/40 text-xs mt-0.5">开发者实用工具集</p>
              </div>
            </div>

            <div class="space-y-2 text-sm">
              <div class="flex items-center justify-between py-2 border-t border-white/10">
                <span class="text-white/50 font-bold text-xs uppercase">版本</span>
                <span class="text-primary font-bold">0.1.0</span>
              </div>
              <div class="flex items-center justify-between py-2 border-t border-white/10">
                <span class="text-white/50 font-bold text-xs uppercase">框架</span>
                <span class="text-white/70 font-bold">Tauri 2 + Vue 3</span>
              </div>
              <div class="flex items-center justify-between py-2 border-t border-white/10">
                <span class="text-white/50 font-bold text-xs uppercase">工具数量</span>
                <span class="text-primary font-bold">{{ tools.length }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
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
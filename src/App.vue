<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import Sidebar from './components/Sidebar.vue'
import DashboardHeader from './components/DashboardHeader.vue'
import TabBar from './components/TabBar.vue'
import TitleBar from './components/TitleBar.vue'
import CommandPalette from './components/CommandPalette.vue'
import { useSettings, exportAllData, importAllData } from './composables/useSettings'
import { useTabs } from './composables/useTabs'
import { usePluginStore } from './composables/usePluginStore'
import { useUpdater } from './composables/useUpdater'

const route = useRoute()
const settings = useSettings()
const sidebarNav = ref(settings.value.defaultPage)

const isHome = computed(() => route.path === '/')
const isStore = computed(() => route.path === '/store')
const isToolPage = computed(() => !isHome.value && !isStore.value)
// 是否曾经打开过工具页（用于延迟渲染工具区容器）
const hasEverOpenedTool = ref(false)

const { ensureTab } = useTabs()
const pluginStore = usePluginStore()
const { updateAvailable, updateInfo, currentVersion, checkForUpdate, openReleasePage, dismissUpdate } = useUpdater()

// 路由变化时确保标签存在
watch(() => route.path, (path) => {
  ensureTab(path)
}, { immediate: true })

// 记录是否曾打开过工具
watch(isToolPage, (val) => {
  if (val) hasEverOpenedTool.value = true
}, { immediate: true })

// ── 工具组件缓存（按 tool id 缓存 defineAsyncComponent 实例） ──
// const asyncComponentCache = new Map<string, Component>()

// function getToolComponent(toolId: string): Component | null {
//   if (asyncComponentCache.has(toolId)) {
//     return asyncComponentCache.get(toolId)!
//   }
//   const tool = pluginStore.activeTools.value.find(t => t.id === toolId)
//   if (!tool?.component) return null

//   const comp = defineAsyncComponent(tool.component)
//   asyncComponentCache.set(toolId, comp)
//   return comp
// }

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
const showCommandPalette = ref(false)

// 全局搜索快捷键
function handleGlobalKey(e: KeyboardEvent) {
  const shortcut = settings.value.searchShortcut
  const ctrl = shortcut.includes('Ctrl')
  const alt = shortcut.includes('Alt')
  const key = shortcut.split('+').pop()?.toUpperCase()

  if (ctrl === (e.ctrlKey || e.metaKey) && alt === e.altKey && e.key.toUpperCase() === key) {
    e.preventDefault()
    showCommandPalette.value = !showCommandPalette.value
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKey)
  pluginStore.initialize()
  checkForUpdate()
})
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
const searchQuery = ref('')
const debugError = ref('')

async function handleLoadDebug() {
  debugError.value = ''
  try {
    await pluginStore.loadDebugPlugins(settings.value.debugPluginDir)
  } catch (err: any) {
    debugError.value = typeof err === 'string' ? err : (err?.message || String(err))
  }
}
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden">
    <TitleBar />

    <!-- 首页：带 Sidebar + Header 的 Dashboard 布局 -->
    <div v-if="isHome" class="flex-1 overflow-hidden flex flex-col md:flex-row">
      <Sidebar v-model="sidebarNav" @open-settings="showSettings = true" />

      <main class="flex-1 flex flex-col h-full overflow-hidden relative">
        <div
          class="absolute inset-0 opacity-10 pointer-events-none z-0"
          style="background-image: radial-gradient(#f9b11f 1px, transparent 1px); background-size: 20px 20px;"
        />

        <DashboardHeader :nav-mode="sidebarNav" v-model="searchQuery" />

        <div ref="homeScrollRef" class="flex-1 overflow-y-auto p-6 md:p-8 z-10 pb-20">
          <router-view :nav-mode="sidebarNav" :search-query="searchQuery" />
        </div>
      </main>
    </div>

    <!-- 插件商店：独立全屏布局 -->
    <div v-else-if="isStore" class="flex-1 overflow-hidden bg-bg-dark">
      <router-view />
    </div>

    <!-- 工具页：TabBar + 内容区 -->
    <div v-else class="flex-1 flex flex-col overflow-hidden bg-bg-dark">
      <TabBar @open-search="showCommandPalette = true" />
      <div class="flex-1 overflow-y-auto p-5">
        <router-view v-slot="{ Component, route: matchedRoute }">
          <keep-alive>
            <component :is="Component" :key="matchedRoute.path" />
          </keep-alive>
        </router-view>
      </div>
    </div>

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

            <!-- 调试模式 -->
            <div class="flex items-center justify-between py-3 border-t border-white/10">
              <div>
                <span class="text-white font-bold text-sm">调试模式</span>
                <p class="text-white/40 text-xs mt-0.5">从本地目录加载未发布的插件</p>
              </div>
              <button
                class="w-10 h-6 rounded-full border-2 border-black transition-all relative"
                :class="settings.debugMode ? 'bg-neon-green' : 'bg-[#332b1f]'"
                @click="settings.debugMode = !settings.debugMode; if (!settings.debugMode) pluginStore.unloadDebugPlugins()"
              >
                <span
                  class="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white border border-black transition-all"
                  :class="settings.debugMode ? 'left-[18px]' : 'left-0.5'"
                />
              </button>
            </div>
            <template v-if="settings.debugMode">
              <div class="py-2">
                <div class="flex gap-2">
                  <input
                    v-model="settings.debugPluginDir"
                    type="text"
                    placeholder="插件项目根目录路径（含 plugin.json 和 dist/）"
                    class="flex-1 px-3 py-2 rounded-lg border-2 border-black bg-[#332b1f] text-white text-xs font-mono focus:border-neon-green focus:outline-none transition-all"
                  />
                  <button
                    class="px-3 py-2 rounded-lg border-2 border-black bg-neon-green text-black font-bold text-xs shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
                    :disabled="pluginStore.isLoadingDebug.value || !settings.debugPluginDir.trim()"
                    @click="handleLoadDebug"
                  >{{ pluginStore.isLoadingDebug.value ? '...' : '加载' }}</button>
                </div>
                <div v-if="debugError" class="text-coral-red text-xs font-bold flex items-center gap-1 mt-2">
                  <span class="material-icons text-sm">error</span> {{ debugError }}
                </div>
                <div v-if="pluginStore.debugPlugins.value.length > 0" class="mt-3">
                  <div class="text-white/40 text-xs font-bold mb-2">已加载 {{ pluginStore.debugPlugins.value.length }} 个调试插件</div>
                  <div class="flex flex-wrap gap-1.5">
                    <span
                      v-for="dp in pluginStore.debugPlugins.value"
                      :key="dp.meta.id"
                      class="inline-flex items-center gap-1 px-2 py-1 rounded border border-neon-green/30 bg-neon-green/10 text-neon-green text-xs font-bold cursor-pointer hover:bg-neon-green/20 transition-all"
                      @click="pluginStore.reloadDebugPlugin(dp.meta.id)"
                      title="点击重新加载"
                    >
                      <span class="material-icons text-xs">{{ dp.meta.icon }}</span>
                      {{ dp.meta.subtitle }}
                      <span class="material-icons text-xs opacity-50">refresh</span>
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- 关于 -->
          <div v-else-if="settingsTab === 'about'" class="space-y-4">
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
                <span class="text-primary font-bold">{{ pluginStore.activeTools.value.length }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 更新通知弹窗 -->
    <Teleport to="body">
      <div v-if="updateAvailable && updateInfo" class="fixed inset-0 z-60 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/60" @click="dismissUpdate" />
        <div class="relative bg-deep-charcoal border-4 border-black rounded-xl shadow-hard p-6 w-full max-w-md z-10">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-primary border-2 border-black rounded-lg shadow-hard-sm flex items-center justify-center shrink-0">
              <span class="material-icons text-black text-xl">system_update</span>
            </div>
            <div>
              <h3 class="text-white font-bold text-sm uppercase">发现新版本</h3>
              <p class="text-white/40 text-xs mt-0.5">
                {{ currentVersion }} → <span class="text-primary font-bold">{{ updateInfo.version }}</span>
              </p>
            </div>
          </div>

          <div v-if="updateInfo.body" class="mb-5 max-h-[200px] overflow-y-auto scrollbar-thin">
            <div class="text-white/50 text-xs font-bold uppercase mb-2">更新内容</div>
            <div class="text-white/70 text-xs leading-relaxed whitespace-pre-wrap bg-black/20 rounded-lg border border-white/5 p-3">{{ updateInfo.body }}</div>
          </div>

          <div class="flex justify-end gap-2">
            <button
              class="px-4 py-2 rounded-lg border-2 border-black bg-[#332b1f] text-white/60 font-bold text-xs hover:text-white hover:border-primary transition-all"
              @click="dismissUpdate"
            >稍后再说</button>
            <button
              class="px-4 py-2 rounded-lg border-2 border-black bg-primary text-black font-bold text-xs shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-1.5"
              @click="openReleasePage"
            >
              <span class="material-icons text-sm">open_in_new</span>
              前往下载
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <CommandPalette v-model="showCommandPalette" />
  </div>
</template>
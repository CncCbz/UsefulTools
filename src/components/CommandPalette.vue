<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { usePluginStore } from '../composables/usePluginStore'
import { useTabs } from '../composables/useTabs'
import { useFavorites } from '../composables/useFavorites'
import type { PluginMeta } from '../composables/usePluginStore'
import PluginDetailModal from './PluginDetailModal.vue'

const model = defineModel<boolean>({ default: false })
const { openTab } = useTabs()
const { isFavorite } = useFavorites()
const pluginStore = usePluginStore()

const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const mode = ref<'tools' | 'store'>('tools')

// ── 工具搜索 ──────────────────────────────────────────
const filtered = computed(() => {
  if (!query.value.trim()) return pluginStore.activeTools.value
  const q = query.value.toLowerCase()
  return pluginStore.activeTools.value.filter(t =>
    t.subtitle.toLowerCase().includes(q) ||
    t.categories.some(c => c.toLowerCase().includes(q))
  )
})

// ── 插件商店 ──────────────────────────────────────────
const storeQuery = ref('')
const selectedPlugin = ref<PluginMeta | null>(null)

const filteredStorePlugins = computed(() => {
  let list = pluginStore.registryPlugins.value
  const q = storeQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(p =>
      p.subtitle.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    )
  }
  return list
})

function getPluginStatus(plugin: PluginMeta): 'not-installed' | 'installing' | 'installed' | 'update-available' {
  if (pluginStore.isPluginInstalling(plugin.id)) return 'installing'
  if (pluginStore.isInstalled(plugin.id)) {
    const installed = pluginStore.installedPlugins.value.find(p => p.meta.id === plugin.id)
    if (installed && installed.meta.version !== plugin.version) return 'update-available'
    return 'installed'
  }
  return 'not-installed'
}

const selectedPluginStatus = computed(() => {
  if (!selectedPlugin.value) return 'not-installed' as const
  return getPluginStatus(selectedPlugin.value)
})

const selectedPluginInstalledVersion = computed(() => {
  if (!selectedPlugin.value) return undefined
  return pluginStore.installedPlugins.value.find(p => p.meta.id === selectedPlugin.value!.id)?.meta.version
})

async function handleInstall(meta: PluginMeta) {
  try { await pluginStore.installPlugin(meta) } catch {}
}

async function handleUninstall(id: string) {
  try { await pluginStore.uninstallPlugin(id); selectedPlugin.value = null } catch {}
}

function switchToStore() {
  mode.value = 'store'
  storeQuery.value = ''
  if (pluginStore.registryPlugins.value.length === 0) {
    pluginStore.fetchRegistry()
  }
  nextTick(() => inputRef.value?.focus())
}

// ── 通用逻辑 ──────────────────────────────────────────
watch(model, (val) => {
  if (val) {
    query.value = ''
    storeQuery.value = ''
    selectedIndex.value = 0
    mode.value = 'tools'
    nextTick(() => inputRef.value?.focus())
  }
})

watch(query, () => { selectedIndex.value = 0 })

function select(toolId: string) {
  openTab(toolId)
  model.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (mode.value === 'store') { mode.value = 'tools'; nextTick(() => inputRef.value?.focus()) }
    else model.value = false
    return
  }
  if (mode.value !== 'tools') return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, filtered.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter' && filtered.value.length > 0) {
    e.preventDefault()
    select(filtered.value[selectedIndex.value].id)
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="model" class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" @click.self="model = false">
      <div class="absolute inset-0 bg-black/50" @click="model = false" />
      <div class="relative w-full max-w-lg bg-deep-charcoal border-3 border-black rounded-xl shadow-hard-xl overflow-hidden z-10">

        <!-- 工具搜索模式 -->
        <template v-if="mode === 'tools'">
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

          <div class="border-t-2 border-black/40 px-4 py-2.5">
            <button
              class="w-full flex items-center gap-2 text-white/40 hover:text-primary text-xs font-bold transition-colors py-1"
              @click="switchToStore"
            >
              <span class="material-icons text-sm">store</span>
              浏览插件商店，安装更多工具...
            </button>
          </div>
        </template>

        <!-- 插件商店模式 -->
        <template v-else>
          <div class="flex items-center gap-2 px-4 py-3 border-b-2 border-black/40">
            <button class="text-white/40 hover:text-primary transition-colors" @click="mode = 'tools'; nextTick(() => inputRef?.focus())">
              <span class="material-icons text-lg">arrow_back</span>
            </button>
            <span class="material-icons text-primary text-lg">store</span>
            <input
              ref="inputRef"
              v-model="storeQuery"
              type="text"
              placeholder="搜索插件..."
              class="flex-1 bg-transparent text-white text-sm font-bold outline-none placeholder-white/30"
              @keydown="onKeydown"
            />
            <button
              class="text-white/30 hover:text-white transition-colors"
              :disabled="pluginStore.isLoadingRegistry.value"
              @click="pluginStore.fetchRegistry(true)"
            >
              <span class="material-icons text-base" :class="{ 'animate-spin': pluginStore.isLoadingRegistry.value }">refresh</span>
            </button>
          </div>

          <div class="max-h-[50vh] overflow-y-auto overflow-x-hidden py-1 scrollbar-thin">
            <div v-if="pluginStore.isLoadingRegistry.value && filteredStorePlugins.length === 0" class="text-center text-white/20 text-xs py-8">
              <span class="material-icons text-lg animate-spin align-middle mr-1">sync</span>
              正在加载插件列表...
            </div>
            <template v-else-if="filteredStorePlugins.length > 0">
              <button
                v-for="plugin in filteredStorePlugins"
                :key="plugin.id"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors text-white/60 hover:bg-white/5 hover:text-white/80"
                @click="selectedPlugin = plugin"
              >
                <div
                  class="shrink-0 w-7 h-7 rounded-md border-2 border-black flex items-center justify-center"
                  :class="plugin.bgColor"
                >
                  <span class="material-icons text-black text-sm">{{ plugin.icon }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <span class="text-xs font-bold">{{ plugin.subtitle }}</span>
                  <span class="text-[10px] text-white/30 ml-2">{{ plugin.author }}</span>
                </div>
                <!-- 状态 -->
                <button
                  v-if="getPluginStatus(plugin) === 'not-installed'"
                  class="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-primary text-black border border-black rounded-md hover:opacity-80 transition-all"
                  @click.stop="handleInstall(plugin)"
                >安装</button>
                <span v-else-if="getPluginStatus(plugin) === 'installing'" class="material-icons text-white/30 text-sm animate-spin shrink-0">sync</span>
                <span v-else-if="getPluginStatus(plugin) === 'installed'" class="material-icons text-neon-green text-sm shrink-0">check_circle</span>
                <button
                  v-else-if="getPluginStatus(plugin) === 'update-available'"
                  class="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-primary text-black border border-black rounded-md hover:opacity-80 transition-all"
                  @click.stop="handleInstall(plugin)"
                >更新</button>
              </button>
            </template>
            <div v-else class="text-center text-white/20 text-xs py-8">
              无匹配插件
            </div>
          </div>
        </template>

      </div>
    </div>

    <PluginDetailModal
      v-if="selectedPlugin"
      :plugin="selectedPlugin"
      :status="selectedPluginStatus"
      :installed-version="selectedPluginInstalledVersion"
      @close="selectedPlugin = null"
      @install="handleInstall"
      @uninstall="handleUninstall"
    />
  </Teleport>
</template>

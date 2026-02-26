<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { invoke } from '@tauri-apps/api/core'
import { usePluginStore } from '../composables/usePluginStore'
import type { PluginMeta } from '../composables/usePluginStore'
import PluginCard from '../components/PluginCard.vue'
import PluginDetailModal from '../components/PluginDetailModal.vue'

const router = useRouter()
const pluginStore = usePluginStore()

const searchQuery = ref('')
const selectedCategory = ref('')
const showInstalledOnly = ref(false)
const selectedPlugin = ref<PluginMeta | null>(null)

// 从注册表中提取所有分类
const storeCategories = computed(() => {
  const set = new Set(pluginStore.registryPlugins.value.flatMap(p => p.categories))
  return Array.from(set)
})

// 过滤插件列表
const filteredPlugins = computed(() => {
  let list = pluginStore.registryPlugins.value

  // 已安装筛选
  if (showInstalledOnly.value) {
    list = list.filter(p => pluginStore.isInstalled(p.id))
  }

  // 搜索过滤
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p =>
      p.subtitle.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    )
  }

  // 分类过滤
  if (selectedCategory.value) {
    list = list.filter(p => p.categories.includes(selectedCategory.value))
  }

  return list
})

const installedCount = computed(() =>
  pluginStore.registryPlugins.value.filter(p => pluginStore.isInstalled(p.id)).length
)

// 获取插件状态
function getPluginStatus(plugin: PluginMeta): 'not-installed' | 'installing' | 'installed' | 'update-available' {
  if (pluginStore.isPluginInstalling(plugin.id)) return 'installing'
  if (pluginStore.isInstalled(plugin.id)) {
    const installed = pluginStore.installedPlugins.value.find(p => p.meta.id === plugin.id)
    if (installed && installed.meta.version !== plugin.version) return 'update-available'
    return 'installed'
  }
  return 'not-installed'
}

// 获取选中插件的状态
const selectedPluginStatus = computed(() => {
  if (!selectedPlugin.value) return 'not-installed' as const
  return getPluginStatus(selectedPlugin.value)
})

// 操作处理
async function handleInstall(meta: PluginMeta) {
  try {
    await pluginStore.installPlugin(meta)
  } catch {
    // 错误已在 composable 中处理
  }
}

async function handleUninstall(id: string) {
  try {
    await pluginStore.uninstallPlugin(id)
    selectedPlugin.value = null
  } catch {
    // 错误已在 composable 中处理
  }
}

function handleRefresh() {
  pluginStore.fetchRegistry(true)
}

// Registry 设置
const showRegistrySettings = ref(false)
const pluginRegistry = ref('https://registry.npmjs.org')
const registrySaving = ref(false)
const registrySaved = ref(false)

// 手动添加包
const showAddPackage = ref(false)
const manualPackageName = ref('')
const addingPackage = ref(false)
const addPackageError = ref('')

async function handleAddPackage() {
  const name = manualPackageName.value.trim()
  if (!name) return

  addingPackage.value = true
  addPackageError.value = ''

  try {
    const plugins = await invoke<PluginMeta[]>('fetch_package_by_name', { packageName: name })
    if (plugins.length === 0) {
      addPackageError.value = '该包中未找到有效插件'
      return
    }
    // 合并到注册表列表（去重）
    const existingIds = new Set(pluginStore.registryPlugins.value.map(p => p.id))
    const newPlugins = plugins.filter(p => !existingIds.has(p.id))
    if (newPlugins.length > 0) {
      pluginStore.registryPlugins.value = [...pluginStore.registryPlugins.value, ...newPlugins]
    }
    manualPackageName.value = ''
    showAddPackage.value = false
  } catch (err: any) {
    addPackageError.value = typeof err === 'string' ? err : (err?.message || '获取失败')
  } finally {
    addingPackage.value = false
  }
}

async function loadPluginConfig() {
  try {
    const config = await invoke<{ registry: string }>('get_plugin_config')
    pluginRegistry.value = config.registry
  } catch {}
}

async function savePluginConfig() {
  registrySaving.value = true
  try {
    await invoke('set_plugin_config', { config: { registry: pluginRegistry.value.replace(/\/+$/, '') } })
    registrySaved.value = true
    setTimeout(() => { registrySaved.value = false }, 2000)
  } catch {}
  registrySaving.value = false
}

// 页面加载时获取注册表
onMounted(() => {
  if (pluginStore.registryPlugins.value.length === 0) {
    pluginStore.fetchRegistry()
  }
  loadPluginConfig()
})
</script>

<template>
  <div class="h-full overflow-y-auto p-6">
    <!-- 头部：返回 + 标题 + 设置/刷新 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <button
          class="w-10 h-10 rounded-lg border-[3px] border-black bg-white/10 flex items-center justify-center shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-150"
          @click="router.push('/')"
        >
          <span class="material-icons text-white text-lg">arrow_back</span>
        </button>
        <h1 class="text-2xl font-bold uppercase tracking-tight text-white">
          <span class="material-icons text-primary text-2xl align-middle mr-2">store</span>
          插件商店
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="w-10 h-10 rounded-lg border-[3px] border-black flex items-center justify-center shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-150"
          :class="showAddPackage ? 'bg-neon-green' : 'bg-white/10'"
          @click="showAddPackage = !showAddPackage; if (showAddPackage) showRegistrySettings = false"
          title="手动添加包"
        >
          <span class="material-icons text-lg" :class="showAddPackage ? 'text-black' : 'text-white'">add_circle</span>
        </button>
        <button
          class="w-10 h-10 rounded-lg border-[3px] border-black flex items-center justify-center shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-150"
          :class="showRegistrySettings ? 'bg-primary' : 'bg-white/10'"
          @click="showRegistrySettings = !showRegistrySettings; if (showRegistrySettings) showAddPackage = false"
          title="源设置"
        >
          <span class="material-icons text-lg" :class="showRegistrySettings ? 'text-black' : 'text-white'">settings</span>
        </button>
        <button
          class="w-10 h-10 rounded-lg border-[3px] border-black bg-white/10 flex items-center justify-center shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-150"
          :class="{ 'opacity-50 cursor-not-allowed': pluginStore.isLoadingRegistry.value }"
          :disabled="pluginStore.isLoadingRegistry.value"
          @click="handleRefresh"
        >
          <span
            class="material-icons text-white text-lg"
            :class="{ 'animate-spin': pluginStore.isLoadingRegistry.value }"
          >refresh</span>
        </button>
      </div>
    </div>

    <!-- Registry 设置面板 -->
    <div v-if="showRegistrySettings" class="mb-6 p-4 bg-white/5 border-[3px] border-black rounded-lg">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-icons text-primary text-sm">dns</span>
        <span class="text-white font-bold text-sm">npm 源设置</span>
      </div>
      <div class="flex gap-2 mb-3">
        <input
          v-model="pluginRegistry"
          type="text"
          placeholder="https://registry.npmjs.org"
          class="flex-1 px-3 py-2 rounded-lg border-2 border-black bg-[#332b1f] text-white text-sm font-mono focus:border-primary focus:outline-none transition-all"
        />
        <button
          class="px-4 py-2 rounded-lg border-2 border-black bg-primary text-black font-bold text-xs shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
          :disabled="registrySaving"
          @click="savePluginConfig"
        >{{ registrySaving ? '...' : '保存' }}</button>
      </div>
      <div class="flex gap-2">
        <button
          v-for="preset in [
            { label: 'npm 官方', url: 'https://registry.npmjs.org' },
            { label: 'npmmirror', url: 'https://registry.npmmirror.com' },
          ]"
          :key="preset.url"
          class="px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all"
          :class="pluginRegistry === preset.url
            ? 'bg-primary/10 border-primary text-primary'
            : 'bg-[#332b1f] border-black text-white/60 hover:text-white hover:border-primary'"
          @click="pluginRegistry = preset.url"
        >{{ preset.label }}</button>
      </div>
      <div v-if="registrySaved" class="text-neon-green text-xs font-bold flex items-center gap-1 mt-2">
        <span class="material-icons text-sm">check_circle</span> 已保存，点击刷新按钮生效
      </div>
    </div>

    <!-- 手动添加包面板 -->
    <div v-if="showAddPackage" class="mb-6 p-4 bg-white/5 border-[3px] border-black rounded-lg">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-icons text-neon-green text-sm">add_circle</span>
        <span class="text-white font-bold text-sm">手动添加 npm 包</span>
      </div>
      <p class="text-white/40 text-xs mb-3">
        如果搜索不到你的插件（新发布的包可能需要等待 npm 索引），可以直接输入包名添加。
      </p>
      <div class="flex gap-2 mb-2">
        <input
          v-model="manualPackageName"
          type="text"
          placeholder="例如: @cnc_cbz/usefultools-plugin-official"
          class="flex-1 px-3 py-2 rounded-lg border-2 border-black bg-[#332b1f] text-white text-sm font-mono focus:border-neon-green focus:outline-none transition-all"
          @keyup.enter="handleAddPackage"
        />
        <button
          class="px-4 py-2 rounded-lg border-2 border-black bg-neon-green text-black font-bold text-xs shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
          :disabled="addingPackage || !manualPackageName.trim()"
          @click="handleAddPackage"
        >{{ addingPackage ? '获取中...' : '添加' }}</button>
      </div>
      <div v-if="addPackageError" class="text-coral-red text-xs font-bold flex items-center gap-1 mt-1">
        <span class="material-icons text-sm">error</span> {{ addPackageError }}
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="relative mb-5">
      <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
        search
      </span>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索插件..."
        class="w-full pl-10 pr-4 py-2.5 bg-white/5 border-[3px] border-black rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
      />
    </div>

    <!-- 分类标签 -->
    <div class="flex flex-wrap gap-2 mb-6">
      <button
        class="px-3 py-1.5 text-xs font-bold uppercase border-2 border-black rounded-lg transition-all duration-150"
        :class="selectedCategory === '' && !showInstalledOnly
          ? 'bg-primary text-black shadow-hard-sm'
          : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/15'"
        @click="selectedCategory = ''; showInstalledOnly = false"
      >
        全部
      </button>
      <button
        class="px-3 py-1.5 text-xs font-bold uppercase border-2 border-black rounded-lg transition-all duration-150 flex items-center gap-1"
        :class="showInstalledOnly
          ? 'bg-neon-green text-black shadow-hard-sm'
          : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/15'"
        @click="showInstalledOnly = !showInstalledOnly; if (showInstalledOnly) selectedCategory = ''"
      >
        <span class="material-icons text-sm">check_circle</span>
        已安装 ({{ installedCount }})
      </button>
      <button
        v-for="cat in storeCategories"
        :key="cat"
        class="px-3 py-1.5 text-xs font-bold uppercase border-2 border-black rounded-lg transition-all duration-150"
        :class="selectedCategory === cat && !showInstalledOnly
          ? 'bg-primary text-black shadow-hard-sm'
          : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/15'"
        @click="selectedCategory = cat; showInstalledOnly = false"
      >
        {{ cat }}
      </button>
    </div>

    <!-- 加载状态 -->
    <div
      v-if="pluginStore.isLoadingRegistry.value && filteredPlugins.length === 0"
      class="flex flex-col items-center justify-center py-20 text-gray-500"
    >
      <span class="material-icons text-5xl animate-spin mb-4">sync</span>
      <p class="text-sm font-bold">正在加载插件列表...</p>
    </div>

    <!-- 插件卡片网格 -->
    <div
      v-else-if="filteredPlugins.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      <PluginCard
        v-for="plugin in filteredPlugins"
        :key="plugin.id"
        :plugin="plugin"
        :status="getPluginStatus(plugin)"
        @install="handleInstall"
        @detail="selectedPlugin = $event"
      />
    </div>

    <!-- 空状态 -->
    <div
      v-else
      class="flex flex-col items-center justify-center py-20 text-gray-500"
    >
      <span class="material-icons text-6xl mb-4">search_off</span>
      <p class="text-lg font-bold">没有找到匹配的插件</p>
      <p class="text-sm mt-1">试试其他关键词或分类吧</p>
    </div>

    <!-- 插件详情弹窗 -->
    <PluginDetailModal
      :plugin="selectedPlugin"
      :status="selectedPluginStatus"
      @close="selectedPlugin = null"
      @install="handleInstall"
      @uninstall="handleUninstall"
    />
  </div>
</template>

<script setup lang="ts">
import type { PluginMeta } from '../composables/usePluginStore'

const props = defineProps<{
  plugin: PluginMeta | null
  status: 'not-installed' | 'installing' | 'installed' | 'update-available'
}>()

const emit = defineEmits<{
  close: []
  install: [meta: PluginMeta]
  uninstall: [id: string]
}>()

// ── 能力标签映射 ──────────────────────────────────────────

const capabilityLabels: Record<string, { label: string; icon: string; risk: 'low' | 'medium' | 'high' }> = {
  'fs:read': { label: '文件读取', icon: 'folder_open', risk: 'medium' },
  'fs:write': { label: '文件写入', icon: 'edit_note', risk: 'medium' },
  'http': { label: 'HTTP 请求', icon: 'language', risk: 'low' },
  'dialog': { label: '系统对话框', icon: 'open_in_new', risk: 'medium' },
  'clipboard': { label: '剪贴板', icon: 'content_paste', risk: 'low' },
  'system:info': { label: '系统信息', icon: 'computer', risk: 'medium' },
  'system:process': { label: '进程管理', icon: 'memory', risk: 'medium' },
  'shell:execute': { label: 'Shell 执行', icon: 'terminal', risk: 'high' },
  'notification': { label: '系统通知', icon: 'notifications', risk: 'low' },
}

// ── 辅助函数 ──────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isOfficial(plugin: PluginMeta): boolean {
  return plugin.author === 'UsefulTools'
}

function riskColor(risk: 'low' | 'medium' | 'high') {
  return {
    low: 'bg-green-900/50 text-green-400 border-green-700',
    medium: 'bg-amber-900/50 text-amber-400 border-amber-700',
    high: 'bg-red-900/50 text-red-400 border-red-700',
  }[risk]
}

function riskLabel(risk: 'low' | 'medium' | 'high') {
  return { low: '低风险', medium: '中风险', high: '高风险' }[risk]
}
</script>

<template>
  <Teleport to="body">
    <div v-if="plugin" class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- 遮罩层 -->
      <div class="absolute inset-0 bg-black/60" @click="emit('close')" />

      <!-- 弹窗主体 -->
      <div class="relative bg-deep-charcoal border-4 border-black rounded-xl shadow-hard w-full max-w-lg z-10 max-h-[85vh] overflow-y-auto">

        <!-- 头部 -->
        <div class="sticky top-0 bg-deep-charcoal border-b border-white/10 p-6 pb-4 z-10">
          <button
            class="absolute top-4 right-4 w-9 h-9 rounded-lg border-2 border-white/20 flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-all"
            @click="emit('close')"
          >
            <span class="material-icons text-white text-lg">close</span>
          </button>

          <div class="flex items-center gap-4 pr-10">
            <div
              class="shrink-0 w-14 h-14 rounded-xl border-[3px] border-black flex items-center justify-center shadow-hard-sm"
              :class="plugin.bgColor"
            >
              <span class="material-icons text-black text-2xl">{{ plugin.icon }}</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="text-xl font-bold text-white uppercase tracking-tight leading-tight">
                  {{ plugin.subtitle }}
                </h2>
                <span
                  v-if="isOfficial(plugin)"
                  class="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-primary/20 text-primary border border-primary/40 rounded leading-none"
                >官方</span>
              </div>
              <span class="text-sm text-gray-400">v{{ plugin.version }}</span>
            </div>
          </div>
        </div>

        <!-- 内容区 -->
        <div class="p-6 pt-4 space-y-5">

          <!-- 信息网格 -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-white/5 rounded-lg p-3">
              <span class="text-xs text-gray-500 uppercase font-bold">作者</span>
              <p class="text-sm text-white mt-1 flex items-center gap-1.5">
                {{ plugin.author }}
                <span
                  v-if="isOfficial(plugin)"
                  class="px-1.5 py-0.5 text-[10px] font-bold bg-primary/20 text-primary border border-primary/40 rounded leading-none"
                >官方</span>
              </p>
            </div>
            <div class="bg-white/5 rounded-lg p-3">
              <span class="text-xs text-gray-500 uppercase font-bold">来源</span>
              <p class="text-sm text-white mt-1">{{ plugin.packageName }}</p>
            </div>
            <div class="bg-white/5 rounded-lg p-3 col-span-2">
              <span class="text-xs text-gray-500 uppercase font-bold">分类</span>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="cat in plugin.categories"
                  :key="cat"
                  class="px-2 py-0.5 text-xs font-bold bg-primary/20 text-primary border border-primary/30 rounded"
                >
                  {{ cat }}
                </span>
              </div>
            </div>
          </div>

          <!-- 描述 -->
          <div>
            <h3 class="text-xs text-gray-500 uppercase font-bold mb-2">描述</h3>
            <p class="text-sm text-gray-300 leading-relaxed">{{ plugin.description }}</p>
          </div>

          <!-- 权限列表 -->
          <div v-if="plugin.requires && plugin.requires.length > 0">
            <h3 class="text-xs text-gray-500 uppercase font-bold mb-2">所需权限</h3>
            <div class="space-y-2">
              <div
                v-for="cap in plugin.requires"
                :key="cap"
                class="flex items-center gap-3 p-2.5 rounded-lg border-2"
                :class="capabilityLabels[cap]?.risk === 'high'
                  ? 'border-red-700/60 bg-red-950/30'
                  : 'border-white/10 bg-white/5'"
              >
                <span
                  class="material-icons text-lg"
                  :class="{
                    'text-green-400': capabilityLabels[cap]?.risk === 'low',
                    'text-amber-400': capabilityLabels[cap]?.risk === 'medium',
                    'text-red-400': capabilityLabels[cap]?.risk === 'high',
                  }"
                >
                  {{ capabilityLabels[cap]?.icon ?? 'extension' }}
                </span>
                <span class="text-sm text-white flex-1">
                  {{ capabilityLabels[cap]?.label ?? cap }}
                </span>
                <!-- 高风险警告图标 -->
                <span
                  v-if="capabilityLabels[cap]?.risk === 'high'"
                  class="material-icons text-red-400 text-lg"
                >
                  warning
                </span>
                <!-- 风险等级标签 -->
                <span
                  v-if="capabilityLabels[cap]"
                  class="px-2 py-0.5 text-xs font-bold rounded border"
                  :class="riskColor(capabilityLabels[cap].risk)"
                >
                  {{ riskLabel(capabilityLabels[cap].risk) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex gap-3 pt-2 border-t border-white/10">
            <!-- 未安装：安装按钮 -->
            <button
              v-if="status === 'not-installed'"
              class="flex-1 py-2.5 text-sm font-bold uppercase bg-primary text-black border-[3px] border-black rounded-lg shadow-hard hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all duration-150 flex items-center justify-center gap-2"
              @click="emit('install', plugin)"
            >
              <span class="material-icons text-lg">download</span>
              安装
            </button>

            <!-- 安装中：禁用按钮 -->
            <button
              v-else-if="status === 'installing'"
              class="flex-1 py-2.5 text-sm font-bold uppercase bg-gray-600 text-gray-300 border-[3px] border-black rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
              disabled
            >
              <span class="material-icons text-lg animate-spin">sync</span>
              安装中...
            </button>

            <!-- 已安装：卸载按钮 -->
            <button
              v-else-if="status === 'installed'"
              class="flex-1 py-2.5 text-sm font-bold uppercase bg-red-900/60 text-red-300 border-[3px] border-black rounded-lg shadow-hard hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all duration-150 hover:bg-red-800/60 flex items-center justify-center gap-2"
              @click="emit('uninstall', plugin.id)"
            >
              <span class="material-icons text-lg">delete_outline</span>
              卸载
            </button>

            <!-- 有更新：更新 + 卸载 -->
            <template v-else-if="status === 'update-available'">
              <button
                class="flex-1 py-2.5 text-sm font-bold uppercase bg-primary text-black border-[3px] border-black rounded-lg shadow-hard hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all duration-150 flex items-center justify-center gap-2"
                @click="emit('install', plugin)"
              >
                <span class="material-icons text-lg">system_update_alt</span>
                更新
              </button>
              <button
                class="py-2.5 px-4 text-sm font-bold uppercase bg-white/10 text-white/60 border-[3px] border-black rounded-lg hover:text-red-300 hover:bg-red-900/30 transition-all duration-150 flex items-center justify-center gap-1"
                @click="emit('uninstall', plugin.id)"
              >
                <span class="material-icons text-lg">delete_outline</span>
                卸载
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

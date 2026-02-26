<script setup lang="ts">
import type { PluginMeta } from '../composables/usePluginStore'

const props = defineProps<{
  plugin: PluginMeta
  status: 'not-installed' | 'installing' | 'installed' | 'update-available'
}>()

const emit = defineEmits<{
  install: [meta: PluginMeta]
  detail: [meta: PluginMeta]
}>()

function isOfficial(plugin: PluginMeta): boolean {
  return plugin.author === 'UsefulTools'
}

function onInstallClick(e: Event) {
  e.stopPropagation()
  emit('install', props.plugin)
}
</script>

<template>
  <div
    class="group relative rounded-xl border-[3px] border-black bg-bg-dark p-4 shadow-hard hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all duration-200 cursor-pointer flex flex-col gap-3 h-52"
    @click="emit('detail', plugin)"
  >
    <!-- 顶部：图标 + 标题 + 版本 -->
    <div class="flex items-start gap-3">
      <div
        class="shrink-0 w-10 h-10 rounded-lg border-2 border-black flex items-center justify-center"
        :class="plugin.bgColor"
      >
        <span class="material-icons text-black text-xl">{{ plugin.icon }}</span>
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="text-sm font-bold uppercase leading-tight text-white truncate">
          {{ plugin.subtitle }}
        </h3>
        <span class="text-xs text-gray-500">v{{ plugin.version }}</span>
      </div>
    </div>

    <!-- 中间：描述 -->
    <p class="text-xs text-gray-400 leading-relaxed line-clamp-2 flex-1">
      {{ plugin.description }}
    </p>

    <!-- 底部：作者信息 + 操作按钮 -->
    <div class="flex items-center justify-between">
      <span class="text-xs text-gray-500 flex items-center gap-1.5">
        <span class="material-icons text-sm">person</span>
        {{ plugin.author }}
        <span
          v-if="isOfficial(plugin)"
          class="px-1.5 py-0.5 text-[10px] font-bold bg-primary/20 text-primary border border-primary/40 rounded leading-none"
        >官方</span>
      </span>

      <!-- 未安装 -->
      <button
        v-if="status === 'not-installed'"
        class="px-3 py-1 text-xs font-bold uppercase bg-primary text-black border-2 border-black rounded-lg shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-150"
        @click="onInstallClick"
      >
        安装
      </button>

      <!-- 安装中 -->
      <button
        v-else-if="status === 'installing'"
        class="px-3 py-1 text-xs font-bold uppercase bg-gray-600 text-gray-300 border-2 border-black rounded-lg cursor-not-allowed flex items-center gap-1"
        disabled
      >
        <span class="material-icons text-sm animate-spin">sync</span>
        安装中...
      </button>

      <!-- 已安装 -->
      <span
        v-else-if="status === 'installed'"
        class="px-3 py-1 text-xs font-bold uppercase bg-green-800 text-green-300 border-2 border-black rounded-lg"
      >
        已安装
      </span>

      <!-- 有更新 -->
      <button
        v-else-if="status === 'update-available'"
        class="px-3 py-1 text-xs font-bold uppercase bg-primary text-black border-2 border-black rounded-lg shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-150"
        @click="onInstallClick"
      >
        更新
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'

const appWindow = getCurrentWindow()
const isMaximized = ref(false)

async function updateMaxState() {
  isMaximized.value = await appWindow.isMaximized()
}

appWindow.onResized(() => updateMaxState())
updateMaxState()

async function handleMinimize() {
  await appWindow.minimize()
}

async function handleToggleMaximize() {
  await appWindow.toggleMaximize()
}

async function handleClose() {
  await appWindow.close()
}
</script>

<template>
  <div class="h-10 bg-deep-charcoal border-b-2 border-black flex items-center shrink-0 select-none" data-tauri-drag-region>
    <!-- 左侧标题 -->
    <div class="flex items-center gap-2 px-3 pointer-events-none">
      <span class="material-icons text-primary text-sm">grid_view</span>
      <span class="text-[11px] font-bold text-white/40 uppercase tracking-wider">UsefulTools</span>
    </div>

    <div class="flex-1" data-tauri-drag-region />

    <!-- 窗口控制按钮 -->
    <button
      class="h-full w-11 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
      @click="handleMinimize"
    >
      <span class="material-icons" style="font-size: 15px">remove</span>
    </button>
    <button
      class="h-full w-11 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
      @click="handleToggleMaximize"
    >
      <span class="material-icons" style="font-size: 13px">{{ isMaximized ? 'filter_none' : 'crop_square' }}</span>
    </button>
    <button
      class="h-full w-11 flex items-center justify-center text-white/40 hover:text-white hover:bg-coral-red transition-colors"
      @click="handleClose"
    >
      <span class="material-icons" style="font-size: 15px">close</span>
    </button>
  </div>
</template>

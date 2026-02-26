<script setup lang="ts">
import { ref } from 'vue'
import { ask } from '@tauri-apps/plugin-dialog'
import { useTabs } from '../composables/useTabs'
import { usePluginStore } from '../composables/usePluginStore'

const props = defineProps<{
  id: string
  icon: string
  title: string
  subtitle: string
  description: string
  bgColor: string
  textColor?: string
  pulse?: boolean
  swatches?: string[]
  route?: string
}>()

const { openTab } = useTabs()
const pluginStore = usePluginStore()

const showContextMenu = ref(false)
const menuX = ref(0)
const menuY = ref(0)

function handleClick() {
  if (props.id) {
    openTab(props.id)
  }
}

function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  menuX.value = e.clientX
  menuY.value = e.clientY
  showContextMenu.value = true

  const close = () => {
    showContextMenu.value = false
    window.removeEventListener('click', close)
    window.removeEventListener('contextmenu', close)
  }
  setTimeout(() => {
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close)
  })
}

async function handleUninstall() {
  showContextMenu.value = false
  const confirmed = await ask(`确定要卸载「${props.subtitle}」吗？`, { title: '卸载插件', kind: 'warning' })
  if (!confirmed) return
  try {
    await pluginStore.uninstallPlugin(props.id)
  } catch {
    // 错误已在 composable 中处理
  }
}
</script>

<template>
  <div
    class="group relative rounded-xl border-[3px] border-black p-4 shadow-hard hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all duration-200 cursor-pointer flex flex-col justify-between h-44"
    :class="bgColor"
    @click="handleClick"
    @contextmenu="handleContextMenu"
  >
    <!-- Top row: icon -->
    <div class="flex justify-between items-start">
      <div class="p-2 bg-black rounded-lg inline-block">
        <span class="material-icons text-white text-2xl">{{ icon }}</span>
      </div>
      <!-- Pulse dot -->
      <div
        v-if="pulse"
        class="h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-black animate-pulse"
      />
    </div>

    <!-- Bottom content -->
    <div>
      <h3
        class="text-base font-black uppercase leading-tight mb-1"
        :class="textColor || 'text-black'"
        v-html="title"
      />
      <p
        class="font-medium text-xs border-t-2 pt-1.5 mt-1.5 opacity-80 line-clamp-2"
        :class="[textColor || 'text-black', 'border-black/20']"
      >{{ description }}</p>
    </div>

    <!-- Hover arrow -->
    <div class="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
      <span class="material-icons text-2xl rotate-45" :class="textColor || 'text-black'">arrow_upward</span>
    </div>

    <!-- Color swatches -->
    <div v-if="swatches" class="absolute top-4 right-4 flex flex-col gap-0.5">
      <div
        v-for="color in swatches"
        :key="color"
        class="w-4 h-4 border-2 border-black rounded"
        :style="{ backgroundColor: color }"
      />
    </div>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div
        v-if="showContextMenu"
        class="fixed z-999 bg-deep-charcoal border-2 border-black rounded-lg shadow-hard-sm py-1 min-w-36"
        :style="{ left: menuX + 'px', top: menuY + 'px' }"
      >
        <button
          class="w-full px-4 py-2 text-left text-sm text-coral-red font-bold hover:bg-white/10 transition-colors flex items-center gap-2"
          @click="handleUninstall"
        >
          <span class="material-icons text-base">delete_outline</span>
          卸载插件
        </button>
      </div>
    </Teleport>
  </div>
</template>


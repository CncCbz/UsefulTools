<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTabs, type TabItem } from '../composables/useTabs'
import { useFavorites } from '../composables/useFavorites'
import { usePluginStore } from '../composables/usePluginStore'

const route = useRoute()
const router = useRouter()
const { openTabs, openTab, closeTab, closeOtherTabs, closeAllTabs } = useTabs()
const { isFavorite, toggleFavorite } = useFavorites()
const { activeTools } = usePluginStore()

const currentToolId = () => activeTools.value.find(t => t.route === route.path)?.id || ''

/** 右键菜单 */
const ctxMenu = reactive<{ show: boolean; x: number; y: number; tabId: string }>({
  show: false, x: 0, y: 0, tabId: '',
})

function onContextMenu(e: MouseEvent, tab: TabItem) {
  e.preventDefault()
  ctxMenu.show = true
  ctxMenu.x = e.clientX
  ctxMenu.y = e.clientY
  ctxMenu.tabId = tab.id
}

function hideCtxMenu() {
  ctxMenu.show = false
}

function handleCtx(action: 'close' | 'closeOthers' | 'closeAll') {
  if (action === 'close') closeTab(ctxMenu.tabId)
  else if (action === 'closeOthers') closeOtherTabs(ctxMenu.tabId)
  else closeAllTabs()
  hideCtxMenu()
}

/** 鼠标中键关闭 */
function onMouseDown(e: MouseEvent, tab: TabItem) {
  if (e.button === 1) {
    e.preventDefault()
    closeTab(tab.id)
  }
}

/** 返回首页确认 */
const showGoHomeConfirm = ref(false)

const emit = defineEmits<{ openSearch: [] }>()

function handleGoHome() {
  if (openTabs.value.length > 0) {
    showGoHomeConfirm.value = true
  } else {
    router.push('/')
  }
}

function confirmGoHome() {
  showGoHomeConfirm.value = false
  closeAllTabs()
  router.push('/')
}
</script>

<template>
  <header class="flex items-center bg-deep-charcoal border-b-3 border-black z-10 shrink-0 h-10">
    <!-- 首页按钮 -->
    <button
      class="h-full px-3 flex items-center text-white/50 hover:text-primary hover:bg-white/5 transition-all border-r border-black/30 shrink-0"
      title="返回首页"
      @click="handleGoHome"
    >
      <span class="material-icons text-lg">arrow_back</span>
    </button>

    <!-- 标签区域 -->
    <div class="flex-1 flex items-end h-full overflow-x-auto scrollbar-thin">
      <button
        v-for="tab in openTabs"
        :key="tab.id"
        class="group relative flex items-center gap-1.5 h-full px-3 text-xs font-bold whitespace-nowrap transition-all select-none border-r border-black/20"
        :class="route.path === tab.route
          ? 'bg-bg-dark text-primary'
          : 'text-white/40 hover:text-white/70 hover:bg-white/5'"
        @click="openTab(tab.id)"
        @mousedown="onMouseDown($event, tab)"
        @contextmenu="onContextMenu($event, tab)"
      >
        <!-- 激活指示条 -->
        <div
          v-if="route.path === tab.route"
          class="absolute top-0 left-0 right-0 h-[2px] bg-primary"
        />
        <span class="material-icons text-sm">{{ tab.icon }}</span>
        <span class="truncate max-w-[120px]">{{ tab.title }}</span>
        <span
          class="ml-0.5 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all shrink-0"
          :class="route.path === tab.route ? 'opacity-60!' : ''"
          @click.stop="closeTab(tab.id)"
        >
          <span class="material-icons text-xs">close</span>
        </span>
      </button>
    </div>

    <!-- 新建标签按钮 -->
    <button
      class="h-full px-2.5 flex items-center text-white/30 hover:text-primary hover:bg-white/5 transition-all border-l border-black/20 shrink-0"
      title="打开新工具"
      @click="emit('openSearch')"
    >
      <span class="material-icons text-lg">add</span>
    </button>

    <!-- 收藏按钮 -->
    <button
      v-if="currentToolId()"
      class="h-full px-3 flex items-center transition-all border-l-2 border-black/40 shrink-0"
      :class="isFavorite(currentToolId()) ? 'text-coral-red hover:text-coral-red/70' : 'text-white/30 hover:text-coral-red'"
      @click="toggleFavorite(currentToolId())"
    >
      <span class="material-icons text-lg">
        {{ isFavorite(currentToolId()) ? 'favorite' : 'favorite_border' }}
      </span>
    </button>
  </header>

  <!-- 右键菜单 -->
  <Teleport to="body">
    <div v-if="ctxMenu.show" class="fixed inset-0 z-50" @click="hideCtxMenu" @contextmenu.prevent="hideCtxMenu">
      <div
        class="absolute bg-deep-charcoal border-2 border-black rounded-lg shadow-hard py-1 min-w-[140px] z-50"
        :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
      >
        <button class="w-full text-left px-3 py-1.5 text-xs font-bold text-white/70 hover:text-white hover:bg-primary/20 transition-colors" @click="handleCtx('close')">
          关闭标签
        </button>
        <button class="w-full text-left px-3 py-1.5 text-xs font-bold text-white/70 hover:text-white hover:bg-primary/20 transition-colors" @click="handleCtx('closeOthers')">
          关闭其他标签
        </button>
        <div class="border-t border-white/10 my-1" />
        <button class="w-full text-left px-3 py-1.5 text-xs font-bold text-coral-red/70 hover:text-coral-red hover:bg-coral-red/10 transition-colors" @click="handleCtx('closeAll')">
          关闭所有标签
        </button>
      </div>
    </div>

    <!-- 返回首页确认弹窗 -->
    <div v-if="showGoHomeConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/60" @click="showGoHomeConfirm = false" />
      <div class="relative bg-deep-charcoal border-4 border-black rounded-xl shadow-hard p-6 w-full max-w-sm z-10">
        <div class="flex items-center gap-3 mb-4">
          <span class="material-icons text-primary text-2xl">warning</span>
          <h3 class="text-white font-bold text-sm uppercase">返回首页</h3>
        </div>
        <p class="text-white/60 text-sm mb-6">返回首页后，当前打开的工具内容将不会保留，确定要返回吗？</p>
        <div class="flex justify-end gap-2">
          <button
            class="px-4 py-2 rounded-lg border-2 border-black bg-[#332b1f] text-white/60 font-bold text-xs hover:text-white hover:border-primary transition-all"
            @click="showGoHomeConfirm = false"
          >取消</button>
          <button
            class="px-4 py-2 rounded-lg border-2 border-black bg-primary text-black font-bold text-xs shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            @click="confirmGoHome"
          >确定返回</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

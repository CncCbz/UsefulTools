import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { tools, type ToolInfo } from '../data/tools'

export interface TabItem {
  id: string
  route: string
  title: string
  icon: string
}

const STORAGE_KEY = 'usefultools-open-tabs'

function load(): TabItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const tabs: TabItem[] = JSON.parse(raw)
    // 过滤掉无效的标签（工具可能已被移除）
    const validIds = new Set(tools.map(t => t.id))
    return tabs.filter(t => validIds.has(t.id))
  } catch {
    return []
  }
}

function save(tabs: TabItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs))
}

const openTabs = ref<TabItem[]>(load())

export function useTabs() {
  const router = useRouter()
  const route = useRoute()

  function toolToTab(tool: ToolInfo): TabItem {
    return { id: tool.id, route: tool.route, title: tool.subtitle, icon: tool.icon }
  }

  /** 打开工具（如果已存在则切换到该标签） */
  function openTab(toolId: string) {
    const existing = openTabs.value.find(t => t.id === toolId)
    if (!existing) {
      const tool = tools.find(t => t.id === toolId)
      if (!tool) return
      openTabs.value.push(toolToTab(tool))
    }
    const tab = openTabs.value.find(t => t.id === toolId)!
    router.push(tab.route)
  }

  /** 关闭标签 */
  function closeTab(toolId: string) {
    const idx = openTabs.value.findIndex(t => t.id === toolId)
    if (idx === -1) return

    const isActive = route.path === openTabs.value[idx].route
    openTabs.value.splice(idx, 1)

    if (isActive) {
      if (openTabs.value.length === 0) {
        router.push('/')
      } else {
        // 切换到相邻标签
        const next = openTabs.value[Math.min(idx, openTabs.value.length - 1)]
        router.push(next.route)
      }
    }
  }

  /** 关闭其他标签 */
  function closeOtherTabs(toolId: string) {
    const keep = openTabs.value.find(t => t.id === toolId)
    if (!keep) return
    openTabs.value = [keep]
    router.push(keep.route)
  }

  /** 关闭所有标签 */
  function closeAllTabs() {
    openTabs.value = []
    router.push('/')
  }

  /** 确保当前路由对应的工具在标签中 */
  function ensureTab(path: string) {
    if (path === '/') return
    const tool = tools.find(t => t.route === path)
    if (tool && !openTabs.value.find(t => t.id === tool.id)) {
      openTabs.value.push(toolToTab(tool))
    }
  }

  watch(openTabs, (val) => save(val), { deep: true })

  return { openTabs, openTab, closeTab, closeOtherTabs, closeAllTabs, ensureTab }
}

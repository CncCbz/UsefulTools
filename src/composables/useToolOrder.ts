import { ref } from 'vue'
import { type ToolInfo } from '../data/tools'

const STORAGE_KEY = 'usefultools-tool-order'

function loadOrder(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveOrder(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

const savedOrder = ref<string[]>(loadOrder())

export function useToolOrder() {
  /** 根据持久化顺序对工具列表排序，新工具追加到末尾 */
  function sortTools(list: ToolInfo[]): ToolInfo[] {
    const order = savedOrder.value
    if (!order.length) return list

    const map = new Map(list.map(t => [t.id, t]))
    const sorted: ToolInfo[] = []

    // 按保存的顺序排列
    for (const id of order) {
      const tool = map.get(id)
      if (tool) {
        sorted.push(tool)
        map.delete(id)
      }
    }
    // 新增的工具追加到末尾
    for (const tool of map.values()) {
      sorted.push(tool)
    }
    return sorted
  }

  function updateOrder(ids: string[]) {
    savedOrder.value = ids
    saveOrder(ids)
  }

  return { sortTools, updateOrder, savedOrder }
}


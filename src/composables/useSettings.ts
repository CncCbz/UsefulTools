import { ref, watch } from 'vue'

const STORAGE_KEY = 'app-settings'

export interface AppSettings {
  defaultPage: number // 0=工具, 1=收藏
  gridColumns: number // 0=自动, 3/4/5/6=固定列数
  searchShortcut: string // 快捷键，如 'Ctrl+K'
  debugMode: boolean // 调试模式
  debugPluginDir: string // 本地插件目录路径
}

const defaults: AppSettings = {
  defaultPage: 0,
  gridColumns: 0,
  searchShortcut: 'Ctrl+K',
  debugMode: false,
  debugPluginDir: '',
}

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaults, ...JSON.parse(raw) }
  } catch {}
  return { ...defaults }
}

const settings = ref<AppSettings>(load())

watch(settings, (v) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
}, { deep: true })

export function useSettings() {
  return settings
}

/** 导出所有用户数据（设置 + 收藏 + 排序） */
export function exportAllData(): string {
  const data: Record<string, unknown> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key)!)
      } catch {
        data[key] = localStorage.getItem(key)
      }
    }
  }
  return JSON.stringify(data, null, 2)
}

/** 导入用户数据，覆盖现有 localStorage */
export function importAllData(json: string) {
  const data = JSON.parse(json) as Record<string, unknown>
  for (const [key, value] of Object.entries(data)) {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  }
  // 重新加载设置到响应式对象
  Object.assign(settings.value, load())
}

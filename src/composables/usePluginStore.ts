import { ref, computed, defineAsyncComponent, h } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import * as Vue from 'vue'
import * as TauriCore from '@tauri-apps/api/core'
import * as TauriHttp from '@tauri-apps/plugin-http'
import * as TauriDialog from '@tauri-apps/plugin-dialog'
import * as TauriFs from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'
import router from '../router'
import type { ToolInfo } from '../data/tools'

// 将主应用的模块挂载到全局，供插件 bundle 使用
const MODULE_MAP: Record<string, any> = {}

function ensurePluginGlobals() {
  if (Object.keys(MODULE_MAP).length > 0) return
  MODULE_MAP['vue'] = Vue
  MODULE_MAP['@tauri-apps/api/core'] = TauriCore
  MODULE_MAP['@tauri-apps/plugin-http'] = TauriHttp
  MODULE_MAP['@tauri-apps/plugin-dialog'] = TauriDialog
  MODULE_MAP['@tauri-apps/plugin-fs'] = TauriFs
}

/**
 * 将 ESM bundle 中的 import 语句替换为从全局 MODULE_MAP 取值
 * 并将 export 语句替换为赋值到 __exports__ 对象
 */
function rewriteEsmToFunction(source: string): string {
  let code = source

  // 注意：所有正则都使用 ^（配合 m 标志）确保只匹配行首的顶层语句，
  // 避免误匹配字符串/模板字面量内部的 import/export 文本（如 Prettier 的错误消息）

  // 1. 替换 import * as xxx from "module" （必须在其他 import 之前）
  code = code.replace(
    /^import\s+\*\s+as\s+(\w+)\s+from\s+["']([^"']+)["']\s*;?/gm,
    (_match, name: string, moduleName: string) => {
      return `const ${name} = window.__PLUGIN_MODULES__["${moduleName}"];`
    }
  )

  // 2. 替换 import { ... } from "module"
  code = code.replace(
    /^import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["']\s*;?/gm,
    (_match, imports: string, moduleName: string) => {
      // 将 ESM 的 "x as y" 别名转换为解构的 "x: y" 语法
      const fixed = imports.replace(/(\w+)\s+as\s+(\w+)/g, '$1: $2')
      return `const {${fixed}} = window.__PLUGIN_MODULES__["${moduleName}"];`
    }
  )

  // 3. 替换 import xxx from "module" (default import)
  code = code.replace(
    /^import\s+(\w+)\s+from\s+["']([^"']+)["']\s*;?/gm,
    (_match, name: string, moduleName: string) => {
      return `const ${name} = (window.__PLUGIN_MODULES__["${moduleName}"] && window.__PLUGIN_MODULES__["${moduleName}"].default) || window.__PLUGIN_MODULES__["${moduleName}"];`
    }
  )

  // 4. 替换 export default xxx → __exports__.default = xxx（仅行首）
  code = code.replace(
    /^export\s+default\s+/gm,
    '__exports__.default = '
  )

  // 5. 替换 export { _sfc_main as default } 等（仅行首）
  code = code.replace(
    /^export\s+\{([^}]+)\}\s*;?/gm,
    (_match, exports: string) => {
      const assignments = exports.split(',').map(e => {
        const parts = e.trim().split(/\s+as\s+/)
        const local = parts[0].trim()
        const exported = (parts[1] || parts[0]).trim()
        return `__exports__["${exported}"] = ${local};`
      })
      return assignments.join('\n')
    }
  )

  return code
}



// ── 类型定义 ──────────────────────────────────────────────

export type PluginCapability =
  | 'fs:read' | 'fs:write' | 'http' | 'dialog'
  | 'clipboard' | 'system:info' | 'system:process'
  | 'shell:execute' | 'notification'

export interface PluginMeta {
  id: string
  version: string
  author: string
  homepage?: string
  icon: string
  title: string
  subtitle: string
  description: string
  bgColor: string
  textColor?: string
  categories: string[]
  requires: PluginCapability[]
  /** npm 包名 */
  packageName: string
  /** bundle 文件路径（如 dist/my-tool.mjs） */
  bundleFile: string
  downloads?: number
  rating?: number
  updatedAt?: string
  createdAt?: string
}

export interface InstalledPlugin {
  meta: PluginMeta
  installedAt: number
  updatedAt: number
  localBundlePath: string
  enabled: boolean
}

// ── 模块级响应式状态（单例） ──────────────────────────────

const installedPlugins: Ref<InstalledPlugin[]> = ref([])
const registryPlugins: Ref<PluginMeta[]> = ref([])
const isLoadingRegistry: Ref<boolean> = ref(false)
const isInstalling: Ref<Set<string>> = ref(new Set())
const initialized: Ref<boolean> = ref(false)
const componentCache = new Map<string, any>()

// ── 计算属性 ──────────────────────────────────────────────

const activeTools: ComputedRef<ToolInfo[]> = computed(() => {
  const installed = installedPlugins.value
    .filter(p => p.enabled)
    .map(p => ({
      id: p.meta.id,
      icon: p.meta.icon,
      title: p.meta.title,
      subtitle: p.meta.subtitle,
      description: p.meta.description,
      bgColor: p.meta.bgColor,
      textColor: p.meta.textColor,
      route: `/${p.meta.id}`,
      categories: p.meta.categories,
      component: () => loadPluginComponent(p),
    }))

  const debug = debugPlugins.value
    .filter(p => !installedPlugins.value.some(ip => ip.meta.id === p.meta.id))
    .map(p => ({
      id: p.meta.id,
      icon: p.meta.icon,
      title: p.meta.title,
      subtitle: p.meta.subtitle,
      description: p.meta.description,
      bgColor: p.meta.bgColor,
      textColor: p.meta.textColor,
      route: `/${p.meta.id}`,
      categories: p.meta.categories,
      component: () => loadPluginComponent(p),
    }))

  return [...installed, ...debug]
})

const allCategories: ComputedRef<string[]> = computed(() => {
  return [...new Set(activeTools.value.flatMap(t => t.categories))]
})

// ── 路由辅助函数 ─────────────────────────────────────────

function registerPluginRoute(plugin: InstalledPlugin) {
  const routeName = plugin.meta.id
  if (router.hasRoute(routeName)) return

  router.addRoute({
    path: `/${plugin.meta.id}`,
    name: routeName,
    component: defineAsyncComponent(() => loadPluginComponent(plugin)),
  })
}

function removePluginRoute(pluginId: string) {
  if (router.hasRoute(pluginId)) {
    router.removeRoute(pluginId)
  }
}

// ── 方法 ─────────────────────────────────────────────────

async function initialize(): Promise<void> {
  if (initialized.value) return

  try {
    const plugins = await invoke<InstalledPlugin[]>('get_installed_plugins')
    installedPlugins.value = plugins

    for (const plugin of plugins) {
      if (plugin.enabled) {
        registerPluginRoute(plugin)
      }
    }
  } catch (err) {
    console.error('初始化插件失败:', err)
  } finally {
    initialized.value = true
  }
}

async function fetchRegistry(force?: boolean): Promise<void> {
  isLoadingRegistry.value = true
  try {
    const plugins = await invoke<PluginMeta[]>('fetch_plugin_registry', {
      forceRefresh: force ?? false,
    })
    registryPlugins.value = plugins
  } catch (err) {
    console.error('获取插件注册表失败:', err)
  } finally {
    isLoadingRegistry.value = false
  }
}

async function installPlugin(meta: PluginMeta): Promise<void> {
  // 防重复：已安装或正在安装中则跳过
  if (isInstalled(meta.id) || isPluginInstalling(meta.id)) return

  // 标记为安装中（创建新 Set 触发 Vue 响应式）
  isInstalling.value = new Set([...isInstalling.value, meta.id])

  try {
    const installed = await invoke<InstalledPlugin>('install_plugin', { plugin: meta })
    installedPlugins.value = [...installedPlugins.value, installed]
    registerPluginRoute(installed)
  } catch (err) {
    console.error(`安装插件 ${meta.id} 失败:`, err)
    throw err
  } finally {
    const next = new Set(isInstalling.value)
    next.delete(meta.id)
    isInstalling.value = next
  }
}

async function uninstallPlugin(id: string): Promise<void> {
  try {
    await invoke('uninstall_plugin', { pluginId: id })
    removePluginRoute(id)
    componentCache.delete(id)
    installedPlugins.value = installedPlugins.value.filter(p => p.meta.id !== id)
  } catch (err) {
    console.error(`卸载插件 ${id} 失败:`, err)
    throw err
  }
}

function isInstalled(id: string): boolean {
  return installedPlugins.value.some(p => p.meta.id === id)
}

function isPluginInstalling(id: string): boolean {
  return isInstalling.value.has(id)
}

async function loadPluginComponent(plugin: InstalledPlugin): Promise<any> {
  const id = plugin.meta.id

  // 检查缓存
  if (componentCache.has(id)) {
    return componentCache.get(id)
  }

  try {
    // 确保全局模块映射已注入
    ensurePluginGlobals()
    ;(window as any).__PLUGIN_MODULES__ = MODULE_MAP

    // 判断是否为调试插件（通过本地路径直接读取）
    const isDebug = plugin.meta.packageName === 'local-debug'
    let sourceCode: string

    if (isDebug) {
      sourceCode = await invoke<string>('read_local_bundle', { filePath: plugin.localBundlePath })
    } else {
      // 通过 Rust 命令读取 bundle 源码（ESM 格式）
      sourceCode = await invoke<string>('read_plugin_bundle', { pluginId: id })
    }

    // 将 ESM import/export 语句替换为全局变量操作
    const rewritten = rewriteEsmToFunction(sourceCode)

    // 包装为可执行函数，通过 __exports__ 收集导出
    const wrapped = `var __exports__ = {};\n${rewritten}\nreturn __exports__;`

    // 通过 new Function 执行
    const fn = new Function(wrapped)
    const moduleExports = fn()

    // 获取默认导出的组件
    const component = moduleExports?.default || moduleExports

    if (!component) {
      throw new Error(`插件 ${id} 未导出有效组件`)
    }

    // 如果组件携带 CSS，创建 wrapper 组件管理 CSS 生命周期
    const pluginCss = component.__pluginCss
    let finalComponent = component

    if (pluginCss) {
      const styleId = `plugin-css-${id}`
      finalComponent = {
        name: `PluginWrapper_${id}`,
        setup() {
          // 同步注入 CSS，确保在首次渲染前样式已就绪
          if (!document.getElementById(styleId)) {
            const style = document.createElement('style')
            style.id = styleId
            style.textContent = pluginCss
            document.head.appendChild(style)
          }
          Vue.onBeforeUnmount(() => {
            const el = document.getElementById(styleId)
            if (el) el.remove()
          })
          return () => h(component)
        },
      }
    }

    // 缓存组件
    componentCache.set(id, finalComponent)

    return finalComponent
  } catch (err) {
    console.error(`加载插件组件 ${id} 失败:`, err)

    // 返回错误占位组件
    return {
      name: 'PluginLoadError',
      setup() {
        return () => h('div', {
          class: 'flex flex-col items-center justify-center h-full text-red-400 gap-4',
        }, [
          h('span', { class: 'material-icons text-5xl' }, 'error_outline'),
          h('p', { class: 'text-lg' }, `插件 "${id}" 加载失败`),
          h('p', { class: 'text-sm text-gray-500' }, String(err)),
        ])
      },
    }
  }
}

// ── 调试插件状态 ─────────────────────────────────────────

const debugPlugins: Ref<InstalledPlugin[]> = ref([])
const isLoadingDebug: Ref<boolean> = ref(false)

/** 从本地目录加载调试插件 */
async function loadDebugPlugins(dirPath: string): Promise<void> {
  if (!dirPath.trim()) return
  isLoadingDebug.value = true

  try {
    // 先移除旧的调试插件路由
    for (const dp of debugPlugins.value) {
      removePluginRoute(dp.meta.id)
      componentCache.delete(dp.meta.id)
    }

    // 读取本地 plugin.json
    const metas = await invoke<PluginMeta[]>('read_local_plugin_json', { dirPath })

    const now = Date.now()
    const plugins: InstalledPlugin[] = metas.map(meta => ({
      meta: { ...meta, packageName: 'local-debug', bundleFile: meta.bundleFile },
      installedAt: now,
      updatedAt: now,
      // 存储完整的 bundle 路径：目录 + bundle 相对路径
      localBundlePath: dirPath.replace(/\\/g, '/') + '/' + meta.bundleFile,
      enabled: true,
    }))

    debugPlugins.value = plugins

    // 注册路由
    for (const plugin of plugins) {
      registerPluginRoute(plugin)
    }
  } catch (err) {
    console.error('加载调试插件失败:', err)
    throw err
  } finally {
    isLoadingDebug.value = false
  }
}

/** 卸载所有调试插件 */
function unloadDebugPlugins() {
  for (const dp of debugPlugins.value) {
    removePluginRoute(dp.meta.id)
    componentCache.delete(dp.meta.id)
  }
  debugPlugins.value = []
}

/** 重新加载单个调试插件（清除缓存） */
function reloadDebugPlugin(id: string) {
  componentCache.delete(id)
  // 触发路由重新加载
  const plugin = debugPlugins.value.find(p => p.meta.id === id)
  if (plugin) {
    removePluginRoute(id)
    registerPluginRoute(plugin)
  }
}

// ── 导出 composable ──────────────────────────────────────

export function usePluginStore() {
  return {
    // 状态
    installedPlugins,
    registryPlugins,
    isLoadingRegistry,
    isInstalling,
    initialized,
    debugPlugins,
    isLoadingDebug,
    // 计算属性
    activeTools,
    allCategories,
    // 方法
    initialize,
    fetchRegistry,
    installPlugin,
    uninstallPlugin,
    isInstalled,
    isPluginInstalling,
    loadPluginComponent,
    registerPluginRoute,
    removePluginRoute,
    loadDebugPlugins,
    unloadDebugPlugins,
    reloadDebugPlugin,
  }
}

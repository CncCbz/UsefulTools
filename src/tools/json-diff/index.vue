<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'

type DiffType = 'equal' | 'added' | 'removed' | 'changed'

interface TreeRow {
  path: string
  key: string
  depth: number
  val: any
  isLeaf: boolean
  parentIsArr: boolean
}

interface LineCoord {
  path: string
  type: DiffType
  x1: number; y1: number
  x2: number; y2: number
}

const oldJson = ref('')
const newJson = ref('')
const errorMsg = ref('')
const hasCompared = ref(false)

const leftRows = ref<TreeRow[]>([])
const rightRows = ref<TreeRow[]>([])
const diffMap = ref<Map<string, DiffType>>(new Map())
const lines = ref<LineCoord[]>([])

const wrapperRef = ref<HTMLElement | null>(null)
const leftPanelRef = ref<HTMLElement | null>(null)
const rightPanelRef = ref<HTMLElement | null>(null)

/** 将 JSON 值展开为扁平树行 */
function flatten(val: any, path: string, key: string, depth: number, parentIsArr: boolean, out: TreeRow[]) {
  const isObj = val !== null && typeof val === 'object'
  if (isObj) {
    out.push({ path, key, depth, val, isLeaf: false, parentIsArr })
    const childIsArr = Array.isArray(val)
    for (const k of Object.keys(val)) {
      const cp = path ? (childIsArr ? `${path}[${k}]` : `${path}.${k}`) : k
      flatten(val[k], cp, k, depth + 1, childIsArr, out)
    }
  } else {
    out.push({ path, key, depth, val, isLeaf: true, parentIsArr })
  }
}

/** 递归收集差异路径 */
function collectDiff(oldVal: any, newVal: any, path: string, map: Map<string, DiffType>) {
  const oIsObj = oldVal !== null && typeof oldVal === 'object'
  const nIsObj = newVal !== null && typeof newVal === 'object'
  if (oIsObj && nIsObj && Array.isArray(oldVal) === Array.isArray(newVal)) {
    const allKeys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)])
    const isArr = Array.isArray(oldVal)
    for (const k of allKeys) {
      const cp = path ? (isArr ? `${path}[${k}]` : `${path}.${k}`) : k
      if (k in oldVal && k in newVal) {
        collectDiff(oldVal[k], newVal[k], cp, map)
      } else if (k in oldVal) {
        markAll(oldVal[k], cp, 'removed', map)
      } else {
        markAll(newVal[k], cp, 'added', map)
      }
    }
  } else {
    map.set(path, JSON.stringify(oldVal) === JSON.stringify(newVal) ? 'equal' : 'changed')
  }
}

function markAll(val: any, path: string, type: 'added' | 'removed', map: Map<string, DiffType>) {
  map.set(path, type)
  if (val !== null && typeof val === 'object') {
    const isArr = Array.isArray(val)
    for (const k of Object.keys(val)) {
      markAll(val[k], isArr ? `${path}[${k}]` : `${path}.${k}`, type, map)
    }
  }
}

function formatVal(v: any): string {
  if (v === null) return 'null'
  if (v === undefined) return ''
  if (typeof v === 'string') return `"${v}"`
  return String(v)
}

function formatBracket(val: any): string {
  return Array.isArray(val) ? `[${Object.keys(val).length}]` : `{${Object.keys(val).length}}`
}

function getDiffType(path: string): DiffType {
  return diffMap.value.get(path) ?? 'equal'
}

/** 判断容器节点是否包含差异子节点 */
function hasChildDiff(path: string): boolean {
  const prefix = path ? path + '.' : ''
  const prefixArr = path ? path + '[' : ''
  for (const [k, v] of diffMap.value) {
    if (v !== 'equal' && (k.startsWith(prefix) || k.startsWith(prefixArr))) return true
  }
  return false
}

function rowDiffType(row: TreeRow): DiffType | 'container-diff' {
  const dt = getDiffType(row.path)
  if (dt !== 'equal') return dt
  if (!row.isLeaf && hasChildDiff(row.path)) return 'container-diff'
  return 'equal'
}

/** 计算 SVG 连线坐标 */
function updateLines() {
  if (!wrapperRef.value || !leftPanelRef.value || !rightPanelRef.value) return
  const wRect = wrapperRef.value.getBoundingClientRect()
  const result: LineCoord[] = []

  // 找到所有差异路径（changed 类型，两边都有对应节点）
  for (const [path, type] of diffMap.value) {
    if (type !== 'changed') continue
    const leftEl = leftPanelRef.value.querySelector(`[data-path="${CSS.escape(path)}"]`)
    const rightEl = rightPanelRef.value.querySelector(`[data-path="${CSS.escape(path)}"]`)
    if (!leftEl || !rightEl) continue
    const lRect = leftEl.getBoundingClientRect()
    const rRect = rightEl.getBoundingClientRect()
    result.push({
      path, type,
      x1: lRect.right - wRect.left,
      y1: lRect.top + lRect.height / 2 - wRect.top,
      x2: rRect.left - wRect.left,
      y2: rRect.top + rRect.height / 2 - wRect.top,
    })
  }
  lines.value = result
}

function handleCompare() {
  errorMsg.value = ''
  let oldObj: any, newObj: any
  try { oldObj = JSON.parse(oldJson.value) }
  catch { errorMsg.value = 'A（原始JSON）解析失败'; return }
  try { newObj = JSON.parse(newJson.value) }
  catch { errorMsg.value = 'B（新JSON）解析失败'; return }

  const lRows: TreeRow[] = [], rRows: TreeRow[] = []
  flatten(oldObj, '', 'root', 0, false, lRows)
  flatten(newObj, '', 'root', 0, false, rRows)
  leftRows.value = lRows
  rightRows.value = rRows

  const map = new Map<string, DiffType>()
  collectDiff(oldObj, newObj, '', map)
  diffMap.value = map
  hasCompared.value = true

  nextTick(() => {
    updateLines()
    leftPanelRef.value?.addEventListener('scroll', updateLines)
    rightPanelRef.value?.addEventListener('scroll', updateLines)
  })
}

function handleClear() {
  oldJson.value = ''; newJson.value = ''
  leftRows.value = []; rightRows.value = []
  diffMap.value = new Map(); lines.value = []
  hasCompared.value = false; errorMsg.value = ''
}

function handleEdit() {
  cleanup()
  hasCompared.value = false
  leftRows.value = []; rightRows.value = []
  diffMap.value = new Map(); lines.value = []
}

function handleSwap() {
  const tmp = oldJson.value; oldJson.value = newJson.value; newJson.value = tmp
  if (hasCompared.value) handleCompare()
}

function handlePaste(target: 'old' | 'new') {
  navigator.clipboard.readText().then(t => {
    if (target === 'old') oldJson.value = t; else newJson.value = t
  })
}

function loadSample() {
  oldJson.value = JSON.stringify({
    name: "UsefulTools", version: "1.0.0", description: "工具集合",
    features: ["JSON格式化", "代码高亮"],
    config: { theme: "dark", lang: "zh-CN", autoSave: true },
    author: { name: "开发者", email: "dev@example.com" },
    count: 1024, active: true
  }, null, 2)
  newJson.value = JSON.stringify({
    name: "UsefulTools", version: "2.0.0", description: "实用工具集合",
    features: ["JSON格式化", "代码高亮", "文本对比"],
    config: { theme: "light", lang: "zh-CN", fontSize: 14 },
    author: { name: "开发者", url: "https://example.com" },
    count: 2048, active: true, tags: ["tool", "dev"]
  }, null, 2)
  handleCompare()
}

const stats = computed(() => {
  let added = 0, removed = 0, changed = 0
  for (const [, v] of diffMap.value) {
    if (v === 'added') added++
    else if (v === 'removed') removed++
    else if (v === 'changed') changed++
  }
  return { added, removed, changed }
})

function cleanup() {
  leftPanelRef.value?.removeEventListener('scroll', updateLines)
  rightPanelRef.value?.removeEventListener('scroll', updateLines)
}

onBeforeUnmount(cleanup)

function rowBgClass(row: TreeRow): string {
  const dt = rowDiffType(row)
  if (dt === 'added') return 'bg-neon-green/12'
  if (dt === 'removed') return 'bg-coral-red/12'
  if (dt === 'changed') return 'bg-primary/10'
  if (dt === 'container-diff') return 'bg-white/[0.02]'
  return ''
}

function rowTextClass(row: TreeRow): string {
  const dt = rowDiffType(row)
  if (dt === 'added') return 'text-neon-green'
  if (dt === 'removed') return 'text-coral-red'
  if (dt === 'changed') return 'text-primary'
  return 'text-gray-400'
}

function lineColor(type: DiffType): string {
  if (type === 'changed') return '#EAB308'
  if (type === 'added') return '#39FF14'
  if (type === 'removed') return '#FF6B6B'
  return '#666'
}

function diffIcon(row: TreeRow): string {
  const dt = rowDiffType(row)
  if (dt === 'added') return 'add_circle'
  if (dt === 'removed') return 'remove_circle'
  if (dt === 'changed') return 'change_circle'
  return ''
}

function diffIconClass(row: TreeRow): string {
  const dt = rowDiffType(row)
  if (dt === 'added') return 'text-neon-green/70'
  if (dt === 'removed') return 'text-coral-red/70'
  if (dt === 'changed') return 'text-primary/70'
  return ''
}
</script>


<template>
  <div class="flex flex-col h-full gap-3">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3">
      <button v-if="!hasCompared"
        class="h-9 px-4 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 text-sm"
        @click="handleCompare"
      >
        <span class="material-icons text-lg">compare_arrows</span>对比
      </button>
      <button v-if="hasCompared"
        class="h-9 px-4 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 text-sm"
        @click="handleEdit"
      >
        <span class="material-icons text-lg">edit</span>编辑
      </button>
      <button
        class="h-9 px-4 bg-white text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 text-sm"
        @click="handleSwap"
      >
        <span class="material-icons text-lg">swap_horiz</span>交换
      </button>
      <button
        class="h-9 px-4 bg-coral-red text-white font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 text-sm"
        @click="handleClear"
      >
        <span class="material-icons text-lg">delete_outline</span>清空
      </button>
      <div class="ml-auto flex items-center gap-3">
        <div v-if="hasCompared" class="flex items-center gap-3 text-sm font-bold">
          <span class="text-neon-green">+{{ stats.added }}</span>
          <span class="text-primary">~{{ stats.changed }}</span>
          <span class="text-coral-red">-{{ stats.removed }}</span>
        </div>
        <button
          class="h-9 px-3 bg-deep-charcoal text-gray-300 font-bold border-2 border-white/20 rounded hover:border-primary hover:text-primary transition-all text-sm flex items-center gap-1.5"
          @click="loadSample"
        >
          <span class="material-icons text-lg">science</span>示例
        </button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="errorMsg"
      class="px-4 py-2 bg-coral-red/20 border-2 border-coral-red rounded flex items-center gap-2 text-coral-red font-bold text-sm"
    >
      <span class="material-icons text-lg">error_outline</span>{{ errorMsg }}
    </div>

    <!-- 编辑模式 -->
    <template v-if="!hasCompared">
      <div class="flex-1 grid grid-cols-2 gap-3 min-h-0">
        <div class="flex flex-col min-h-0">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-sm font-bold text-gray-400 tracking-wider">A 原始JSON</span>
            <button class="ml-auto text-xs text-gray-500 hover:text-primary transition-colors flex items-center gap-1" @click="handlePaste('old')">
              <span class="material-icons text-sm">content_paste</span>粘贴
            </button>
          </div>
          <textarea v-model="oldJson" placeholder='在此粘贴原始 JSON...' spellcheck="false"
            class="flex-1 w-full bg-deep-charcoal text-gray-100 border-4 border-black rounded-xl p-4 font-mono text-sm leading-relaxed resize-none shadow-hard focus:border-primary focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all outline-none placeholder-gray-600"
          />
        </div>
        <div class="flex flex-col min-h-0">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-sm font-bold text-gray-400 tracking-wider">B 新JSON</span>
            <button class="ml-auto text-xs text-gray-500 hover:text-primary transition-colors flex items-center gap-1" @click="handlePaste('new')">
              <span class="material-icons text-sm">content_paste</span>粘贴
            </button>
          </div>
          <textarea v-model="newJson" placeholder='在此粘贴新 JSON...' spellcheck="false"
            class="flex-1 w-full bg-deep-charcoal text-gray-100 border-4 border-black rounded-xl p-4 font-mono text-sm leading-relaxed resize-none shadow-hard focus:border-primary focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all outline-none placeholder-gray-600"
          />
        </div>
      </div>
    </template>

    <!-- 对比结果：左右 JSON 树 + 连线 -->
    <div v-if="hasCompared" ref="wrapperRef" class="flex-1 relative grid grid-cols-[1fr_60px_1fr] min-h-0">
      <!-- SVG 连线层（覆盖整个 wrapper） -->
      <svg class="absolute inset-0 w-full h-full pointer-events-none z-10" style="overflow: visible;">
        <path v-for="(l, idx) in lines" :key="idx"
          :d="`M ${l.x1} ${l.y1} C ${l.x1 + 25} ${l.y1}, ${l.x2 - 25} ${l.y2}, ${l.x2} ${l.y2}`"
          :stroke="lineColor(l.type)"
          stroke-width="2"
          fill="none"
          opacity="0.7"
        />
      </svg>

      <!-- 左树 -->
      <div ref="leftPanelRef" class="bg-deep-charcoal border-4 border-black rounded-xl overflow-auto shadow-hard">
        <div class="p-2 font-mono text-sm">
          <div v-for="(row, idx) in leftRows" :key="idx"
            :data-path="row.path"
            class="flex items-baseline py-0.5 px-2 rounded -mx-1"
            :class="rowBgClass(row)"
            :style="{ paddingLeft: (row.depth * 16 + 8) + 'px' }"
          >
            <span class="shrink-0 mr-1" :class="rowTextClass(row)">
              {{ row.parentIsArr ? `[${row.key}]` : row.key }}
            </span>
            <template v-if="row.isLeaf">
              <span class="text-gray-600 mx-0.5">:</span>
              <span :class="rowTextClass(row)">{{ formatVal(row.val) }}</span>
            </template>
            <template v-else>
              <span class="text-gray-600 ml-0.5">{{ formatBracket(row.val) }}</span>
            </template>
            <span v-if="diffIcon(row)" class="material-icons ml-auto shrink-0 text-sm leading-none" :class="diffIconClass(row)">{{ diffIcon(row) }}</span>
          </div>
        </div>
      </div>

      <!-- 中间间距 -->
      <div></div>

      <!-- 右树 -->
      <div ref="rightPanelRef" class="bg-deep-charcoal border-4 border-black rounded-xl overflow-auto shadow-hard">
        <div class="p-2 font-mono text-sm">
          <div v-for="(row, idx) in rightRows" :key="idx"
            :data-path="row.path"
            class="flex items-baseline py-0.5 px-2 rounded -mx-1"
            :class="rowBgClass(row)"
            :style="{ paddingLeft: (row.depth * 16 + 8) + 'px' }"
          >
            <span class="shrink-0 mr-1" :class="rowTextClass(row)">
              {{ row.parentIsArr ? `[${row.key}]` : row.key }}
            </span>
            <template v-if="row.isLeaf">
              <span class="text-gray-600 mx-0.5">:</span>
              <span :class="rowTextClass(row)">{{ formatVal(row.val) }}</span>
            </template>
            <template v-else>
              <span class="text-gray-600 ml-0.5">{{ formatBracket(row.val) }}</span>
            </template>
            <span v-if="diffIcon(row)" class="material-icons ml-auto shrink-0 text-sm leading-none" :class="diffIconClass(row)">{{ diffIcon(row) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
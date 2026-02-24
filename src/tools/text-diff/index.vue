<script setup lang="ts">
import { ref, computed } from 'vue'
import { diffLines } from 'diff'

type ViewMode = 'unified' | 'split'

interface UnifiedLine {
  oldNum: number | null
  newNum: number | null
  text: string
  type: 'equal' | 'added' | 'removed'
}

interface SplitLine {
  num: number | null
  text: string
  type: 'equal' | 'added' | 'removed' | 'placeholder'
}

const oldText = ref('')
const newText = ref('')
const hasCompared = ref(false)
const viewMode = ref<ViewMode>('unified')

// unified view data
const unifiedLines = ref<UnifiedLine[]>([])
// split view data
const leftLines = ref<SplitLine[]>([])
const rightLines = ref<SplitLine[]>([])

const leftPanel = ref<HTMLElement | null>(null)
const rightPanel = ref<HTMLElement | null>(null)
let syncing = false

function splitText(str: string) {
  const lines = str.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  return lines
}

interface AlignOp {
  type: 'equal' | 'replace' | 'delete' | 'insert'
  oldText?: string
  newText?: string
}

/** LCS 细粒度行匹配 */
function alignChunk(oldArr: string[], newArr: string[]): AlignOp[] {
  const m = oldArr.length, n = newArr.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = oldArr[i - 1] === newArr[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
  const ops: AlignOp[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldArr[i - 1] === newArr[j - 1]) {
      ops.push({ type: 'equal', oldText: oldArr[i - 1], newText: newArr[j - 1] })
      i--; j--
    } else if (i > 0 && j > 0 && dp[i - 1][j] === dp[i][j - 1]) {
      ops.push({ type: 'replace', oldText: oldArr[i - 1], newText: newArr[j - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'insert', newText: newArr[j - 1] })
      j--
    } else {
      ops.push({ type: 'delete', oldText: oldArr[i - 1] })
      i--
    }
  }
  return ops.reverse()
}

function handleCompare() {
  const changes = diffLines(oldText.value, newText.value)
  const unified: UnifiedLine[] = []
  const left: SplitLine[] = []
  const right: SplitLine[] = []
  let oldNum = 0, newNum = 0

  for (let ci = 0; ci < changes.length; ci++) {
    const c = changes[ci]
    if (!c.added && !c.removed) {
      for (const line of splitText(c.value)) {
        oldNum++; newNum++
        unified.push({ oldNum, newNum, text: line, type: 'equal' })
        left.push({ num: oldNum, text: line, type: 'equal' })
        right.push({ num: newNum, text: line, type: 'equal' })
      }
    } else if (c.removed && changes[ci + 1]?.added) {
      const removedArr = splitText(c.value)
      const addedArr = splitText(changes[ci + 1].value)
      const subOps = alignChunk(removedArr, addedArr)
      for (const op of subOps) {
        if (op.type === 'equal') {
          oldNum++; newNum++
          unified.push({ oldNum, newNum, text: op.oldText!, type: 'equal' })
          left.push({ num: oldNum, text: op.oldText!, type: 'equal' })
          right.push({ num: newNum, text: op.newText!, type: 'equal' })
        } else if (op.type === 'replace') {
          oldNum++; newNum++
          unified.push({ oldNum, newNum: null, text: op.oldText!, type: 'removed' })
          unified.push({ oldNum: null, newNum, text: op.newText!, type: 'added' })
          left.push({ num: oldNum, text: op.oldText!, type: 'removed' })
          right.push({ num: newNum, text: op.newText!, type: 'added' })
        } else if (op.type === 'delete') {
          oldNum++
          unified.push({ oldNum, newNum: null, text: op.oldText!, type: 'removed' })
          left.push({ num: oldNum, text: op.oldText!, type: 'removed' })
          right.push({ num: null, text: '', type: 'placeholder' })
        } else if (op.type === 'insert') {
          newNum++
          unified.push({ oldNum: null, newNum, text: op.newText!, type: 'added' })
          left.push({ num: null, text: '', type: 'placeholder' })
          right.push({ num: newNum, text: op.newText!, type: 'added' })
        }
      }
      ci++
    } else if (c.removed) {
      for (const line of splitText(c.value)) {
        oldNum++
        unified.push({ oldNum, newNum: null, text: line, type: 'removed' })
        left.push({ num: oldNum, text: line, type: 'removed' })
        right.push({ num: null, text: '', type: 'placeholder' })
      }
    } else if (c.added) {
      for (const line of splitText(c.value)) {
        newNum++
        unified.push({ oldNum: null, newNum, text: line, type: 'added' })
        left.push({ num: null, text: '', type: 'placeholder' })
        right.push({ num: newNum, text: line, type: 'added' })
      }
    }
  }
  unifiedLines.value = unified
  leftLines.value = left
  rightLines.value = right
  hasCompared.value = true
}

function handleClear() {
  oldText.value = ''; newText.value = ''
  unifiedLines.value = []; leftLines.value = []; rightLines.value = []
  hasCompared.value = false
}

function handleSwap() {
  const tmp = oldText.value
  oldText.value = newText.value
  newText.value = tmp
  if (hasCompared.value) handleCompare()
}

function handleEdit() {
  hasCompared.value = false
  unifiedLines.value = []; leftLines.value = []; rightLines.value = []
}

function handlePaste(target: 'old' | 'new') {
  navigator.clipboard.readText().then(text => {
    if (target === 'old') oldText.value = text
    else newText.value = text
  })
}

function loadSample() {
  oldText.value = `html,\nbody {\n  width: 100%;\n  height: 100%;\n  padding: 0;\n  overflow: hidden;\n  font-family: 'Fira Mono', monospace;\n  font-weight: normal;\n  font-size: 62.5%;\n}\n\n#app-container {\n  width: 100%;\n  height: 100%;\n  cursor: pointer;\n}\n\n.loading {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  background-color: #000000;\n  opacity: 1;\n}`
  newText.value = `html,\nbody {\n  width: 100%;\n  height: 100%;\n  padding: 0;\n  overflow: visible;\n  font-family: 'Fira Mono', helvetica, arial, sans-serif;\n  font-weight: normal;\n  font-size: 62.5%;\n}\n\n#app-container {\n  width: 100%;\n  height: 100%;\n  cursor: pointer;\n}\n\n.loading {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  background-color: #031607;\n  opacity: 1;\n}`
  handleCompare()
}

const stats = computed(() => {
  let added = 0, removed = 0
  for (const l of unifiedLines.value) {
    if (l.type === 'added') added++
    else if (l.type === 'removed') removed++
  }
  return { added, removed }
})

function syncScroll(source: 'left' | 'right') {
  if (syncing) return
  syncing = true
  const from = source === 'left' ? leftPanel.value : rightPanel.value
  const to = source === 'left' ? rightPanel.value : leftPanel.value
  if (from && to) {
    to.scrollTop = from.scrollTop
    to.scrollLeft = from.scrollLeft
  }
  requestAnimationFrame(() => { syncing = false })
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
          <span class="text-coral-red">-{{ stats.removed }}</span>
        </div>
        <!-- 视图切换 -->
        <div v-if="hasCompared" class="flex border-2 border-white/20 rounded overflow-hidden">
          <button
            class="h-7 px-2.5 text-xs font-bold flex items-center gap-1 transition-all"
            :class="viewMode === 'unified' ? 'bg-primary text-black' : 'bg-deep-charcoal text-gray-400 hover:text-white'"
            @click="viewMode = 'unified'"
          >
            <span class="material-icons text-sm">view_agenda</span>统一
          </button>
          <button
            class="h-7 px-2.5 text-xs font-bold flex items-center gap-1 transition-all border-l border-white/20"
            :class="viewMode === 'split' ? 'bg-primary text-black' : 'bg-deep-charcoal text-gray-400 hover:text-white'"
            @click="viewMode = 'split'"
          >
            <span class="material-icons text-sm">view_column</span>并排
          </button>
        </div>
        <button
          class="h-9 px-3 bg-deep-charcoal text-gray-300 font-bold border-2 border-white/20 rounded hover:border-primary hover:text-primary transition-all text-sm flex items-center gap-1.5"
          @click="loadSample"
        >
          <span class="material-icons text-lg">science</span>示例
        </button>
      </div>
    </div>

    <!-- 编辑模式：并排输入 -->
    <template v-if="!hasCompared">
      <div class="flex-1 grid grid-cols-2 gap-3 min-h-0">
        <div class="flex flex-col min-h-0">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-sm font-bold text-gray-400 tracking-wider">A 原始文本</span>
            <button class="ml-auto text-xs text-gray-500 hover:text-primary transition-colors flex items-center gap-1" @click="handlePaste('old')">
              <span class="material-icons text-sm">content_paste</span>粘贴
            </button>
          </div>
          <textarea v-model="oldText" placeholder="在此输入原始文本..." spellcheck="false"
            class="flex-1 w-full bg-deep-charcoal text-gray-100 border-4 border-black rounded-xl p-4 font-mono text-sm leading-relaxed resize-none shadow-hard focus:border-primary focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all outline-none placeholder-gray-600"
          />
        </div>
        <div class="flex flex-col min-h-0">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-sm font-bold text-gray-400 tracking-wider">B 新文本</span>
            <button class="ml-auto text-xs text-gray-500 hover:text-primary transition-colors flex items-center gap-1" @click="handlePaste('new')">
              <span class="material-icons text-sm">content_paste</span>粘贴
            </button>
          </div>
          <textarea v-model="newText" placeholder="在此输入新文本..." spellcheck="false"
            class="flex-1 w-full bg-deep-charcoal text-gray-100 border-4 border-black rounded-xl p-4 font-mono text-sm leading-relaxed resize-none shadow-hard focus:border-primary focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all outline-none placeholder-gray-600"
          />
        </div>
      </div>
    </template>

    <!-- 对比结果：统一视图 -->
    <div v-if="hasCompared && viewMode === 'unified'" class="flex-1 flex flex-col min-h-0">
      <div class="flex-1 bg-deep-charcoal border-4 border-black rounded-xl overflow-auto shadow-hard">
        <table class="w-full font-mono text-sm border-collapse">
          <tr v-for="(line, idx) in unifiedLines" :key="idx"
            :class="{
              'bg-coral-red/12': line.type === 'removed',
              'bg-neon-green/12': line.type === 'added',
            }"
          >
            <td class="diff-num select-none text-right pr-1.5 pl-2 border-r border-white/10"
              :class="line.type === 'removed' ? 'text-coral-red/40' : line.type === 'added' ? 'text-neon-green/40' : 'text-gray-600'"
            >{{ line.oldNum ?? '' }}</td>
            <td class="diff-num select-none text-right pr-1.5 pl-1.5 border-r border-white/10"
              :class="line.type === 'removed' ? 'text-coral-red/40' : line.type === 'added' ? 'text-neon-green/40' : 'text-gray-600'"
            >{{ line.newNum ?? '' }}</td>
            <td class="select-none w-5 text-center font-bold"
              :class="line.type === 'removed' ? 'text-coral-red' : line.type === 'added' ? 'text-neon-green' : 'text-gray-700'"
            >{{ line.type === 'removed' ? '-' : line.type === 'added' ? '+' : ' ' }}</td>
            <td class="pr-4 whitespace-pre"
              :class="line.type === 'removed' ? 'text-coral-red/90' : line.type === 'added' ? 'text-neon-green/90' : 'text-gray-300'"
            >{{ line.text }}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- 对比结果：并排视图 -->
    <div v-if="hasCompared && viewMode === 'split'" class="flex-1 grid grid-cols-2 gap-3 min-h-0">
      <div ref="leftPanel" @scroll="syncScroll('left')"
        class="bg-deep-charcoal border-4 border-black rounded-xl overflow-auto shadow-hard"
      >
        <table class="w-full font-mono text-sm border-collapse">
          <tr v-for="(line, idx) in leftLines" :key="idx"
            :class="{
              'bg-coral-red/12': line.type === 'removed',
              'bg-white/[0.03]': line.type === 'placeholder',
            }"
          >
            <td class="diff-num select-none text-right pr-2 pl-2 border-r border-white/10"
              :class="line.type === 'removed' ? 'text-coral-red/40' : line.type === 'placeholder' ? 'text-transparent' : 'text-gray-600'"
            >{{ line.num ?? '' }}</td>
            <td class="px-3 whitespace-pre"
              :class="line.type === 'removed' ? 'text-coral-red/90' : line.type === 'placeholder' ? '' : 'text-gray-300'"
            >{{ line.text }}</td>
          </tr>
        </table>
      </div>
      <div ref="rightPanel" @scroll="syncScroll('right')"
        class="bg-deep-charcoal border-4 border-black rounded-xl overflow-auto shadow-hard"
      >
        <table class="w-full font-mono text-sm border-collapse">
          <tr v-for="(line, idx) in rightLines" :key="idx"
            :class="{
              'bg-neon-green/12': line.type === 'added',
              'bg-white/[0.03]': line.type === 'placeholder',
            }"
          >
            <td class="diff-num select-none text-right pr-2 pl-2 border-r border-white/10"
              :class="line.type === 'added' ? 'text-neon-green/40' : line.type === 'placeholder' ? 'text-transparent' : 'text-gray-600'"
            >{{ line.num ?? '' }}</td>
            <td class="px-3 whitespace-pre"
              :class="line.type === 'added' ? 'text-neon-green/90' : line.type === 'placeholder' ? '' : 'text-gray-300'"
            >{{ line.text }}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
table tr td {
  line-height: 1.75;
}
.diff-num {
  min-width: 3ch;
}
</style>


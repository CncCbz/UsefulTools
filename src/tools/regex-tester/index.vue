<script setup lang="ts">
import { ref, computed } from 'vue'

const pattern = ref('')
const flags = ref('g')
const testText = ref('')
const errorMsg = ref('')

const flagOptions = [
  { label: 'g', title: '全局匹配' },
  { label: 'i', title: '忽略大小写' },
  { label: 'm', title: '多行模式' },
  { label: 's', title: '点号匹配换行' },
  { label: 'u', title: 'Unicode模式' },
]

function toggleFlag(f: string) {
  flags.value = flags.value.includes(f)
    ? flags.value.replace(f, '')
    : flags.value + f
}

interface MatchResult {
  text: string
  index: number
  groups: string[]
  namedGroups?: Record<string, string>
}

const matches = computed<MatchResult[]>(() => {
  if (!pattern.value || !testText.value) {
    errorMsg.value = ''
    return []
  }
  try {
    const re = new RegExp(pattern.value, flags.value)
    errorMsg.value = ''
    const results: MatchResult[] = []
    if (flags.value.includes('g')) {
      let m: RegExpExecArray | null
      while ((m = re.exec(testText.value)) !== null) {
        results.push({
          text: m[0],
          index: m.index,
          groups: m.slice(1),
          namedGroups: m.groups ? { ...m.groups } : undefined,
        })
        if (!m[0].length) re.lastIndex++
      }
    } else {
      const m = re.exec(testText.value)
      if (m) {
        results.push({
          text: m[0],
          index: m.index,
          groups: m.slice(1),
          namedGroups: m.groups ? { ...m.groups } : undefined,
        })
      }
    }
    return results
  } catch (e: any) {
    errorMsg.value = e.message || '无效的正则表达式'
    return []
  }
})

// 高亮颜色循环
const highlightColors = [
  { bg: 'rgba(249,177,31,0.35)', border: '#f9b11f' },
  { bg: 'rgba(59,130,246,0.35)', border: '#3b82f6' },
  { bg: 'rgba(132,204,22,0.35)', border: '#84cc16' },
  { bg: 'rgba(168,85,247,0.35)', border: '#a855f7' },
  { bg: 'rgba(236,72,153,0.35)', border: '#ec4899' },
  { bg: 'rgba(255,107,107,0.35)', border: '#ff6b6b' },
]

const highlightedHtml = computed(() => {
  if (!testText.value) return ''
  if (!matches.value.length) return escapeHtml(testText.value)

  const text = testText.value
  // 构建不重叠的区间
  const intervals = matches.value.map((m, i) => ({
    start: m.index,
    end: m.index + m.text.length,
    colorIdx: i % highlightColors.length,
    matchIdx: i,
  }))

  let result = ''
  let cursor = 0
  for (const iv of intervals) {
    if (iv.start > cursor) {
      result += escapeHtml(text.slice(cursor, iv.start))
    }
    const c = highlightColors[iv.colorIdx]
    result += `<mark style="background:${c.bg};border-bottom:2px solid ${c.border};border-radius:2px;padding:0 1px;color:inherit;" title="匹配 #${iv.matchIdx + 1}">${escapeHtml(text.slice(iv.start, iv.end))}</mark>`
    cursor = iv.end
  }
  if (cursor < text.length) {
    result += escapeHtml(text.slice(cursor))
  }
  return result
})

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
}

function loadSample() {
  pattern.value = '(\\d{4})-(\\d{2})-(\\d{2})'
  flags.value = 'g'
  testText.value = '今天是 2026-02-13，昨天是 2026-02-12。\n会议时间：2026-03-01 下午两点。\n无效日期：abcd-ef-gh'
}

function handleClear() {
  pattern.value = ''
  flags.value = 'g'
  testText.value = ''
  errorMsg.value = ''
}
</script>

<template>
  <div class="flex flex-col h-full gap-4">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3">
      <button
        class="h-9 px-4 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 text-sm"
        @click="loadSample"
      >
        <span class="material-icons text-lg">science</span>
        示例
      </button>
      <button
        class="h-9 px-4 bg-coral-red text-white font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 text-sm"
        @click="handleClear"
      >
        <span class="material-icons text-lg">delete_outline</span>
        清空
      </button>
    </div>

    <!-- Regex input row -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-2 flex-1 min-w-[200px]">
        <span class="text-primary font-mono text-lg">/</span>
        <input
          v-model="pattern"
          placeholder="输入正则表达式..."
          spellcheck="false"
          class="flex-1 h-10 bg-deep-charcoal text-gray-100 border-2 border-black rounded px-3 font-mono text-sm shadow-hard-sm focus:border-primary focus:shadow-none transition-all outline-none placeholder-gray-600"
        />
        <span class="text-primary font-mono text-lg">/</span>
      </div>
      <div class="flex items-center gap-1">
        <button
          v-for="f in flagOptions"
          :key="f.label"
          :title="f.title"
          class="w-8 h-8 font-mono font-bold text-sm border-2 border-black rounded transition-all"
          :class="flags.includes(f.label) ? 'bg-primary text-black shadow-hard-sm' : 'bg-deep-charcoal text-gray-500 hover:text-gray-300'"
          @click="toggleFlag(f.label)"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Error bar -->
    <div
      v-if="errorMsg"
      class="px-4 py-2 bg-coral-red/20 border-2 border-coral-red rounded flex items-center gap-2 text-coral-red font-bold text-sm"
    >
      <span class="material-icons text-lg">error_outline</span>
      {{ errorMsg }}
    </div>

    <!-- Main panels -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
      <!-- Test text input -->
      <div class="flex flex-col min-h-0">
        <div class="flex items-center gap-2 mb-2">
          <span class="material-icons text-primary text-lg">edit_note</span>
          <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">测试文本</span>
        </div>
        <textarea
          v-model="testText"
          placeholder="在此输入要测试的文本..."
          spellcheck="false"
          class="flex-1 w-full bg-deep-charcoal text-gray-100 border-4 border-black rounded-xl p-4 font-mono text-sm leading-relaxed resize-none shadow-hard focus:border-primary focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] transition-all outline-none placeholder-gray-600 min-h-[180px]"
        />
      </div>

      <!-- Highlighted result -->
      <div class="flex flex-col min-h-0">
        <div class="flex items-center gap-2 mb-2">
          <span class="material-icons text-neon-green text-lg">highlight</span>
          <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">匹配可视化</span>
          <span v-if="matches.length" class="ml-2 text-xs text-primary font-bold">
            {{ matches.length }} 个匹配
          </span>
        </div>
        <div
          class="flex-1 w-full bg-deep-charcoal border-4 border-black rounded-xl p-4 overflow-auto shadow-hard min-h-[180px] font-mono text-sm leading-relaxed text-gray-100 whitespace-pre-wrap break-all"
          v-html="highlightedHtml || '<span class=\'text-gray-600\'>匹配结果将高亮显示在这里...</span>'"
        />
      </div>
    </div>

    <!-- Match details -->
    <div v-if="matches.length" class="max-h-[200px] overflow-auto">
      <div class="flex items-center gap-2 mb-2">
        <span class="material-icons text-electric-blue text-lg">list_alt</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">匹配详情</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        <div
          v-for="(m, i) in matches"
          :key="i"
          class="bg-deep-charcoal border-2 border-black rounded-lg p-3 shadow-hard-sm"
        >
          <div class="flex items-center gap-2 mb-1">
            <span
              class="inline-block w-3 h-3 rounded-sm border border-black"
              :style="{ background: highlightColors[i % highlightColors.length].border }"
            />
            <span class="text-xs font-bold text-gray-400">匹配 #{{ i + 1 }}</span>
            <span class="ml-auto text-xs text-gray-500">索引: {{ m.index }}</span>
          </div>
          <div class="font-mono text-sm text-white break-all">
            "{{ m.text }}"
          </div>
          <div v-if="m.groups.length" class="mt-1 text-xs text-gray-400">
            <span v-for="(g, gi) in m.groups" :key="gi" class="mr-2">
              ${{ gi + 1 }}=<span class="text-neon-green">"{{ g }}"</span>
            </span>
          </div>
          <div v-if="m.namedGroups" class="mt-1 text-xs text-gray-400">
            <span v-for="(v, k) in m.namedGroups" :key="k" class="mr-2">
              {{ k }}=<span class="text-electric-blue">"{{ v }}"</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


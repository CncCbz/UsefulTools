<script setup lang="ts">
import { ref, computed } from 'vue'

const input = ref('')
const copyField = ref('')

const stats = computed(() => {
  const text = input.value
  if (!text) return []

  const chars = text.length
  const charsNoSpace = text.replace(/\s/g, '').length
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const lines = text ? text.split('\n').length : 0
  const sentences = text.trim() ? text.split(/[.!?。！？]+/).filter(s => s.trim()).length : 0
  const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(p => p.trim()).length : 0

  // 中文字符
  const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length
  // 英文单词
  const enWords = (text.match(/[a-zA-Z]+/g) || []).length
  // 数字
  const digits = (text.match(/\d/g) || []).length
  // 标点
  const punctuation = (text.match(/[^\w\s\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length

  // 字节大小
  const byteSize = new TextEncoder().encode(text).length

  return [
    { label: '总字符数', value: chars.toLocaleString(), color: 'text-primary', icon: 'text_fields' },
    { label: '字符数（不含空格）', value: charsNoSpace.toLocaleString(), color: 'text-primary', icon: 'text_fields' },
    { label: '单词数', value: words.toLocaleString(), color: 'text-electric-blue', icon: 'spellcheck' },
    { label: '行数', value: lines.toLocaleString(), color: 'text-vibrant-purple', icon: 'format_list_numbered' },
    { label: '句子数', value: sentences.toLocaleString(), color: 'text-neon-green', icon: 'short_text' },
    { label: '段落数', value: paragraphs.toLocaleString(), color: 'text-hot-pink', icon: 'subject' },
    { label: '中文字符', value: cjk.toLocaleString(), color: 'text-coral-red', icon: 'translate' },
    { label: '英文单词', value: enWords.toLocaleString(), color: 'text-electric-blue', icon: 'abc' },
    { label: '数字字符', value: digits.toLocaleString(), color: 'text-neon-green', icon: 'pin' },
    { label: '标点符号', value: punctuation.toLocaleString(), color: 'text-gray-400', icon: 'more_horiz' },
    { label: '字节大小', value: formatBytes(byteSize), color: 'text-vibrant-purple', icon: 'data_usage' },
  ]
})

// 词频统计（前 10）
const wordFreq = computed(() => {
  if (!input.value.trim()) return []
  const words = input.value.toLowerCase().match(/[\u4e00-\u9fff]|[a-zA-Z]+/g) || []
  const freq: Record<string, number> = {}
  for (const w of words) freq[w] = (freq[w] || 0) + 1
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10)
})

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function copy(text: string, field: string) {
  await navigator.clipboard.writeText(text)
  copyField.value = field
  setTimeout(() => { copyField.value = '' }, 1200)
}
</script>

<template>
  <div class="flex flex-col h-full gap-5">
    <div class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-icons text-primary text-lg">analytics</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">文本统计</span>
      </div>
      <textarea v-model="input" rows="6" placeholder="输入或粘贴文本..."
        class="w-full bg-bg-dark text-gray-100 border-4 border-black rounded-lg px-4 py-3 font-mono text-sm shadow-hard focus:border-primary focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] transition-all outline-none placeholder-gray-600 resize-none" />
    </div>

    <div v-if="stats.length" class="flex-1 flex flex-col gap-4 overflow-auto min-h-0">
      <!-- 统计网格 -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="s in stats" :key="s.label"
          class="bg-deep-charcoal border-4 border-black rounded-xl p-3 shadow-hard cursor-pointer hover:border-primary transition-all group"
          @click="copy(s.value, s.label)">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="material-icons text-sm text-gray-600">{{ s.icon }}</span>
            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{{ s.label }}</span>
          </div>
          <div class="font-mono text-lg font-bold" :class="s.color">{{ s.value }}</div>
        </div>
      </div>

      <!-- 词频 -->
      <div v-if="wordFreq.length" class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
        <div class="flex items-center gap-2 mb-3">
          <span class="material-icons text-primary text-sm">bar_chart</span>
          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">词频 TOP 10</span>
        </div>
        <div class="space-y-1.5">
          <div v-for="[word, count] in wordFreq" :key="word" class="flex items-center gap-3">
            <span class="font-mono text-sm text-gray-300 w-24 truncate">{{ word }}</span>
            <div class="flex-1 h-4 bg-bg-dark rounded-full border border-black overflow-hidden">
              <div class="h-full bg-primary rounded-full transition-all"
                :style="{ width: (count / wordFreq[0][1] * 100) + '%' }"></div>
            </div>
            <span class="font-mono text-xs text-gray-500 w-8 text-right">{{ count }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

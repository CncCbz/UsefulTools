<script setup lang="ts">
import { ref } from 'vue'

const input = ref('')
const output = ref('')
const mode = ref<'encode' | 'decode'>('encode')
const copyField = ref('')

function htmlEncode(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    '©': '&copy;', '®': '&reg;', '™': '&trade;', '€': '&euro;', '£': '&pound;',
    '¥': '&yen;', '°': '&deg;', '±': '&plusmn;', '×': '&times;', '÷': '&divide;',
    '←': '&larr;', '→': '&rarr;', '↑': '&uarr;', '↓': '&darr;', '♠': '&spades;',
    '♣': '&clubs;', '♥': '&hearts;', '♦': '&diams;',
  }
  return str.replace(/[&<>"'©®™€£¥°±×÷←→↑↓♠♣♥♦]/g, c => map[c] || c)
    .replace(/[^\x20-\x7E\n\r\t]/g, c => `&#${c.charCodeAt(0)};`)
}

function htmlDecode(str: string): string {
  const el = document.createElement('textarea')
  el.innerHTML = str
  return el.value
}

function convert() {
  if (!input.value) { output.value = ''; return }
  output.value = mode.value === 'encode' ? htmlEncode(input.value) : htmlDecode(input.value)
}

function swap() {
  input.value = output.value || ''
  output.value = ''
  mode.value = mode.value === 'encode' ? 'decode' : 'encode'
  convert()
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
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="material-icons text-primary text-lg">code</span>
          <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">HTML 实体编解码</span>
        </div>
        <div class="flex gap-2">
          <button v-for="m in (['encode', 'decode'] as const)" :key="m" @click="mode = m; convert()"
            class="h-8 px-3 font-bold border-2 border-black rounded text-xs transition-all"
            :class="mode === m ? 'bg-primary text-black shadow-none translate-x-0.5 translate-y-0.5' : 'bg-bg-dark text-gray-400 shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5'">
            {{ m === 'encode' ? '编码' : '解码' }}
          </button>
        </div>
      </div>
      <textarea v-model="input" @input="convert" rows="5" :placeholder="mode === 'encode' ? '输入 HTML 文本...' : '输入 HTML 实体...'"
        class="w-full bg-bg-dark text-gray-100 border-4 border-black rounded-lg px-4 py-3 font-mono text-sm shadow-hard focus:border-primary focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] transition-all outline-none placeholder-gray-600 resize-none" />
    </div>

    <div class="flex justify-center">
      <button @click="swap"
        class="h-10 px-4 bg-bg-dark text-gray-400 font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-sm flex items-center gap-2">
        <span class="material-icons text-lg">swap_vert</span> 交换
      </button>
    </div>

    <div class="flex-1 bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="material-icons text-neon-green text-lg">output</span>
          <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">{{ mode === 'encode' ? '编码结果' : '解码结果' }}</span>
        </div>
        <button v-if="output" @click="copy(output, 'output')"
          class="flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors">
          <span class="material-icons text-sm">{{ copyField === 'output' ? 'check' : 'content_copy' }}</span>
          {{ copyField === 'output' ? '已复制' : '复制' }}
        </button>
      </div>
      <div class="font-mono text-sm text-gray-100 break-all select-all min-h-[80px] bg-bg-dark rounded-lg p-3 border-2 border-black whitespace-pre-wrap">{{ output }}</div>
    </div>
  </div>
</template>

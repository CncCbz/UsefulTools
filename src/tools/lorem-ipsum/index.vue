<script setup lang="ts">
import { ref, computed } from 'vue'

const count = ref(3)
const unit = ref<'paragraphs' | 'sentences' | 'words'>('paragraphs')
const copyField = ref('')

const words = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'perspiciatis', 'unde',
  'omnis', 'iste', 'natus', 'error', 'voluptatem', 'accusantium', 'doloremque',
  'laudantium', 'totam', 'rem', 'aperiam', 'eaque', 'ipsa', 'quae', 'ab', 'illo',
  'inventore', 'veritatis', 'quasi', 'architecto', 'beatae', 'vitae', 'dicta',
  'explicabo', 'nemo', 'ipsam', 'quia', 'voluptas', 'aspernatur', 'aut', 'odit',
  'fugit', 'consequuntur', 'magni', 'dolores', 'eos', 'ratione', 'sequi', 'nesciunt',
]

function randomWord() { return words[Math.floor(Math.random() * words.length)] }

function generateSentence(): string {
  const len = 8 + Math.floor(Math.random() * 12)
  const s = Array.from({ length: len }, () => randomWord()).join(' ')
  return s.charAt(0).toUpperCase() + s.slice(1) + '.'
}

function generateParagraph(): string {
  const len = 3 + Math.floor(Math.random() * 4)
  return Array.from({ length: len }, () => generateSentence()).join(' ')
}

const output = computed(() => {
  if (unit.value === 'words') {
    return Array.from({ length: count.value }, () => randomWord()).join(' ')
  }
  if (unit.value === 'sentences') {
    return Array.from({ length: count.value }, () => generateSentence()).join(' ')
  }
  return Array.from({ length: count.value }, () => generateParagraph()).join('\n\n')
})

const regenerateKey = ref(0)
function regenerate() { regenerateKey.value++ }

const displayText = computed(() => { regenerateKey.value; return output.value })

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
        <span class="material-icons text-primary text-lg">notes</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">Lorem Ipsum 生成器</span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex gap-2">
          <button v-for="u in (['paragraphs', 'sentences', 'words'] as const)" :key="u" @click="unit = u"
            class="h-9 px-3 font-bold border-2 border-black rounded text-xs transition-all"
            :class="unit === u ? 'bg-primary text-black shadow-none translate-x-0.5 translate-y-0.5' : 'bg-bg-dark text-gray-400 shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5'">
            {{ u === 'paragraphs' ? '段落' : u === 'sentences' ? '句子' : '单词' }}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">数量:</span>
          <input v-model.number="count" type="number" min="1" max="100"
            class="w-16 h-9 bg-bg-dark text-gray-100 border-2 border-black rounded px-2 font-mono text-sm text-center outline-none focus:border-primary" />
        </div>
        <button @click="regenerate"
          class="h-9 px-4 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs">
          重新生成
        </button>
        <button @click="copy(displayText, 'text')"
          class="h-9 px-3 bg-bg-dark text-gray-400 font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs">
          {{ copyField === 'text' ? '已复制' : '复制' }}
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-auto bg-deep-charcoal border-4 border-black rounded-xl p-5 shadow-hard">
      <div class="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap select-all">{{ displayText }}</div>
    </div>
  </div>
</template>

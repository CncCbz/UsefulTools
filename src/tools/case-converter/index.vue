<script setup lang="ts">
import { ref, computed } from 'vue'

const input = ref('')
const copyField = ref('')

function splitWords(str: string): string[] {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[-_./\\]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

const conversions = computed(() => {
  const words = splitWords(input.value)
  if (!words.length) return []
  return [
    { label: 'camelCase', value: words.map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(''), color: 'text-electric-blue' },
    { label: 'PascalCase', value: words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(''), color: 'text-vibrant-purple' },
    { label: 'snake_case', value: words.map(w => w.toLowerCase()).join('_'), color: 'text-neon-green' },
    { label: 'SCREAMING_SNAKE', value: words.map(w => w.toUpperCase()).join('_'), color: 'text-coral-red' },
    { label: 'kebab-case', value: words.map(w => w.toLowerCase()).join('-'), color: 'text-primary' },
    { label: 'UPPER CASE', value: input.value.toUpperCase(), color: 'text-hot-pink' },
    { label: 'lower case', value: input.value.toLowerCase(), color: 'text-gray-300' },
    { label: 'Title Case', value: words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '), color: 'text-electric-blue' },
    { label: 'dot.case', value: words.map(w => w.toLowerCase()).join('.'), color: 'text-vibrant-purple' },
    { label: 'path/case', value: words.map(w => w.toLowerCase()).join('/'), color: 'text-neon-green' },
  ]
})

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
        <span class="material-icons text-primary text-lg">text_fields</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">大小写转换</span>
      </div>
      <input v-model="input" placeholder="输入文本，如 hello world、helloWorld、hello_world..."
        class="w-full h-12 bg-bg-dark text-gray-100 border-4 border-black rounded-lg px-4 font-mono text-sm shadow-hard focus:border-primary focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] transition-all outline-none placeholder-gray-600" />
      <div class="flex flex-wrap gap-2 mt-3">
        <span class="text-xs text-gray-600">示例:</span>
        <button v-for="ex in ['hello world', 'helloWorld', 'my_variable_name', 'MyClassName']" :key="ex"
          @click="input = ex"
          class="px-2 py-0.5 text-xs font-mono bg-bg-dark border border-gray-700 rounded hover:border-primary hover:text-primary transition-all cursor-pointer text-gray-500">
          {{ ex }}
        </button>
      </div>
    </div>

    <div v-if="conversions.length" class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-auto min-h-0">
      <div v-for="c in conversions" :key="c.label"
        class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard cursor-pointer hover:border-primary transition-all group"
        @click="copy(c.value, c.label)">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">{{ c.label }}</span>
          <span class="material-icons text-sm opacity-0 group-hover:opacity-100 transition-opacity"
            :class="copyField === c.label ? 'text-neon-green' : 'text-gray-500'">
            {{ copyField === c.label ? 'check' : 'content_copy' }}
          </span>
        </div>
        <div class="font-mono text-sm select-all break-all" :class="c.color">{{ c.value }}</div>
      </div>
    </div>
  </div>
</template>

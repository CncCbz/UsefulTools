<script setup lang="ts">
import { ref, computed } from 'vue'

const length = ref(16)
const useLower = ref(true)
const useUpper = ref(true)
const useDigits = ref(true)
const useSymbols = ref(true)
const count = ref(5)
const passwords = ref<string[]>([])
const copyField = ref('')

const charsets = computed(() => {
  let chars = ''
  if (useLower.value) chars += 'abcdefghijklmnopqrstuvwxyz'
  if (useUpper.value) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (useDigits.value) chars += '0123456789'
  if (useSymbols.value) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'
  return chars
})

function generate() {
  const chars = charsets.value
  if (!chars) return
  const arr = new Uint32Array(length.value * count.value)
  crypto.getRandomValues(arr)
  passwords.value = Array.from({ length: count.value }, (_, i) => {
    return Array.from({ length: length.value }, (_, j) => chars[arr[i * length.value + j] % chars.length]).join('')
  })
}

function toggleOption(key: string, checked: boolean) {
  if (key === 'lower') useLower.value = checked
  else if (key === 'upper') useUpper.value = checked
  else if (key === 'digits') useDigits.value = checked
  else useSymbols.value = checked
}

const strength = computed(() => {
  const poolSize = charsets.value.length
  if (!poolSize) return { label: '无', color: 'text-gray-500', percent: 0 }
  const entropy = length.value * Math.log2(poolSize)
  if (entropy < 40) return { label: '弱', color: 'text-coral-red', percent: 25 }
  if (entropy < 60) return { label: '中等', color: 'text-primary', percent: 50 }
  if (entropy < 80) return { label: '强', color: 'text-electric-blue', percent: 75 }
  return { label: '极强', color: 'text-neon-green', percent: 100 }
})

async function copy(text: string, field: string) {
  await navigator.clipboard.writeText(text)
  copyField.value = field
  setTimeout(() => { copyField.value = '' }, 1200)
}

generate()
</script>

<template>
  <div class="flex flex-col h-full gap-5">
    <div class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-icons text-primary text-lg">lock</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">密码生成器</span>
      </div>
      <div class="flex flex-wrap items-center gap-4 mb-3">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">长度:</span>
          <input v-model.number="length" type="range" min="4" max="64" class="w-32 accent-primary" />
          <span class="font-mono text-sm text-gray-100 w-8 text-center">{{ length }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">数量:</span>
          <input v-model.number="count" type="number" min="1" max="50"
            class="w-14 h-8 bg-bg-dark text-gray-100 border-2 border-black rounded px-2 font-mono text-sm text-center outline-none focus:border-primary" />
        </div>
      </div>
      <div class="flex flex-wrap gap-3 mb-3">
        <label v-for="opt in [
          { label: '小写 a-z', key: 'lower' },
          { label: '大写 A-Z', key: 'upper' },
          { label: '数字 0-9', key: 'digits' },
          { label: '符号 !@#', key: 'symbols' },
        ]" :key="opt.key" class="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox"
            :checked="opt.key === 'lower' ? useLower : opt.key === 'upper' ? useUpper : opt.key === 'digits' ? useDigits : useSymbols"
            @change="toggleOption(opt.key, ($event.target as HTMLInputElement).checked)"
            class="accent-primary w-4 h-4" />
          <span class="text-xs text-gray-400">{{ opt.label }}</span>
        </label>
      </div>
      <!-- 强度指示 -->
      <div class="flex items-center gap-3 mb-3">
        <span class="text-xs text-gray-500">强度:</span>
        <div class="flex-1 h-2 bg-bg-dark border border-black rounded-full overflow-hidden">
          <div class="h-full transition-all duration-300 rounded-full"
            :class="strength.color.replace('text-', 'bg-')"
            :style="{ width: strength.percent + '%' }"></div>
        </div>
        <span class="text-xs font-bold" :class="strength.color">{{ strength.label }}</span>
      </div>
      <button @click="generate"
        class="h-10 px-5 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-sm">
        生成
      </button>
    </div>

    <div class="flex-1 overflow-auto bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
      <div v-for="(pw, i) in passwords" :key="i"
        class="flex items-center justify-between py-2 px-3 rounded hover:bg-white/5 cursor-pointer group"
        @click="copy(pw, String(i))">
        <span class="font-mono text-sm text-gray-100 select-all break-all">{{ pw }}</span>
        <span class="material-icons text-sm opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
          :class="copyField === String(i) ? 'text-neon-green' : 'text-gray-500'">
          {{ copyField === String(i) ? 'check' : 'content_copy' }}
        </span>
      </div>
    </div>
  </div>
</template>

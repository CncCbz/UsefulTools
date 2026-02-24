<script setup lang="ts">
import { ref, computed } from 'vue'

const input = ref('')
const inputBase = ref(10)
const copyField = ref('')
const errorMsg = ref('')

const bases = [
  { label: '二进制', base: 2, prefix: '0b', key: 'bin' },
  { label: '八进制', base: 8, prefix: '0o', key: 'oct' },
  { label: '十进制', base: 10, prefix: '', key: 'dec' },
  { label: '十六进制', base: 16, prefix: '0x', key: 'hex' },
]

const baseOptions = [
  { label: '二进制', value: 2 },
  { label: '八进制', value: 8 },
  { label: '十进制', value: 10 },
  { label: '十六进制', value: 16 },
]

function sanitize(raw: string): string {
  let s = raw.trim().toLowerCase()
  if (s.startsWith('0x')) s = s.slice(2)
  else if (s.startsWith('0b')) s = s.slice(2)
  else if (s.startsWith('0o')) s = s.slice(2)
  return s
}

const parsed = computed<bigint | null>(() => {
  const raw = input.value.trim()
  if (!raw) { errorMsg.value = ''; return null }
  try {
    const s = sanitize(raw)
    if (!s) { errorMsg.value = '输入为空'; return null }
    const val = BigInt(`${inputBase.value === 10 ? '' : '0' + { 2: 'b', 8: 'o', 16: 'x' }[inputBase.value]}${s}`)
    errorMsg.value = ''
    return val
  } catch {
    errorMsg.value = `无效的 ${inputBase.value} 进制数`
    return null
  }
})

const results = computed(() => {
  if (parsed.value === null) return []
  const v = parsed.value
  const isNeg = v < 0n
  const abs = isNeg ? -v : v
  const sign = isNeg ? '-' : ''
  return bases.map(b => ({
    ...b,
    value: sign + b.prefix + abs.toString(b.base).toUpperCase(),
    raw: sign + abs.toString(b.base).toUpperCase(),
  }))
})

// 自定义进制
const customBase = ref(3)
const customResult = computed(() => {
  if (parsed.value === null) return ''
  const v = parsed.value
  const isNeg = v < 0n
  const abs = isNeg ? -v : v
  const sign = isNeg ? '-' : ''
  return sign + toBaseString(abs, customBase.value)
})

function toBaseString(value: bigint, base: number): string {
  if (value === 0n) return '0'
  const digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const b = BigInt(base)
  let result = ''
  let v = value
  while (v > 0n) {
    result = digits[Number(v % b)] + result
    v = v / b
  }
  return result
}

function setExample(val: string, base: number) {
  input.value = val
  inputBase.value = base
}

async function copy(text: string, field: string) {
  await navigator.clipboard.writeText(text)
  copyField.value = field
  setTimeout(() => { copyField.value = '' }, 1200)
}
</script>

<template>
  <div class="flex flex-col h-full gap-5">
    <!-- 输入区 -->
    <div class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-icons text-primary text-lg">swap_horiz</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">输入</span>
      </div>
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex gap-2 shrink-0">
          <button v-for="opt in baseOptions" :key="opt.value"
            @click="inputBase = opt.value"
            class="h-10 px-3 font-bold border-2 border-black rounded text-sm transition-all"
            :class="inputBase === opt.value
              ? 'bg-primary text-black shadow-none translate-x-0.5 translate-y-0.5'
              : 'bg-bg-dark text-gray-400 shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5'">
            {{ opt.label }}
          </button>
        </div>
        <input v-model="input" :placeholder="`输入${baseOptions.find(o => o.value === inputBase)?.label}数值...`"
          class="flex-1 h-10 bg-bg-dark text-gray-100 border-4 border-black rounded-lg px-4 font-mono text-sm shadow-hard focus:border-primary focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] transition-all outline-none placeholder-gray-600" />
      </div>
      <!-- 快捷示例 -->
      <div class="flex items-center gap-2 mt-3 flex-wrap">
        <span class="text-xs text-gray-600">示例:</span>
        <button v-for="ex in [
          { val: '255', base: 10 }, { val: '11111111', base: 2 },
          { val: 'FF', base: 16 }, { val: '377', base: 8 },
        ]" :key="ex.val + ex.base" @click="setExample(ex.val, ex.base)"
          class="px-2 py-0.5 text-xs font-mono bg-bg-dark border border-gray-700 rounded hover:border-primary hover:text-primary transition-all cursor-pointer text-gray-500">
          {{ ex.val }}<sub class="text-[10px] ml-0.5">({{ ex.base }})</sub>
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg && input.trim()"
      class="px-4 py-2 bg-coral-red/20 border-2 border-coral-red rounded flex items-center gap-2 text-coral-red font-bold text-sm">
      <span class="material-icons text-lg">error_outline</span>
      {{ errorMsg }}
    </div>

    <!-- 转换结果 -->
    <div v-if="results.length" class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
      <div v-for="r in results" :key="r.key"
        class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard flex flex-col gap-2 cursor-pointer hover:border-primary transition-all group"
        @click="copy(r.raw, r.key)">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">{{ r.label }}</span>
          <span class="material-icons text-sm opacity-0 group-hover:opacity-100 transition-opacity"
            :class="copyField === r.key ? 'text-neon-green' : 'text-gray-500'">
            {{ copyField === r.key ? 'check' : 'content_copy' }}
          </span>
        </div>
        <div class="font-mono text-lg text-gray-100 break-all select-all">{{ r.value }}</div>
      </div>
    </div>

    <!-- 自定义进制 -->
    <div v-if="parsed !== null" class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
      <div class="flex items-center gap-3 mb-3">
        <span class="material-icons text-neon-green text-lg">tune</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">自定义进制</span>
        <input v-model.number="customBase" type="number" min="2" max="36"
          class="w-16 h-8 bg-bg-dark text-gray-100 border-2 border-black rounded px-2 font-mono text-sm text-center outline-none focus:border-primary" />
        <span class="text-xs text-gray-600">（2 ~ 36）</span>
      </div>
      <div class="font-mono text-sm text-gray-100 break-all bg-bg-dark rounded-lg p-3 border-2 border-black cursor-pointer hover:border-primary transition-all group"
        @click="copy(customResult, 'custom')">
        <span class="flex items-center justify-between">
          <span class="select-all">{{ customResult }}</span>
          <span class="material-icons text-sm opacity-0 group-hover:opacity-100 transition-opacity"
            :class="copyField === 'custom' ? 'text-neon-green' : 'text-gray-500'">
            {{ copyField === 'custom' ? 'check' : 'content_copy' }}
          </span>
        </span>
      </div>
    </div>
  </div>
</template>


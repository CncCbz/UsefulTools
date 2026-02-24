<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const timestampInput = ref('')
const dateInput = ref('')
const errorMsg = ref('')
const now = ref(Date.now())
const copyField = ref('')
let timer: ReturnType<typeof setInterval>

onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => clearInterval(timer))

const currentSeconds = computed(() => Math.floor(now.value / 1000))
const currentMillis = computed(() => now.value)
const currentISO = computed(() => new Date(now.value).toISOString())
const currentLocal = computed(() => formatLocal(new Date(now.value)))

function formatLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 时间戳 → 日期
const tsResult = computed(() => {
  const raw = timestampInput.value.trim()
  if (!raw) return null
  const n = Number(raw)
  if (isNaN(n)) { errorMsg.value = '无效的时间戳'; return null }
  // 自动判断秒/毫秒
  const ms = raw.length <= 10 ? n * 1000 : n
  const d = new Date(ms)
  if (isNaN(d.getTime())) { errorMsg.value = '无效的时间戳'; return null }
  errorMsg.value = ''
  return {
    local: formatLocal(d),
    iso: d.toISOString(),
    utc: d.toUTCString(),
    relative: getRelative(d),
    date: d,
  }
})

// 日期 → 时间戳
const dateResult = computed(() => {
  const raw = dateInput.value.trim()
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  return { seconds: Math.floor(d.getTime() / 1000), millis: d.getTime() }
})

function getRelative(d: Date) {
  const diff = Date.now() - d.getTime()
  const abs = Math.abs(diff)
  const suffix = diff > 0 ? '前' : '后'
  if (abs < 60000) return `${Math.floor(abs / 1000)} 秒${suffix}`
  if (abs < 3600000) return `${Math.floor(abs / 60000)} 分钟${suffix}`
  if (abs < 86400000) return `${Math.floor(abs / 3600000)} 小时${suffix}`
  return `${Math.floor(abs / 86400000)} 天${suffix}`
}

function useNow() { timestampInput.value = String(Math.floor(Date.now() / 1000)) }
function useNowDate() { dateInput.value = formatLocal(new Date()) }

async function copy(text: string, field: string) {
  await navigator.clipboard.writeText(text)
  copyField.value = field
  setTimeout(() => { copyField.value = '' }, 1200)
}
</script>

<template>
  <div class="flex flex-col h-full gap-5">
    <!-- 当前时间实时显示 -->
    <div class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-icons text-primary text-lg">schedule</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">当前时间</span>
        <span class="ml-2 w-2 h-2 rounded-full bg-neon-green animate-pulse" />
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="item in [
          { label: '秒级时间戳', value: String(currentSeconds), key: 'cs' },
          { label: '毫秒时间戳', value: String(currentMillis), key: 'cm' },
          { label: '本地时间', value: currentLocal, key: 'cl' },
          { label: 'ISO 8601', value: currentISO, key: 'ci' },
        ]" :key="item.key"
          class="bg-bg-dark border-2 border-black rounded-lg p-3 cursor-pointer hover:border-primary transition-all group"
          @click="copy(item.value, item.key)"
        >
          <div class="text-xs text-gray-500 mb-1">{{ item.label }}</div>
          <div class="font-mono text-sm text-gray-100 break-all flex items-center gap-2">
            {{ item.value }}
            <span class="material-icons text-sm opacity-0 group-hover:opacity-100 transition-opacity"
              :class="copyField === item.key ? 'text-neon-green' : 'text-gray-500'">
              {{ copyField === item.key ? 'check' : 'content_copy' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 双向转换区域 -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
      <!-- 时间戳 → 日期 -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <span class="material-icons text-primary text-lg">tag</span>
          <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">时间戳 → 日期</span>
        </div>
        <div class="flex gap-2">
          <input v-model="timestampInput" placeholder="输入秒级或毫秒级时间戳..."
            class="flex-1 h-10 bg-deep-charcoal text-gray-100 border-4 border-black rounded-lg px-4 font-mono text-sm shadow-hard focus:border-primary focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] transition-all outline-none placeholder-gray-600" />
          <button @click="useNow"
            class="h-10 px-4 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-sm whitespace-nowrap">
            现在
          </button>
        </div>
        <!-- 转换结果 -->
        <div v-if="tsResult" class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard space-y-2">
          <div v-for="row in [
            { label: '本地时间', value: tsResult.local, key: 'tl' },
            { label: 'ISO 8601', value: tsResult.iso, key: 'ti' },
            { label: 'UTC', value: tsResult.utc, key: 'tu' },
            { label: '相对时间', value: tsResult.relative, key: 'tr' },
          ]" :key="row.key"
            class="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5 cursor-pointer group"
            @click="copy(row.value, row.key)"
          >
            <span class="text-xs text-gray-500 w-20 shrink-0">{{ row.label }}</span>
            <span class="font-mono text-sm text-gray-100 flex-1 text-right">{{ row.value }}</span>
            <span class="material-icons text-sm ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
              :class="copyField === row.key ? 'text-neon-green' : 'text-gray-500'">
              {{ copyField === row.key ? 'check' : 'content_copy' }}
            </span>
          </div>
        </div>
        <div v-else-if="timestampInput.trim() && errorMsg"
          class="px-4 py-2 bg-coral-red/20 border-2 border-coral-red rounded flex items-center gap-2 text-coral-red font-bold text-sm">
          <span class="material-icons text-lg">error_outline</span>
          {{ errorMsg }}
        </div>
      </div>

      <!-- 日期 → 时间戳 -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <span class="material-icons text-neon-green text-lg">calendar_today</span>
          <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">日期 → 时间戳</span>
        </div>
        <div class="flex gap-2">
          <input v-model="dateInput" placeholder="如 2024-01-15 12:30:00 或 ISO 格式..."
            class="flex-1 h-10 bg-deep-charcoal text-gray-100 border-4 border-black rounded-lg px-4 font-mono text-sm shadow-hard focus:border-primary focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] transition-all outline-none placeholder-gray-600" />
          <button @click="useNowDate"
            class="h-10 px-4 bg-neon-green text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-sm whitespace-nowrap">
            现在
          </button>
        </div>
        <div v-if="dateResult" class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard space-y-2">
          <div v-for="row in [
            { label: '秒级时间戳', value: String(dateResult.seconds), key: 'ds' },
            { label: '毫秒时间戳', value: String(dateResult.millis), key: 'dm' },
          ]" :key="row.key"
            class="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5 cursor-pointer group"
            @click="copy(row.value, row.key)"
          >
            <span class="text-xs text-gray-500 w-20 shrink-0">{{ row.label }}</span>
            <span class="font-mono text-sm text-gray-100 flex-1 text-right">{{ row.value }}</span>
            <span class="material-icons text-sm ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
              :class="copyField === row.key ? 'text-neon-green' : 'text-gray-500'">
              {{ copyField === row.key ? 'check' : 'content_copy' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


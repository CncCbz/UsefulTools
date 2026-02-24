<script setup lang="ts">
import { ref, computed } from 'vue'

const cronInput = ref('0 */5 * * *')
const copyField = ref('')
const nextCount = ref(10)
const showHelp = ref(false)
const NAMES = ['分钟', '小时', '日', '月', '星期'] as const
const RANGES: [number, number][] = [[0,59],[0,23],[1,31],[1,12],[0,6]]
const WK = ['日','一','二','三','四','五','六']
const MO = ['','1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const presets = [
  { label: '每分钟', v: '* * * * *' }, { label: '每5分钟', v: '*/5 * * * *' },
  { label: '每小时', v: '0 * * * *' }, { label: '每天零点', v: '0 0 * * *' },
  { label: '每天8点', v: '0 8 * * *' }, { label: '每周一9点', v: '0 9 * * 1' },
  { label: '每月1号零点', v: '0 0 1 * *' }, { label: '工作日9点', v: '0 9 * * 1-5' },
  { label: '每30分钟', v: '*/30 * * * *' }, { label: '每天12和18点', v: '0 12,18 * * *' },
]
function pf(f: string, min: number, max: number): number[] | null {
  const vs = new Set<number>()
  for (const p of f.split(',')) {
    const sm = p.match(/^(.+)\/(\d+)$/); let rng: string, step = 1
    if (sm) { rng = sm[1]; step = +sm[2]; if (step <= 0) return null } else rng = p
    if (rng === '*') { for (let i = min; i <= max; i += step) vs.add(i) }
    else if (rng.includes('-')) {
      const [a, b] = rng.split('-').map(Number)
      if (isNaN(a)||isNaN(b)||a<min||b>max||a>b) return null
      for (let i = a; i <= b; i += step) vs.add(i)
    } else {
      const n = +rng; if (isNaN(n)||n<min||n>max) return null
      if (sm) { for (let i = n; i <= max; i += step) vs.add(i) } else vs.add(n)
    }
  }
  return vs.size ? [...vs].sort((a,b)=>a-b) : null
}
const parsed = computed(() => {
  const ps = cronInput.value.trim().split(/\s+/)
  if (ps.length !== 5) return { ok: false as const, error: `需要5个字段，当前${ps.length}个` }
  const r: number[][] = []
  for (let i = 0; i < 5; i++) {
    const v = pf(ps[i], RANGES[i][0], RANGES[i][1])
    if (!v) return { ok: false as const, error: `${NAMES[i]}字段 "${ps[i]}" 无效` }
    r.push(v)
  }
  return { ok: true as const, d: { mi:r[0], hr:r[1], dy:r[2], mo:r[3], wd:r[4] } }
})
const desc = computed(() => {
  if (!parsed.value.ok) return ''
  const { mi, hr, dy, mo, wd } = parsed.value.d; const p: string[] = []
  if (wd.length < 7) p.push('每周' + wd.map(w => WK[w]).join('、'))
  if (mo.length < 12) p.push(mo.map(m => MO[m]).join('、'))
  if (dy.length < 31) p.push(dy.map(d => `${d}号`).join('、'))
  if (hr.length === 24 && mi.length === 60) return '每分钟执行'
  if (hr.length === 24) p.push('每小时的第 ' + mi.join('、') + ' 分钟')
  else if (mi.length === 1 && mi[0] === 0) p.push(hr.map(h => `${h}点`).join('、') + '整')
  else p.push(hr.map(h => `${h}点`).join('、') + ' ' + mi.map(m => `${m}分`).join('、'))
  return (p.length ? p.join(' ') : '每分钟') + '执行'
})
const nextRuns = computed(() => {
  if (!parsed.value.ok) return [] as string[]
  const { mi, hr, dy, mo, wd } = parsed.value.d
  const ms=new Set(mi),hs=new Set(hr),ds=new Set(dy),mos=new Set(mo),ws=new Set(wd)
  const res: string[] = [], now = new Date(), pad = (n:number) => String(n).padStart(2,'0')
  const c = new Date(now.getFullYear(),now.getMonth(),now.getDate(),now.getHours(),now.getMinutes()+1,0,0)
  const lim = new Date(now.getTime()+366*864e5)
  while (c < lim && res.length < nextCount.value) {
    if (mos.has(c.getMonth()+1)&&ds.has(c.getDate())&&ws.has(c.getDay())&&hs.has(c.getHours())&&ms.has(c.getMinutes()))
      res.push(`${c.getFullYear()}-${pad(c.getMonth()+1)}-${pad(c.getDate())} ${pad(c.getHours())}:${pad(c.getMinutes())} 周${WK[c.getDay()]}`)
    c.setMinutes(c.getMinutes()+1)
  }
  return res
})
const fields = computed(() => {
  const ps = cronInput.value.trim().split(/\s+/)
  return NAMES.map((n, i) => ({ name: n, value: ps[i] || '-' }))
})
async function cp(text: string, f: string) {
  await navigator.clipboard.writeText(text); copyField.value = f
  setTimeout(() => { copyField.value = '' }, 1200)
}
</script>

<template>
<div class="flex flex-col h-full gap-4 overflow-y-auto pr-1">
  <!-- 输入区 -->
  <div class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
    <div class="flex items-center gap-2 mb-3">
      <span class="material-icons text-primary text-lg">timer</span>
      <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">Cron 表达式</span>
    </div>
    <div class="flex gap-2 mb-3">
      <input v-model="cronInput" spellcheck="false" placeholder="如 */5 * * * *" class="flex-1 h-12 bg-bg-dark text-gray-100 border-4 border-black rounded-lg px-4 font-mono text-lg shadow-hard focus:border-primary focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all outline-none placeholder-gray-600" />
      <button @click="cp(cronInput,'cron')" class="h-12 px-4 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-sm whitespace-nowrap">{{ copyField==='cron'?'✓ 已复制':'复制' }}</button>
    </div>
    <div class="grid grid-cols-5 gap-2 mb-3">
      <div v-for="f in fields" :key="f.name" class="text-center">
        <div class="font-mono text-base text-primary bg-bg-dark border-2 border-black rounded px-2 py-1.5">{{ f.value }}</div>
        <div class="text-xs text-gray-500 mt-1">{{ f.name }}</div>
      </div>
    </div>
    <div v-if="parsed.ok" class="flex items-center gap-2 px-3 py-2 bg-neon-green/10 border-2 border-neon-green/40 rounded-lg">
      <span class="material-icons text-neon-green text-base">check_circle</span>
      <span class="text-sm text-gray-200">{{ desc }}</span>
      <button @click="showHelp = !showHelp" class="ml-auto text-gray-500 hover:text-primary transition-colors flex items-center gap-1">
        <span class="material-icons text-sm">{{ showHelp ? 'expand_less' : 'help_outline' }}</span>
        <span class="text-xs">语法</span>
      </button>
    </div>
    <div v-else class="flex items-center gap-2 px-3 py-2 bg-coral-red/15 border-2 border-coral-red/40 rounded-lg">
      <span class="material-icons text-coral-red text-base">error_outline</span>
      <span class="text-sm text-coral-red flex-1">{{ parsed.error }}</span>
      <button @click="showHelp = !showHelp" class="text-gray-500 hover:text-primary transition-colors flex items-center gap-1">
        <span class="material-icons text-sm">{{ showHelp ? 'expand_less' : 'help_outline' }}</span>
        <span class="text-xs">语法</span>
      </button>
    </div>
    <!-- 语法参考（折叠） -->
    <div v-if="showHelp" class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-gray-400 font-mono mt-2 px-1">
      <span>*　　任意值</span><span>5　　固定值</span><span>1-5　范围</span>
      <span>*/5　每隔N</span><span>1,3,5 列表</span><span>1-5/2 范围步进</span>
    </div>
  </div>

  <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
    <!-- 常用预设 -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between h-8">
        <div class="flex items-center gap-2">
          <span class="material-icons text-electric-blue text-lg">bookmarks</span>
          <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">常用预设</span>
        </div>
      </div>
      <div class="bg-deep-charcoal border-4 border-black rounded-xl p-3 shadow-hard overflow-y-auto h-85">
        <div class="grid grid-cols-2 gap-1.5">
          <button v-for="p in presets" :key="p.v" @click="cronInput = p.v"
            class="text-left px-2.5 py-1.5 rounded-lg border-2 transition-all text-sm"
            :class="cronInput === p.v ? 'border-primary bg-primary/15 text-primary' : 'border-black bg-bg-dark text-gray-300 hover:border-gray-600'">
            <div class="font-bold">{{ p.label }}</div>
            <div class="font-mono text-xs mt-0.5 opacity-60">{{ p.v }}</div>
          </button>
        </div>
      </div>
    </div>

    <!-- 下次执行时间 -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between h-8">
        <div class="flex items-center gap-2">
          <span class="material-icons text-vibrant-purple text-lg">event_upcoming</span>
          <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">接下来 {{ nextCount }} 次执行</span>
        </div>
        <select v-model="nextCount" class="bg-bg-dark text-gray-300 border-2 border-black rounded px-2 py-1 text-xs outline-none focus:border-primary">
          <option :value="5">5次</option><option :value="10">10次</option><option :value="20">20次</option><option :value="50">50次</option>
        </select>
      </div>
      <div class="bg-deep-charcoal border-4 border-black rounded-xl p-3 shadow-hard overflow-y-auto h-85">
        <div v-if="nextRuns.length" class="space-y-0.5">
          <div v-for="(run, i) in nextRuns" :key="i"
            class="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-white/5 cursor-pointer group" @click="cp(run, 'r'+i)">
            <span class="text-xs text-gray-600 w-5 text-right shrink-0">{{ i + 1 }}</span>
            <span class="font-mono text-sm text-gray-200 flex-1">{{ run }}</span>
            <span class="material-icons text-sm opacity-0 group-hover:opacity-100 transition-opacity"
              :class="copyField==='r'+i ? 'text-neon-green' : 'text-gray-500'">{{ copyField==='r'+i ? 'check' : 'content_copy' }}</span>
          </div>
        </div>
        <div v-else class="text-gray-500 text-sm text-center py-8">请输入有效的 Cron 表达式</div>
      </div>
    </div>
  </div>


</div>
</template>

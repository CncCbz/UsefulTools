<script setup lang="ts">
import { ref, computed } from 'vue'

const ipInput = ref('192.168.1.100')
const cidr = ref(24)
const copyField = ref('')

function ipToNum(ip: string): number {
  const parts = ip.split('.').map(Number)
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function numToIp(num: number): string {
  return [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff].join('.')
}

function isValidIp(ip: string): boolean {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  return parts.every(p => { const n = Number(p); return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p })
}

const result = computed(() => {
  if (!isValidIp(ipInput.value) || cidr.value < 0 || cidr.value > 32) return null
  const ip = ipToNum(ipInput.value)
  const mask = cidr.value === 0 ? 0 : (~0 << (32 - cidr.value)) >>> 0
  const network = (ip & mask) >>> 0
  const broadcast = (network | ~mask) >>> 0
  const firstHost = cidr.value >= 31 ? network : (network + 1) >>> 0
  const lastHost = cidr.value >= 31 ? broadcast : (broadcast - 1) >>> 0
  const totalHosts = cidr.value >= 31 ? (cidr.value === 32 ? 1 : 2) : Math.pow(2, 32 - cidr.value) - 2

  const ipClass = (() => {
    const first = (ip >>> 24) & 0xff
    if (first < 128) return 'A'
    if (first < 192) return 'B'
    if (first < 224) return 'C'
    if (first < 240) return 'D (组播)'
    return 'E (保留)'
  })()

  const isPrivate = (() => {
    const n = ip
    return (n >= ipToNum('10.0.0.0') && n <= ipToNum('10.255.255.255')) ||
      (n >= ipToNum('172.16.0.0') && n <= ipToNum('172.31.255.255')) ||
      (n >= ipToNum('192.168.0.0') && n <= ipToNum('192.168.255.255'))
  })()

  return [
    { label: 'IP 地址', value: ipInput.value, color: 'text-primary' },
    { label: '子网掩码', value: numToIp(mask), color: 'text-electric-blue' },
    { label: 'CIDR', value: `/${cidr.value}`, color: 'text-electric-blue' },
    { label: '网络地址', value: numToIp(network), color: 'text-vibrant-purple' },
    { label: '广播地址', value: numToIp(broadcast), color: 'text-vibrant-purple' },
    { label: '第一个主机', value: numToIp(firstHost), color: 'text-neon-green' },
    { label: '最后一个主机', value: numToIp(lastHost), color: 'text-neon-green' },
    { label: '可用主机数', value: totalHosts.toLocaleString(), color: 'text-primary' },
    { label: 'IP 类别', value: ipClass, color: 'text-hot-pink' },
    { label: '地址类型', value: isPrivate ? '私有地址' : '公有地址', color: isPrivate ? 'text-neon-green' : 'text-coral-red' },
    { label: '二进制', value: ip.toString(2).padStart(32, '0').replace(/(.{8})/g, '$1.').slice(0, -1), color: 'text-gray-400' },
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
        <span class="material-icons text-primary text-lg">lan</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">IP / 子网计算器</span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <input v-model="ipInput" placeholder="192.168.1.100"
          class="flex-1 h-12 bg-bg-dark text-gray-100 border-4 border-black rounded-lg px-4 font-mono text-lg shadow-hard focus:border-primary focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] transition-all outline-none placeholder-gray-600 min-w-[200px]" />
        <span class="text-2xl text-gray-500 font-bold">/</span>
        <input v-model.number="cidr" type="number" min="0" max="32"
          class="w-20 h-12 bg-bg-dark text-gray-100 border-4 border-black rounded-lg px-3 font-mono text-lg text-center shadow-hard focus:border-primary focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] transition-all outline-none" />
      </div>
      <div class="flex flex-wrap gap-2 mt-3">
        <span class="text-xs text-gray-600">常用:</span>
        <button v-for="c in [8, 16, 24, 25, 26, 27, 28, 30, 32]" :key="c"
          @click="cidr = c"
          class="px-2 py-0.5 text-xs font-mono bg-bg-dark border border-gray-700 rounded hover:border-primary hover:text-primary transition-all cursor-pointer text-gray-500">
          /{{ c }}
        </button>
      </div>
    </div>

    <div v-if="!isValidIp(ipInput)" class="px-4 py-2 bg-coral-red/20 border-2 border-coral-red rounded flex items-center gap-2 text-coral-red font-bold text-sm">
      <span class="material-icons text-lg">error_outline</span>
      无效的 IP 地址
    </div>

    <div v-if="result" class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-auto min-h-0">
      <div v-for="r in result" :key="r.label"
        class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard cursor-pointer hover:border-primary transition-all group"
        @click="copy(r.value, r.label)">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">{{ r.label }}</span>
          <span class="material-icons text-sm opacity-0 group-hover:opacity-100 transition-opacity"
            :class="copyField === r.label ? 'text-neon-green' : 'text-gray-500'">
            {{ copyField === r.label ? 'check' : 'content_copy' }}
          </span>
        </div>
        <div class="font-mono text-sm select-all break-all" :class="r.color">{{ r.value }}</div>
      </div>
    </div>
  </div>
</template>



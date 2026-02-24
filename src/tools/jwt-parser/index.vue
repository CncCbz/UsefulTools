<script setup lang="ts">
import { ref, computed } from 'vue'

const jwtInput = ref('')
const copyField = ref('')

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  return decodeURIComponent(
    atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  )
}

const parsed = computed(() => {
  const raw = jwtInput.value.trim()
  if (!raw) return null
  const parts = raw.split('.')
  if (parts.length !== 3) return { error: 'JWT 格式无效，应包含 3 个部分（header.payload.signature）' }
  try {
    const header = JSON.parse(base64UrlDecode(parts[0]))
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    return { header, payload, signature: parts[2], error: '' }
  } catch {
    return { error: '解码失败，请检查 JWT 是否完整' }
  }
})

const claims = computed(() => {
  if (!parsed.value || parsed.value.error || !parsed.value.payload) return []
  const p = parsed.value.payload
  const items: { label: string; key: string; value: string; color: string }[] = []
  if (p.iss != null) items.push({ label: '签发者 (iss)', key: 'iss', value: String(p.iss), color: 'text-electric-blue' })
  if (p.sub != null) items.push({ label: '主题 (sub)', key: 'sub', value: String(p.sub), color: 'text-vibrant-purple' })
  if (p.aud != null) items.push({ label: '受众 (aud)', key: 'aud', value: String(p.aud), color: 'text-neon-green' })
  if (p.iat != null) items.push({ label: '签发时间 (iat)', key: 'iat', value: formatTs(p.iat), color: 'text-gray-300' })
  if (p.nbf != null) items.push({ label: '生效时间 (nbf)', key: 'nbf', value: formatTs(p.nbf), color: 'text-gray-300' })
  if (p.exp != null) items.push({ label: '过期时间 (exp)', key: 'exp', value: formatTs(p.exp), color: isExpired.value ? 'text-coral-red' : 'text-neon-green' })
  if (p.jti != null) items.push({ label: 'JWT ID (jti)', key: 'jti', value: String(p.jti), color: 'text-gray-300' })
  return items
})

const isExpired = computed(() => {
  if (!parsed.value || parsed.value.error || !parsed.value.payload?.exp) return false
  return parsed.value.payload.exp * 1000 < Date.now()
})

const expiresIn = computed(() => {
  if (!parsed.value || parsed.value.error || !parsed.value.payload?.exp) return ''
  const diff = parsed.value.payload.exp * 1000 - Date.now()
  const abs = Math.abs(diff)
  const suffix = diff > 0 ? '后过期' : '前已过期'
  if (abs < 60000) return `${Math.floor(abs / 1000)} 秒${suffix}`
  if (abs < 3600000) return `${Math.floor(abs / 60000)} 分钟${suffix}`
  if (abs < 86400000) return `${Math.floor(abs / 3600000)} 小时${suffix}`
  return `${Math.floor(abs / 86400000)} 天${suffix}`
})

function formatTs(ts: number) {
  const d = new Date(ts * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatJson(obj: any) { return JSON.stringify(obj, null, 2) }

async function copy(text: string, field: string) {
  await navigator.clipboard.writeText(text)
  copyField.value = field
  setTimeout(() => { copyField.value = '' }, 1200)
}

function loadSample() {
  // 一个不含敏感信息的示例 JWT（HS256, payload 含常见 claims）
  const h = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '')
  const p = btoa(JSON.stringify({ sub: '1234567890', name: 'John Doe', iat: 1516239022, exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=/g, '')
  jwtInput.value = `${h}.${p}.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`
}
</script>

<template>
  <div class="flex flex-col h-full gap-5">
    <!-- 输入区 -->
    <div class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="material-icons text-primary text-lg">vpn_key</span>
          <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">JWT Token</span>
        </div>
        <button @click="loadSample"
          class="h-8 px-3 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs">
          加载示例
        </button>
      </div>
      <textarea v-model="jwtInput" rows="4" placeholder="粘贴 JWT Token（eyJhbGciOi...）"
        class="w-full bg-bg-dark text-gray-100 border-4 border-black rounded-lg px-4 py-3 font-mono text-sm shadow-hard focus:border-primary focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] transition-all outline-none placeholder-gray-600 resize-none" />
    </div>

    <!-- 错误提示 -->
    <div v-if="parsed?.error"
      class="px-4 py-2 bg-coral-red/20 border-2 border-coral-red rounded flex items-center gap-2 text-coral-red font-bold text-sm">
      <span class="material-icons text-lg">error_outline</span>
      {{ parsed.error }}
    </div>

    <!-- 解析结果 -->
    <div v-if="parsed && !parsed.error" class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-auto">
      <!-- 左列：Header + Signature -->
      <div class="flex flex-col gap-4">
        <!-- Header -->
        <div class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="material-icons text-electric-blue text-lg">code</span>
              <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">Header</span>
              <span v-if="parsed.header?.alg"
                class="ml-2 px-2 py-0.5 bg-electric-blue/20 text-electric-blue text-xs font-bold rounded border border-electric-blue/40">
                {{ parsed.header.alg }}
              </span>
            </div>
            <button @click="copy(formatJson(parsed.header), 'header')"
              class="flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors">
              <span class="material-icons text-sm">{{ copyField === 'header' ? 'check' : 'content_copy' }}</span>
              {{ copyField === 'header' ? '已复制' : '复制' }}
            </button>
          </div>
          <pre class="font-mono text-sm text-gray-100 bg-bg-dark rounded-lg p-3 border-2 border-black overflow-auto max-h-40">{{ formatJson(parsed.header) }}</pre>
        </div>

        <!-- Signature -->
        <div class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="material-icons text-hot-pink text-lg">fingerprint</span>
              <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">Signature</span>
            </div>
            <button @click="copy(parsed.signature ?? '', 'sig')"
              class="flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors">
              <span class="material-icons text-sm">{{ copyField === 'sig' ? 'check' : 'content_copy' }}</span>
              {{ copyField === 'sig' ? '已复制' : '复制' }}
            </button>
          </div>
          <div class="font-mono text-sm text-gray-400 bg-bg-dark rounded-lg p-3 border-2 border-black break-all">
            {{ parsed.signature }}
          </div>
        </div>

        <!-- 过期状态 -->
        <div v-if="parsed.payload?.exp"
          class="border-4 border-black rounded-xl p-4 shadow-hard"
          :class="isExpired ? 'bg-coral-red/10 border-coral-red' : 'bg-neon-green/10 border-neon-green'">
          <div class="flex items-center gap-3">
            <span class="material-icons text-2xl" :class="isExpired ? 'text-coral-red' : 'text-neon-green'">
              {{ isExpired ? 'timer_off' : 'verified' }}
            </span>
            <div>
              <div class="font-bold text-sm" :class="isExpired ? 'text-coral-red' : 'text-neon-green'">
                {{ isExpired ? '已过期' : '有效' }}
              </div>
              <div class="text-xs text-gray-400">{{ expiresIn }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右列：Payload + Claims -->
      <div class="flex flex-col gap-4">
        <!-- 标准 Claims -->
        <div v-if="claims.length" class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
          <div class="flex items-center gap-2 mb-3">
            <span class="material-icons text-primary text-lg">badge</span>
            <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">标准声明</span>
          </div>
          <div class="space-y-1">
            <div v-for="c in claims" :key="c.key"
              class="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5 cursor-pointer group"
              @click="copy(c.value, c.key)">
              <span class="text-xs text-gray-500 shrink-0 w-32">{{ c.label }}</span>
              <span class="font-mono text-sm flex-1 text-right" :class="c.color">{{ c.value }}</span>
              <span class="material-icons text-sm ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                :class="copyField === c.key ? 'text-neon-green' : 'text-gray-500'">
                {{ copyField === c.key ? 'check' : 'content_copy' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 完整 Payload -->
        <div class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="material-icons text-vibrant-purple text-lg">description</span>
              <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">Payload</span>
            </div>
            <button @click="copy(formatJson(parsed.payload), 'payload')"
              class="flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors">
              <span class="material-icons text-sm">{{ copyField === 'payload' ? 'check' : 'content_copy' }}</span>
              {{ copyField === 'payload' ? '已复制' : '复制' }}
            </button>
          </div>
          <pre class="font-mono text-sm text-gray-100 bg-bg-dark rounded-lg p-3 border-2 border-black overflow-auto max-h-60">{{ formatJson(parsed.payload) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>


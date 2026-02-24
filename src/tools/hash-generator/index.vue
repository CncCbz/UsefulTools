<script setup lang="ts">
import { ref, watch } from 'vue'

const input = ref('')
const copyField = ref('')

const algorithms = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'] as const
const results = ref<Record<string, string>>({})

// 简易 MD5 实现（纯前端）
function md5(str: string): string {
  function safeAdd(x: number, y: number) { const lsw = (x & 0xffff) + (y & 0xffff); return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xffff) }
  function bitRotateLeft(num: number, cnt: number) { return (num << cnt) | (num >>> (32 - cnt)) }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b) }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn((b & c) | (~b & d), a, b, x, s, t) }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t) }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn(b ^ c ^ d, a, b, x, s, t) }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn(c ^ (b | ~d), a, b, x, s, t) }

  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) bytes.push(code)
    else if (code < 0x800) { bytes.push(0xc0 | (code >> 6)); bytes.push(0x80 | (code & 0x3f)) }
    else { bytes.push(0xe0 | (code >> 12)); bytes.push(0x80 | ((code >> 6) & 0x3f)); bytes.push(0x80 | (code & 0x3f)) }
  }
  const bitLen = bytes.length * 8
  bytes.push(0x80)
  while (bytes.length % 64 !== 56) bytes.push(0)
  bytes.push(bitLen & 0xff, (bitLen >> 8) & 0xff, (bitLen >> 16) & 0xff, (bitLen >> 24) & 0xff, 0, 0, 0, 0)

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878
  for (let i = 0; i < bytes.length; i += 64) {
    const m: number[] = []
    for (let j = 0; j < 16; j++) m[j] = bytes[i + j * 4] | (bytes[i + j * 4 + 1] << 8) | (bytes[i + j * 4 + 2] << 16) | (bytes[i + j * 4 + 3] << 24)
    let aa = a, bb = b, cc = c, dd = d
    a = md5ff(a, b, c, d, m[0], 7, -680876936); d = md5ff(d, a, b, c, m[1], 12, -389564586); c = md5ff(c, d, a, b, m[2], 17, 606105819); b = md5ff(b, c, d, a, m[3], 22, -1044525330)
    a = md5ff(a, b, c, d, m[4], 7, -176418897); d = md5ff(d, a, b, c, m[5], 12, 1200080426); c = md5ff(c, d, a, b, m[6], 17, -1473231341); b = md5ff(b, c, d, a, m[7], 22, -45705983)
    a = md5ff(a, b, c, d, m[8], 7, 1770035416); d = md5ff(d, a, b, c, m[9], 12, -1958414417); c = md5ff(c, d, a, b, m[10], 17, -42063); b = md5ff(b, c, d, a, m[11], 22, -1990404162)
    a = md5ff(a, b, c, d, m[12], 7, 1804603682); d = md5ff(d, a, b, c, m[13], 12, -40341101); c = md5ff(c, d, a, b, m[14], 17, -1502002290); b = md5ff(b, c, d, a, m[15], 22, 1236535329)
    a = md5gg(a, b, c, d, m[1], 5, -165796510); d = md5gg(d, a, b, c, m[6], 9, -1069501632); c = md5gg(c, d, a, b, m[11], 14, 643717713); b = md5gg(b, c, d, a, m[0], 20, -373897302)
    a = md5gg(a, b, c, d, m[5], 5, -701558691); d = md5gg(d, a, b, c, m[10], 9, 38016083); c = md5gg(c, d, a, b, m[15], 14, -660478335); b = md5gg(b, c, d, a, m[4], 20, -405537848)
    a = md5gg(a, b, c, d, m[9], 5, 568446438); d = md5gg(d, a, b, c, m[14], 9, -1019803690); c = md5gg(c, d, a, b, m[3], 14, -187363961); b = md5gg(b, c, d, a, m[8], 20, 1163531501)
    a = md5gg(a, b, c, d, m[13], 5, -1444681467); d = md5gg(d, a, b, c, m[2], 9, -51403784); c = md5gg(c, d, a, b, m[7], 14, 1735328473); b = md5gg(b, c, d, a, m[12], 20, -1926607734)
    a = md5hh(a, b, c, d, m[5], 4, -378558); d = md5hh(d, a, b, c, m[8], 11, -2022574463); c = md5hh(c, d, a, b, m[11], 16, 1839030562); b = md5hh(b, c, d, a, m[14], 23, -35309556)
    a = md5hh(a, b, c, d, m[1], 4, -1530992060); d = md5hh(d, a, b, c, m[4], 11, 1272893353); c = md5hh(c, d, a, b, m[7], 16, -155497632); b = md5hh(b, c, d, a, m[10], 23, -1094730640)
    a = md5hh(a, b, c, d, m[13], 4, 681279174); d = md5hh(d, a, b, c, m[0], 11, -358537222); c = md5hh(c, d, a, b, m[3], 16, -722521979); b = md5hh(b, c, d, a, m[6], 23, 76029189)
    a = md5hh(a, b, c, d, m[9], 4, -640364487); d = md5hh(d, a, b, c, m[12], 11, -421815835); c = md5hh(c, d, a, b, m[15], 16, 530742520); b = md5hh(b, c, d, a, m[2], 23, -995338651)
    a = md5ii(a, b, c, d, m[0], 6, -198630844); d = md5ii(d, a, b, c, m[7], 10, 1126891415); c = md5ii(c, d, a, b, m[14], 15, -1416354905); b = md5ii(b, c, d, a, m[5], 21, -57434055)
    a = md5ii(a, b, c, d, m[12], 6, 1700485571); d = md5ii(d, a, b, c, m[3], 10, -1894986606); c = md5ii(c, d, a, b, m[10], 15, -1051523); b = md5ii(b, c, d, a, m[1], 21, -2054922799)
    a = md5ii(a, b, c, d, m[8], 6, 1873313359); d = md5ii(d, a, b, c, m[15], 10, -30611744); c = md5ii(c, d, a, b, m[6], 15, -1560198380); b = md5ii(b, c, d, a, m[13], 21, 1309151649)
    a = md5ii(a, b, c, d, m[4], 6, -145523070); d = md5ii(d, a, b, c, m[11], 10, -1120210379); c = md5ii(c, d, a, b, m[2], 15, 718787259); b = md5ii(b, c, d, a, m[9], 21, -343485551)
    a = safeAdd(a, aa); b = safeAdd(b, bb); c = safeAdd(c, cc); d = safeAdd(d, dd)
  }
  return [a, b, c, d].map(v => {
    let s = ''
    for (let i = 0; i < 4; i++) s += ((v >> (i * 8)) & 0xff).toString(16).padStart(2, '0')
    return s
  }).join('')
}

async function computeHash(algo: string, text: string): Promise<string> {
  if (algo === 'MD5') return md5(text)
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest(algo, data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

watch(input, async (val) => {
  if (!val) { results.value = {}; return }
  const r: Record<string, string> = {}
  for (const algo of algorithms) {
    r[algo] = await computeHash(algo, val)
  }
  results.value = r
}, { immediate: true })

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
        <span class="material-icons text-primary text-lg">tag</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">输入文本</span>
      </div>
      <textarea v-model="input" rows="4" placeholder="输入要计算哈希的文本..."
        class="w-full bg-bg-dark text-gray-100 border-4 border-black rounded-lg px-4 py-3 font-mono text-sm shadow-hard focus:border-primary focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] transition-all outline-none placeholder-gray-600 resize-none" />
    </div>

    <div v-if="Object.keys(results).length" class="flex-1 flex flex-col gap-4 overflow-auto">
      <div v-for="algo in algorithms" :key="algo"
        class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard cursor-pointer hover:border-primary transition-all group"
        @click="copy(results[algo], algo)">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">{{ algo }}</span>
          <span class="material-icons text-sm opacity-0 group-hover:opacity-100 transition-opacity"
            :class="copyField === algo ? 'text-neon-green' : 'text-gray-500'">
            {{ copyField === algo ? 'check' : 'content_copy' }}
          </span>
        </div>
        <div class="font-mono text-sm text-gray-100 break-all select-all">{{ results[algo] }}</div>
      </div>
    </div>
  </div>
</template>

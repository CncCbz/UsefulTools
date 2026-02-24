<script setup lang="ts">
import { ref } from 'vue'

const input = ref('')
const output = ref('')
const mode = ref<'json2yaml' | 'yaml2json'>('json2yaml')
const errorMsg = ref('')
const copyField = ref('')

// 简易 JSON → YAML 转换
function jsonToYaml(obj: any, indent = 0): string {
  const pad = '  '.repeat(indent)
  if (obj === null) return 'null'
  if (typeof obj === 'boolean') return String(obj)
  if (typeof obj === 'number') return String(obj)
  if (typeof obj === 'string') {
    if (obj.includes('\n') || obj.includes(':') || obj.includes('#') || obj.includes('"') || obj.includes("'") || obj.trim() !== obj)
      return `"${obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
    return obj
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'
    return obj.map(item => {
      const val = jsonToYaml(item, indent + 1)
      if (typeof item === 'object' && item !== null) {
        const lines = val.split('\n')
        return `${pad}- ${lines[0]}\n${lines.slice(1).map(l => `${pad}  ${l}`).join('\n')}`.trimEnd()
      }
      return `${pad}- ${val}`
    }).join('\n')
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj)
    if (entries.length === 0) return '{}'
    return entries.map(([key, val]) => {
      const yamlVal = jsonToYaml(val, indent + 1)
      if (typeof val === 'object' && val !== null && !Array.isArray(val) && Object.keys(val as object).length > 0) {
        return `${pad}${key}:\n${yamlVal}`
      }
      if (Array.isArray(val) && val.length > 0) {
        return `${pad}${key}:\n${yamlVal}`
      }
      return `${pad}${key}: ${yamlVal}`
    }).join('\n')
  }
  return String(obj)
}

// 简易 YAML → JSON 解析
function yamlToJson(yaml: string): any {
  const lines = yaml.split('\n')
  return parseYamlLines(lines, 0).value
}

function parseYamlLines(lines: string[], startIndent: number): { value: any; consumed: number } {
  const result: Record<string, any> = {}
  let isArray = false
  const arr: any[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '' || line.trim().startsWith('#')) { i++; continue }
    const indent = line.search(/\S/)
    if (indent < startIndent) break

    const trimmed = line.trim()
    if (trimmed.startsWith('- ')) {
      isArray = true
      const val = trimmed.slice(2).trim()
      if (val.includes(':') && !val.startsWith('"') && !val.startsWith("'")) {
        // 对象数组项
        const subLines = [val, ...lines.slice(i + 1)]
        const sub = parseYamlLines(subLines, indent + 2)
        arr.push(sub.value)
        i += sub.consumed
      } else {
        arr.push(parseYamlValue(val))
        i++
      }
    } else if (trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':')
      const key = trimmed.slice(0, colonIdx).trim()
      const val = trimmed.slice(colonIdx + 1).trim()
      if (val === '' || val === '|' || val === '>') {
        const sub = parseYamlLines(lines.slice(i + 1), indent + 2)
        result[key] = sub.value
        i += 1 + sub.consumed
      } else {
        result[key] = parseYamlValue(val)
        i++
      }
    } else {
      i++
    }
  }
  return { value: isArray ? arr : result, consumed: i }
}

function parseYamlValue(val: string): any {
  if (val === 'null' || val === '~') return null
  if (val === 'true') return true
  if (val === 'false') return false
  if (/^-?\d+$/.test(val)) return parseInt(val)
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val)
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
    return val.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"')
  if (val === '[]') return []
  if (val === '{}') return {}
  return val
}

function convert() {
  errorMsg.value = ''
  if (!input.value.trim()) { output.value = ''; return }
  try {
    if (mode.value === 'json2yaml') {
      const obj = JSON.parse(input.value)
      output.value = jsonToYaml(obj)
    } else {
      const obj = yamlToJson(input.value)
      output.value = JSON.stringify(obj, null, 2)
    }
  } catch (e: any) {
    errorMsg.value = `转换失败: ${e.message || '格式无效'}`
    output.value = ''
  }
}

async function copy(text: string, field: string) {
  await navigator.clipboard.writeText(text)
  copyField.value = field
  setTimeout(() => { copyField.value = '' }, 1200)
}
</script>

<template>
  <div class="flex flex-col h-full gap-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="material-icons text-primary text-lg">sync_alt</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">JSON ↔ YAML</span>
      </div>
      <div class="flex gap-2">
        <button v-for="m in (['json2yaml', 'yaml2json'] as const)" :key="m" @click="mode = m"
          class="h-8 px-3 font-bold border-2 border-black rounded text-xs transition-all"
          :class="mode === m ? 'bg-primary text-black shadow-none translate-x-0.5 translate-y-0.5' : 'bg-bg-dark text-gray-400 shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5'">
          {{ m === 'json2yaml' ? 'JSON → YAML' : 'YAML → JSON' }}
        </button>
        <button @click="convert"
          class="h-8 px-4 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs">
          转换
        </button>
      </div>
    </div>

    <div v-if="errorMsg" class="px-4 py-2 bg-coral-red/20 border-2 border-coral-red rounded flex items-center gap-2 text-coral-red font-bold text-sm">
      <span class="material-icons text-lg">error_outline</span>
      {{ errorMsg }}
    </div>

    <div class="flex-1 grid grid-cols-2 gap-4 min-h-0">
      <div class="bg-deep-charcoal border-4 border-black rounded-xl shadow-hard overflow-hidden flex flex-col">
        <div class="px-3 py-2 border-b-2 border-black text-xs font-bold text-gray-500 uppercase">
          {{ mode === 'json2yaml' ? 'JSON' : 'YAML' }}
        </div>
        <textarea v-model="input" @input="convert"
          class="flex-1 w-full bg-transparent text-gray-100 px-4 py-3 font-mono text-sm outline-none resize-none placeholder-gray-600"
          :placeholder="mode === 'json2yaml' ? '输入 JSON...' : '输入 YAML...'" />
      </div>
      <div class="bg-deep-charcoal border-4 border-black rounded-xl shadow-hard overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-3 py-2 border-b-2 border-black">
          <span class="text-xs font-bold text-gray-500 uppercase">{{ mode === 'json2yaml' ? 'YAML' : 'JSON' }}</span>
          <button v-if="output" @click="copy(output, 'output')"
            class="flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors">
            <span class="material-icons text-sm">{{ copyField === 'output' ? 'check' : 'content_copy' }}</span>
          </button>
        </div>
        <pre class="flex-1 overflow-auto px-4 py-3 font-mono text-sm text-gray-100 whitespace-pre-wrap">{{ output }}</pre>
      </div>
    </div>
  </div>
</template>

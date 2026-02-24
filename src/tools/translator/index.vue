<script setup lang="ts">
import { ref, watch } from 'vue'
import { fetch } from '@tauri-apps/plugin-http'

const GOOGLE_KEY = 'translator-google-api-key'
const AI_KEY = 'translator-ai-api-key'
const AI_MODEL_KEY = 'translator-ai-model'
const ENGINE_KEY = 'translator-engine'
const DEFAULT_MODEL = 'Qwen/Qwen2.5-72B-Instruct'

type Engine = 'google' | 'ai'
const engine = ref<Engine>((localStorage.getItem(ENGINE_KEY) as Engine) || 'google')

watch(engine, (v) => localStorage.setItem(ENGINE_KEY, v))

const googleApiKey = ref(localStorage.getItem(GOOGLE_KEY) || '')
const aiApiKey = ref(localStorage.getItem(AI_KEY) || '')
const showSettings = ref(false)
const googleKeyInput = ref('')
const aiKeyInput = ref('')

// 模型选择相关
const aiModel = ref(localStorage.getItem(AI_MODEL_KEY) || DEFAULT_MODEL)
const aiModels = ref<string[]>([])
const modelsLoading = ref(false)
const modelsError = ref('')

watch(aiModel, (v) => {
  v ? localStorage.setItem(AI_MODEL_KEY, v) : localStorage.removeItem(AI_MODEL_KEY)
})

// 页面加载时，如果已有 AI Key 则自动拉取模型列表
if (aiApiKey.value) fetchModels()

async function fetchModels() {
  if (!aiApiKey.value) return
  modelsLoading.value = true
  modelsError.value = ''
  try {
    const res = await fetch('https://api.siliconflow.cn/v1/models?sub_type=chat', {
      headers: { 'Authorization': `Bearer ${aiApiKey.value}` },
    })
    if (!res.ok) throw new Error(`获取模型列表失败 (${res.status})`)
    const json = await res.json()
    const ids: string[] = (json?.data || []).map((m: any) => m.id).sort()
    aiModels.value = ids
    // 如果当前选中的模型不在列表中，回退到默认或第一个
    if (ids.length && !ids.includes(aiModel.value)) {
      aiModel.value = ids.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : ids[0]
    }
  } catch (e: any) {
    modelsError.value = e.message || '获取模型列表失败'
  } finally {
    modelsLoading.value = false
  }
}

const sourceText = ref('')
const translatedText = ref('')
const sourceLang = ref('auto')
const targetLang = ref('zh-CN')
const loading = ref(false)
const errorMsg = ref('')
const copySuccess = ref(false)

const languages = [
  { code: 'auto', name: '自动检测' },
  { code: 'zh-CN', name: '中文（简体）' },
  { code: 'zh-TW', name: '中文（繁体）' },
  { code: 'en', name: '英语' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
  { code: 'fr', name: '法语' },
  { code: 'de', name: '德语' },
  { code: 'es', name: '西班牙语' },
  { code: 'pt', name: '葡萄牙语' },
  { code: 'ru', name: '俄语' },
  { code: 'ar', name: '阿拉伯语' },
  { code: 'hi', name: '印地语' },
  { code: 'th', name: '泰语' },
  { code: 'vi', name: '越南语' },
  { code: 'it', name: '意大利语' },
  { code: 'nl', name: '荷兰语' },
  { code: 'pl', name: '波兰语' },
  { code: 'tr', name: '土耳其语' },
  { code: 'id', name: '印尼语' },
]

const targetLanguages = languages.filter(l => l.code !== 'auto')

function getLangName(code: string) {
  return languages.find(l => l.code === code)?.name || code
}

function openSettings() {
  googleKeyInput.value = googleApiKey.value
  aiKeyInput.value = aiApiKey.value
  showSettings.value = true
}

function saveKeys() {
  googleApiKey.value = googleKeyInput.value.trim()
  const oldAiKey = aiApiKey.value
  aiApiKey.value = aiKeyInput.value.trim()
  googleApiKey.value ? localStorage.setItem(GOOGLE_KEY, googleApiKey.value) : localStorage.removeItem(GOOGLE_KEY)
  aiApiKey.value ? localStorage.setItem(AI_KEY, aiApiKey.value) : localStorage.removeItem(AI_KEY)
  showSettings.value = false
  // AI Key 变更后自动刷新模型列表
  if (aiApiKey.value && aiApiKey.value !== oldAiKey) fetchModels()
}

function swapLangs() {
  if (sourceLang.value === 'auto') {
    sourceLang.value = targetLang.value
    targetLang.value = sourceLang.value === 'en' ? 'zh-CN' : 'en'
  } else {
    const tmp = sourceLang.value
    sourceLang.value = targetLang.value
    targetLang.value = tmp
  }
  const tmpText = sourceText.value
  sourceText.value = translatedText.value
  translatedText.value = tmpText
}

async function translateGoogle() {
  if (!googleApiKey.value) {
    errorMsg.value = '请先配置 Google Translation API Key'
    showSettings.value = true
    return
  }
  const body: Record<string, string> = {
    q: sourceText.value,
    target: targetLang.value,
    format: 'text',
  }
  if (sourceLang.value !== 'auto') body.source = sourceLang.value

  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(googleApiKey.value)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `请求失败 (${res.status})`)
  const translations = data?.data?.translations
  if (translations?.length) translatedText.value = translations[0].translatedText
}

async function translateAI() {
  if (!aiApiKey.value) {
    errorMsg.value = '请先配置 SiliconFlow API Key'
    showSettings.value = true
    return
  }
  const targetName = getLangName(targetLang.value)
  const sourceName = sourceLang.value === 'auto' ? '' : `源语言是${getLangName(sourceLang.value)}，`
  const prompt = `你是一个专业翻译。${sourceName}请将以下文本翻译为${targetName}。只输出翻译结果，不要解释。\n\n${sourceText.value}`

  const res = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aiApiKey.value}`,
    },
    body: JSON.stringify({
      model: aiModel.value || DEFAULT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data?.error?.message || data?.message || `请求失败 (${res.status})`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const payload = trimmed.slice(6)
      if (payload === '[DONE]') return

      try {
        const chunk = JSON.parse(payload)
        const delta = chunk?.choices?.[0]?.delta?.content
        if (delta) translatedText.value += delta
      } catch {}
    }
  }
}

async function translate() {
  if (!sourceText.value.trim()) return
  loading.value = true
  errorMsg.value = ''
  translatedText.value = ''
  try {
    if (engine.value === 'google') await translateGoogle()
    else await translateAI()
  } catch (e: any) {
    errorMsg.value = e.message || '翻译失败'
  } finally {
    loading.value = false
  }
}

async function copyResult() {
  if (!translatedText.value) return
  await navigator.clipboard.writeText(translatedText.value)
  copySuccess.value = true
  setTimeout(() => { copySuccess.value = false }, 1500)
}
</script>

<template>
  <div class="flex flex-col h-full gap-4">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- 引擎切换 -->
      <div class="flex items-center h-9 bg-deep-charcoal border-2 border-black rounded overflow-hidden">
        <button
          class="h-full px-3 text-sm font-bold transition-all"
          :class="engine === 'google' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'"
          @click="engine = 'google'"
        >Google</button>
        <button
          class="h-full px-3 text-sm font-bold transition-all"
          :class="engine === 'ai' ? 'bg-vibrant-purple text-white' : 'text-gray-400 hover:text-white'"
          @click="engine = 'ai'"
        >AI 翻译</button>
      </div>
      <button
        class="h-9 px-4 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 text-sm"
        :class="{ 'opacity-60 pointer-events-none': loading }"
        @click="translate"
      >
        <span class="material-icons text-lg">{{ loading ? 'hourglass_top' : 'translate' }}</span>
        {{ loading ? '翻译中...' : '翻译' }}
      </button>
      <button
        class="h-9 px-3 bg-deep-charcoal text-gray-300 font-bold border-2 border-white/20 rounded hover:border-primary hover:text-primary transition-all text-sm flex items-center gap-1.5"
        @click="openSettings"
      >
        <span class="material-icons text-lg">key</span>
        API Key
        <span v-if="(engine === 'google' && googleApiKey) || (engine === 'ai' && aiApiKey)" class="ml-0.5 w-2 h-2 rounded-full bg-neon-green" />
        <span v-else class="ml-0.5 w-2 h-2 rounded-full bg-coral-red" />
      </button>

      <!-- AI 模型选择 -->
      <template v-if="engine === 'ai'">
        <div class="flex items-center gap-2">
          <span class="material-icons text-vibrant-purple text-base">smart_toy</span>
          <select
            v-model="aiModel"
            class="h-9 bg-deep-charcoal text-white border-2 border-black rounded px-3 text-sm font-bold outline-none focus:border-vibrant-purple transition-colors max-w-70"
          >
            <option v-if="!aiModels.length" :value="aiModel">{{ aiModel }}</option>
            <option v-for="m in aiModels" :key="m" :value="m">{{ m }}</option>
          </select>
          <button
            class="h-9 w-9 flex items-center justify-center bg-deep-charcoal border-2 border-white/20 rounded hover:border-vibrant-purple hover:text-vibrant-purple transition-all"
            :class="{ 'animate-spin pointer-events-none': modelsLoading }"
            title="刷新模型列表"
            @click="fetchModels"
          >
            <span class="material-icons text-sm">refresh</span>
          </button>
        </div>
        <span v-if="modelsError" class="text-coral-red text-xs font-bold">{{ modelsError }}</span>
      </template>
    </div>

    <!-- 语言选择栏 -->
    <div class="flex items-center gap-3">
      <select
        v-model="sourceLang"
        class="bg-deep-charcoal text-white border-2 border-black rounded px-3 py-1.5 text-sm font-bold outline-none focus:border-primary transition-colors"
      >
        <option v-for="l in languages" :key="l.code" :value="l.code">{{ l.name }}</option>
      </select>
      <button
        class="w-8 h-8 flex items-center justify-center bg-deep-charcoal border-2 border-white/20 rounded-full hover:border-primary hover:text-primary transition-all"
        @click="swapLangs"
      >
        <span class="material-icons text-base">swap_horiz</span>
      </button>
      <select
        v-model="targetLang"
        class="bg-deep-charcoal text-white border-2 border-black rounded px-3 py-1.5 text-sm font-bold outline-none focus:border-primary transition-colors"
      >
        <option v-for="l in targetLanguages" :key="l.code" :value="l.code">{{ l.name }}</option>
      </select>
    </div>

    <!-- Error bar -->
    <div
      v-if="errorMsg"
      class="px-4 py-2 bg-coral-red/20 border-2 border-coral-red rounded flex items-center gap-2 text-coral-red font-bold text-sm"
    >
      <span class="material-icons text-lg">error_outline</span>
      {{ errorMsg }}
    </div>

    <!-- 翻译面板 -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
      <!-- 源文本 -->
      <div class="flex flex-col min-h-0">
        <div class="flex items-center gap-2 mb-2">
          <span class="material-icons text-primary text-lg">edit_note</span>
          <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">原文</span>
        </div>
        <textarea
          v-model="sourceText"
          spellcheck="false"
          placeholder="在此输入要翻译的文本..."
          class="flex-1 w-full bg-deep-charcoal text-gray-100 border-4 border-black rounded-xl p-4 font-mono text-sm leading-relaxed resize-none shadow-hard focus:border-primary focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] transition-all outline-none placeholder-gray-600 min-h-[200px]"
        />
      </div>

      <!-- 翻译结果 -->
      <div class="flex flex-col min-h-0">
        <div class="flex items-center gap-2 mb-2">
          <span class="material-icons text-neon-green text-lg">g_translate</span>
          <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">译文</span>
          <button
            v-if="translatedText"
            class="ml-auto px-2 py-0.5 bg-deep-charcoal font-bold border-2 rounded transition-all text-xs flex items-center gap-1"
            :class="copySuccess ? 'text-neon-green border-neon-green/40' : 'text-gray-300 border-white/20 hover:border-primary hover:text-primary'"
            @click="copyResult"
          >
            <span class="material-icons text-sm">{{ copySuccess ? 'check_circle' : 'content_copy' }}</span>
            {{ copySuccess ? '已复制' : '复制' }}
          </button>
        </div>
        <div
          class="flex-1 w-full bg-deep-charcoal border-4 border-black rounded-xl p-4 overflow-auto shadow-hard min-h-[200px] text-sm leading-relaxed flex flex-col"
        >
          <div v-if="!translatedText" class="text-gray-600">
            翻译结果将显示在这里...
          </div>
          <div v-else class="text-gray-100 whitespace-pre-wrap">{{ translatedText }}</div>
        </div>
      </div>
    </div>

    <!-- API Key 设置弹窗 -->
    <Teleport to="body">
      <div v-if="showSettings" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/60" @click="showSettings = false" />
        <div class="relative w-full max-w-lg bg-deep-charcoal border-4 border-black rounded-xl shadow-hard-xl p-6 flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <span class="material-icons text-primary text-xl">key</span>
            <span class="text-lg font-bold text-white">配置 API Key</span>
            <button
              class="ml-auto w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              @click="showSettings = false"
            >
              <span class="material-icons">close</span>
            </button>
          </div>

          <!-- Google API Key -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-gray-400 uppercase tracking-wider">Google Translation API Key</label>
            <input
              v-model="googleKeyInput"
              type="password"
              placeholder="AIzaSy..."
              class="w-full bg-bg-dark text-gray-100 border-2 border-black rounded-lg px-4 py-2.5 font-mono text-sm outline-none focus:border-primary transition-colors placeholder-gray-600"
            />
          </div>

          <!-- SiliconFlow API Key -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-gray-400 uppercase tracking-wider">SiliconFlow API Key（AI 翻译）</label>
            <input
              v-model="aiKeyInput"
              type="password"
              placeholder="sk-..."
              class="w-full bg-bg-dark text-gray-100 border-2 border-black rounded-lg px-4 py-2.5 font-mono text-sm outline-none focus:border-primary transition-colors placeholder-gray-600"
            />
            <p class="text-[11px] text-gray-600">密钥从 cloud.siliconflow.cn 获取，保存后可在工具栏选择模型</p>
          </div>

          <div class="flex justify-end gap-3 mt-1">
            <button
              class="px-4 py-2 bg-white/10 text-gray-300 font-bold border-2 border-white/20 rounded hover:border-white hover:text-white transition-all text-sm"
              @click="showSettings = false"
            >
              取消
            </button>
            <button
              class="px-4 py-2 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm"
              @click="saveKeys"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>


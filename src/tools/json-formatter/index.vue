<script setup lang="ts">
import { ref, computed } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

const inputJson = ref('')
const errorMsg = ref('')
const deepLevel = ref(Infinity)
const showLineNumber = ref(false)
const copySuccess = ref(false)

const parsedData = computed(() => {
  if (!inputJson.value.trim()) {
    errorMsg.value = ''
    return undefined
  }
  try {
    const parsed = JSON.parse(inputJson.value)
    errorMsg.value = ''
    return parsed
  } catch (e: any) {
    errorMsg.value = e.message || '无效的 JSON'
    return undefined
  }
})

const formattedJson = computed(() => {
  if (parsedData.value === undefined) return ''
  return JSON.stringify(parsedData.value, null, 2)
})

function handleFormat() {
  if (formattedJson.value) {
    inputJson.value = formattedJson.value
  }
}

function handleCompress() {
  if (!inputJson.value.trim()) return
  try {
    const parsed = JSON.parse(inputJson.value)
    inputJson.value = JSON.stringify(parsed)
    errorMsg.value = ''
  } catch (e: any) {
    errorMsg.value = e.message || '无效的 JSON'
  }
}

function handleClear() {
  inputJson.value = ''
  errorMsg.value = ''
}

async function handleCopy() {
  if (formattedJson.value) {
    await navigator.clipboard.writeText(formattedJson.value)
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 1500)
  }
}

function handlePaste() {
  navigator.clipboard.readText().then((text) => {
    inputJson.value = text
  })
}

function loadSample() {
  inputJson.value = JSON.stringify({
    name: "UsefulTools",
    version: "1.0.0",
    description: "一个实用工具集合",
    features: ["JSON格式化", "代码高亮", "数据转换"],
    nested: {
      level1: {
        level2: {
          level3: { deep: true, value: 42 }
        },
        list: [1, 2, 3, { key: "val" }]
      }
    },
    author: { name: "开发者", email: "dev@example.com" },
    config: { theme: "dark", language: "zh-CN", autoSave: true },
    tags: ["tool", "json", "formatter", "visualizer"],
    count: 1024,
    active: true,
    nullable: null
  })
}
</script>

<template>
  <div class="flex flex-col h-full gap-4">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3">
      <button
        class="h-9 px-4 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 text-sm"
        @click="handleFormat"
      >
        <span class="material-icons text-lg">auto_fix_high</span>
        格式化
      </button>
      <button
        class="h-9 px-4 bg-white text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 text-sm"
        @click="handleCompress"
      >
        <span class="material-icons text-lg">compress</span>
        压缩
      </button>
      <button
        class="h-9 px-4 bg-white text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 text-sm"
        @click="handleCopy"
      >
        <span class="material-icons text-lg">{{ copySuccess ? 'check_circle' : 'content_copy' }}</span>
        {{ copySuccess ? '已复制' : '复制' }}
      </button>
      <button
        class="h-9 px-4 bg-white text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 text-sm"
        @click="handlePaste"
      >
        <span class="material-icons text-lg">content_paste</span>
        粘贴
      </button>
      <button
        class="h-9 px-4 bg-coral-red text-white font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 text-sm"
        @click="handleClear"
      >
        <span class="material-icons text-lg">delete_outline</span>
        清空
      </button>

      <div class="ml-auto flex items-center gap-2">
        <button
          class="h-9 px-3 bg-deep-charcoal text-gray-300 font-bold border-2 border-white/20 rounded hover:border-primary hover:text-primary transition-all text-sm flex items-center gap-1.5"
          @click="loadSample"
        >
          <span class="material-icons text-lg">science</span>
          示例
        </button>
      </div>
    </div>

    <!-- Error bar -->
    <div
      v-if="errorMsg"
      class="px-4 py-2 bg-coral-red/20 border-2 border-coral-red rounded flex items-center gap-2 text-coral-red font-bold text-sm"
    >
      <span class="material-icons text-lg">error_outline</span>
      {{ errorMsg }}
    </div>

    <!-- Editor panels -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
      <!-- Input -->
      <div class="flex flex-col min-h-0">
        <div class="flex items-center gap-2 mb-2">
          <span class="material-icons text-primary text-lg">edit_note</span>
          <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">输入</span>
        </div>
        <textarea
          v-model="inputJson"
          placeholder="在此粘贴或输入 JSON..."
          spellcheck="false"
          class="flex-1 w-full bg-deep-charcoal text-gray-100 border-4 border-black rounded-xl p-4 font-mono text-sm leading-relaxed resize-none shadow-hard focus:border-primary focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] transition-all outline-none placeholder-gray-600 min-h-[200px]"
        />
      </div>

      <!-- Visual Output -->
      <div class="flex flex-col min-h-0">
        <div class="flex items-center gap-2 mb-2">
          <span class="material-icons text-neon-green text-lg">account_tree</span>
          <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">可视化</span>
          <div class="ml-auto flex items-center gap-3 text-xs text-gray-500">
            <label class="flex items-center gap-1 cursor-pointer select-none">
              <input v-model="showLineNumber" type="checkbox" class="accent-primary w-3.5 h-3.5" />
              行号
            </label>
            <label class="flex items-center gap-1 select-none">
              深度
              <select
                v-model="deepLevel"
                class="bg-deep-charcoal text-white border border-white/20 rounded px-1.5 py-0.5 text-xs focus:border-primary outline-none"
              >
                <option :value="1">1</option>
                <option :value="2">2</option>
                <option :value="3">3</option>
                <option :value="5">5</option>
                <option :value="Infinity">全部</option>
              </select>
            </label>
          </div>
        </div>
        <div
          class="json-viewer-panel flex-1 w-full bg-deep-charcoal border-4 border-black rounded-xl p-4 overflow-auto shadow-hard min-h-[200px]"
        >
          <vue-json-pretty
            v-if="parsedData !== undefined"
            :data="parsedData"
            :deep="deepLevel"
            :show-line-number="showLineNumber"
            :show-length="true"
            :show-icon="true"
            :show-double-quotes="true"
            :collapsed-on-click-brackets="true"
            theme="dark"
          />
          <div v-else-if="!errorMsg" class="text-gray-600 font-mono text-sm">
            可视化结果将显示在这里...
          </div>
          <div v-else class="text-coral-red font-mono text-sm">
            JSON 解析失败，请检查输入
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
/* vue-json-pretty 深色主题覆盖 */
.json-viewer-panel :deep(.vjs-tree) {
  font-family: 'Space Grotesk', ui-monospace, monospace;
  font-size: 13px;
  color: #e5e7eb;
}

/* 节点行高 + 垂直间距 */
.json-viewer-panel :deep(.vjs-tree-node) {
  line-height: 28px;
  padding: 2px 0;
}

.json-viewer-panel :deep(.vjs-tree-node:hover),
.json-viewer-panel :deep(.vjs-tree-node.dark:hover) {
  background-color: rgba(249, 177, 31, 0.08);
}

/* 层级缩进加宽 */
.json-viewer-panel :deep(.vjs-indent-unit) {
  width: 24px;
}

.json-viewer-panel :deep(.vjs-indent-unit.has-line) {
  border-left: 1px dashed #374151;
}

/* key */
.json-viewer-panel :deep(.vjs-key) {
  color: #f9b11f;
}

/* 值类型颜色 */
.json-viewer-panel :deep(.vjs-value-string) {
  color: #84cc16;
}

.json-viewer-panel :deep(.vjs-value-number) {
  color: #3b82f6;
}

.json-viewer-panel :deep(.vjs-value-boolean) {
  color: #a855f7;
}

.json-viewer-panel :deep(.vjs-value-null),
.json-viewer-panel :deep(.vjs-value-undefined) {
  color: #6b7280;
  font-style: italic;
}

/* 括号 */
.json-viewer-panel :deep(.vjs-tree-brackets) {
  color: #9ca3af;
}

.json-viewer-panel :deep(.vjs-tree-brackets:hover) {
  color: #f9b11f;
}

/* 折叠箭头 */
.json-viewer-panel :deep(.vjs-carets) {
  color: #6b7280;
}

.json-viewer-panel :deep(.vjs-carets:hover) {
  color: #f9b11f;
}

/* 长度提示 */
.json-viewer-panel :deep(.vjs-comment) {
  color: #6b7280;
  font-style: italic;
}

/* 行号 */
.json-viewer-panel :deep(.vjs-node-index) {
  color: #4b5563;
}
</style>
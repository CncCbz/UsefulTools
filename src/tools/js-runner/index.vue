<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import { javascript, scopeCompletionSource, javascriptLanguage } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorState } from '@codemirror/state'
import { autocompletion } from '@codemirror/autocomplete'
import * as prettier from 'prettier/standalone'
import prettierBabel from 'prettier/plugins/babel'
import prettierEstree from 'prettier/plugins/estree'
import LogValue from './LogValue.vue'
import type { LogVal } from './LogValue.vue'

interface LogEntry {
  type: 'log' | 'warn' | 'error' | 'info'
  args: LogVal[]
  timestamp: string
}

const defaultCode = `// 在这里编写 JavaScript 代码
console.log('Hello, World!');
console.warn('这是一条警告');
console.error('这是一条错误');

// 点击"CDN 依赖"按钮可引入第三方库
// 例如引入 lodash 后可以直接使用 _
`

const cdnUrls = ref<string[]>([])
const logs = ref<LogEntry[]>([])
const running = ref(false)
const logPanel = ref<HTMLElement | null>(null)
const showCdnDialog = ref(false)
const cdnInput = ref('')
const editorContainer = ref<HTMLElement | null>(null)
const editorView = shallowRef<EditorView | null>(null)

onMounted(() => {
  if (!editorContainer.value) return
  editorView.value = new EditorView({
    state: EditorState.create({
      doc: defaultCode,
      extensions: [
        basicSetup,
        javascript(),
        oneDark,
        autocompletion({ defaultKeymap: true }),
        javascriptLanguage.data.of({
          autocomplete: scopeCompletionSource(globalThis),
        }),
        EditorView.theme({
          '&': { height: '100%', fontSize: '13px' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { fontFamily: 'ui-monospace, monospace' },
          '.cm-gutters': { border: 'none' },
        }),
      ],
    }),
    parent: editorContainer.value,
  })
})

onBeforeUnmount(() => {
  editorView.value?.destroy()
})

function now() {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`
}

function openCdnDialog() {
  cdnInput.value = cdnUrls.value.join('\n')
  showCdnDialog.value = true
}

function saveCdnUrls() {
  cdnUrls.value = cdnInput.value.split('\n').map(s => s.trim()).filter(Boolean)
  showCdnDialog.value = false
}

function clearLogs() {
  logs.value = []
}

async function formatCode() {
  const view = editorView.value
  if (!view) return
  const source = view.state.doc.toString()
  try {
    const formatted = await prettier.format(source, {
      parser: 'babel',
      plugins: [prettierBabel, prettierEstree],
      semi: true,
      singleQuote: true,
      trailingComma: 'all',
      printWidth: 80,
    })
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: formatted },
    })
  } catch (_) {
    // 格式化失败（语法错误），静默忽略
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (logPanel.value) {
      logPanel.value.scrollTop = logPanel.value.scrollHeight
    }
  })
}

async function runCode() {
  if (running.value) return
  running.value = true
  logs.value = []

  const userCode = editorView.value?.state.doc.toString() || ''
  const urls = cdnUrls.value.filter(u => u.trim())

  // 构建沙箱 HTML
  const sandboxHtml = `
<!DOCTYPE html><html><head>
${urls.map(u => `<script src="${u}"><\/script>`).join('\n')}
</head><body><script>
  // 递归序列化值为结构化树
  function _ser(v, depth) {
    if (depth === undefined) depth = 0;
    if (v === null) return { t: 'null', p: 'null' };
    if (v === undefined) return { t: 'undefined', p: 'undefined' };
    var tp = typeof v;
    if (tp === 'string') return { t: 'string', p: '"' + v + '"' };
    if (tp === 'number' || tp === 'boolean') return { t: tp, p: String(v) };
    if (tp === 'function') return { t: 'function', p: 'ƒ ' + (v.name || 'anonymous') + '()' };
    if (tp === 'symbol') return { t: 'symbol', p: v.toString() };
    if (v instanceof Error) return { t: 'error', p: v.stack || v.message || String(v) };
    if (v instanceof Date) return { t: 'date', p: v.toISOString() };
    if (v instanceof RegExp) return { t: 'regexp', p: v.toString() };
    if (depth > 4) return { t: typeof v === 'object' ? (Array.isArray(v) ? 'array' : 'object') : tp, p: Array.isArray(v) ? '[...]' : '{...}' };
    if (Array.isArray(v)) {
      var entries = [];
      for (var i = 0; i < v.length && i < 100; i++) entries.push({ k: String(i), v: _ser(v[i], depth + 1) });
      return { t: 'array', p: 'Array(' + v.length + ')', e: entries };
    }
    if (tp === 'object') {
      var keys = Object.keys(v), entries = [];
      for (var i = 0; i < keys.length && i < 50; i++) {
        try { entries.push({ k: keys[i], v: _ser(v[keys[i]], depth + 1) }); } catch(e) { entries.push({ k: keys[i], v: { t: 'error', p: '<getter error>' } }); }
      }
      var name = v.constructor && v.constructor.name !== 'Object' ? v.constructor.name : '';
      var preview = name ? name + ' {…}' : '{…}';
      if (keys.length <= 5) {
        preview = name ? name + ' {' : '{';
        preview += keys.slice(0, 5).map(function(k) { return k + ': …' }).join(', ');
        preview += '}';
      }
      return { t: 'object', p: preview, e: entries };
    }
    return { t: 'string', p: String(v) };
  }

  const _post = (type, args) => {
    window.parent.postMessage({ __jsRunner: true, type, args: args.map(a => _ser(a)) }, '*');
  };
  console.log = (...a) => _post('log', a);
  console.warn = (...a) => _post('warn', a);
  console.error = (...a) => _post('error', a);
  console.info = (...a) => _post('info', a);

  window.onerror = (msg, src, line, col, err) => {
    _post('error', [err || msg]);
  };
  window.onunhandledrejection = (e) => {
    _post('error', [e.reason || 'Unhandled Promise Rejection']);
  };

  try {
    ${userCode}
  } catch(e) {
    _post('error', [e]);
  }

  window.parent.postMessage({ __jsRunner: true, type: '__done' }, '*');
<\/script></body></html>`

  // 监听沙箱消息
  const handler = (e: MessageEvent) => {
    if (e.data?.__jsRunner) {
      if (e.data.type === '__done') {
        running.value = false
        window.removeEventListener('message', handler)
        iframe?.remove()
        return
      }
      logs.value.push({
        type: e.data.type,
        args: e.data.args || [],
        timestamp: now(),
      })
      scrollToBottom()
    }
  }
  window.addEventListener('message', handler)

  // 创建隐藏 iframe 作为沙箱
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.setAttribute('sandbox', 'allow-scripts')
  document.body.appendChild(iframe)
  iframe.srcdoc = sandboxHtml

  // 超时保护 10s
  setTimeout(() => {
    if (running.value) {
      running.value = false
      window.removeEventListener('message', handler)
      iframe?.remove()
      logs.value.push({ type: 'error', args: [{ t: 'error', p: '⏱ 执行超时（10秒）' }], timestamp: now() })
      scrollToBottom()
    }
  }, 10000)
}

const logStyles: Record<string, string> = {
  log: 'text-gray-200',
  info: 'text-electric-blue',
  warn: 'text-primary',
  error: 'text-coral-red',
}
const logIcons: Record<string, string> = {
  log: 'chevron_right',
  info: 'info',
  warn: 'warning',
  error: 'error',
}
</script>

<template>
  <div class="flex flex-col h-full gap-4">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3">
      <button
        class="h-9 px-4 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 text-sm"
        :class="{ 'opacity-60 pointer-events-none': running }"
        @click="runCode"
      >
        <span class="material-icons text-lg">{{ running ? 'hourglass_top' : 'play_arrow' }}</span>
        {{ running ? '运行中...' : '运行' }}
      </button>
      <button
        class="h-9 px-4 bg-white text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 text-sm"
        @click="formatCode"
      >
        <span class="material-icons text-lg">auto_fix_high</span>
        格式化
      </button>
      <button
        class="h-9 px-4 bg-white text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center gap-1.5 text-sm"
        @click="clearLogs"
      >
        <span class="material-icons text-lg">delete_outline</span>
        清空日志
      </button>
      <button
        class="h-9 px-3 bg-deep-charcoal text-gray-300 font-bold border-2 border-white/20 rounded hover:border-primary hover:text-primary transition-all text-sm flex items-center gap-1.5"
        @click="openCdnDialog"
      >
        <span class="material-icons text-lg">add_link</span>
        CDN 依赖
        <span v-if="cdnUrls.length" class="ml-0.5 px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-bold">{{ cdnUrls.length }}</span>
      </button>
    </div>

    <!-- 编辑器 + 日志面板 -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
      <!-- 代码编辑区 -->
      <div class="flex flex-col min-h-0">
        <div class="flex items-center gap-2 mb-2">
          <span class="material-icons text-primary text-lg">code</span>
          <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">代码</span>
        </div>
        <div
          ref="editorContainer"
          class="flex-1 w-full bg-deep-charcoal border-4 border-black rounded-xl overflow-hidden shadow-hard min-h-[200px]"
        />
      </div>

      <!-- 日志输出面板 -->
      <div class="flex flex-col min-h-0">
        <div class="flex items-center gap-2 mb-2">
          <span class="material-icons text-neon-green text-lg">terminal</span>
          <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">输出</span>
          <span v-if="logs.length" class="ml-1 text-xs text-gray-600">({{ logs.length }})</span>
        </div>
        <div
          ref="logPanel"
          class="flex-1 w-full bg-deep-charcoal border-4 border-black rounded-xl p-4 overflow-auto shadow-hard min-h-[200px] font-mono text-sm leading-6"
        >
          <div v-if="!logs.length" class="text-gray-600 text-sm">
            运行代码后，输出将显示在这里...
          </div>
          <div
            v-for="(entry, i) in logs"
            :key="i"
            class="flex gap-2 py-0.5 border-b border-white/5 last:border-b-0 leading-6"
            :class="logStyles[entry.type]"
          >
            <span class="material-icons shrink-0 opacity-70 text-base leading-6">{{ logIcons[entry.type] }}</span>
            <span class="flex-1 leading-6">
              <template v-for="(arg, j) in entry.args" :key="j">
                <LogValue :node="arg" />
                <span v-if="j < entry.args.length - 1">&nbsp;</span>
              </template>
            </span>
            <span class="text-[10px] opacity-40 shrink-0 leading-6">{{ entry.timestamp }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- CDN 弹窗 -->
    <Teleport to="body">
      <div v-if="showCdnDialog" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/60" @click="showCdnDialog = false" />
        <div class="relative w-full max-w-lg bg-deep-charcoal border-4 border-black rounded-xl shadow-hard-xl p-6 flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <span class="material-icons text-primary text-xl">add_link</span>
            <span class="text-lg font-bold text-white">管理 CDN 依赖</span>
            <button
              class="ml-auto w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              @click="showCdnDialog = false"
            >
              <span class="material-icons">close</span>
            </button>
          </div>
          <p class="text-xs text-gray-500">每行一个 CDN URL，运行时会按顺序加载到沙箱中</p>
          <textarea
            v-model="cdnInput"
            rows="6"
            spellcheck="false"
            placeholder="https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js&#10;https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js"
            class="w-full bg-bg-dark text-gray-100 border-2 border-black rounded-lg px-4 py-3 font-mono text-xs leading-relaxed resize-none outline-none focus:border-primary transition-colors placeholder-gray-600"
          />
          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 bg-white/10 text-gray-300 font-bold border-2 border-white/20 rounded hover:border-white hover:text-white transition-all text-sm"
              @click="showCdnDialog = false"
            >
              取消
            </button>
            <button
              class="px-4 py-2 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm"
              @click="saveCdnUrls"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>


<script setup lang="ts">
import { ref, computed } from 'vue'

const input = ref(`# Markdown 预览

这是一个 **Markdown** 实时预览工具。

## 功能
- 支持标题、列表、代码块
- 实时渲染预览
- 左右分栏布局

### 代码示例
\`\`\`javascript
const hello = "world"
console.log(hello)
\`\`\`

> 引用文本示例

| 表头1 | 表头2 |
|-------|-------|
| 内容1 | 内容2 |

---

[链接示例](https://example.com)
`)

const copyField = ref('')

// 简易 Markdown 渲染（纯前端，不依赖第三方库）
function renderMarkdown(md: string): string {
  let html = md
  // 代码块
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="md-code-block"><code>$2</code></pre>')
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
  // 表格
  html = html.replace(/^\|(.+)\|\s*\n\|[-| :]+\|\s*\n((?:\|.+\|\s*\n?)*)/gm, (_, header, body) => {
    const ths = header.split('|').map((h: string) => `<th>${h.trim()}</th>`).join('')
    const rows = body.trim().split('\n').map((row: string) => {
      const tds = row.replace(/^\||\|$/g, '').split('|').map((c: string) => `<td>${c.trim()}</td>`).join('')
      return `<tr>${tds}</tr>`
    }).join('')
    return `<table class="md-table"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`
  })
  // 标题
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  // 分割线
  html = html.replace(/^---$/gm, '<hr/>')
  // 引用
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
  // 粗体 & 斜体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
  // 图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1"/>')
  // 无序列表
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
  // 段落
  html = html.replace(/^(?!<[a-z])((?!<\/)[^\n]+)$/gm, '<p>$1</p>')
  return html
}

const rendered = computed(() => renderMarkdown(input.value))

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
        <span class="material-icons text-primary text-lg">article</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">Markdown 预览</span>
      </div>
      <button @click="copy(rendered, 'html')"
        class="h-8 px-3 bg-bg-dark text-gray-400 font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs">
        {{ copyField === 'html' ? '已复制 HTML' : '复制 HTML' }}
      </button>
    </div>
    <div class="flex-1 grid grid-cols-2 gap-4 min-h-0">
      <!-- 编辑器 -->
      <div class="bg-deep-charcoal border-4 border-black rounded-xl shadow-hard overflow-hidden flex flex-col">
        <div class="px-3 py-2 border-b-2 border-black text-xs font-bold text-gray-500 uppercase">编辑</div>
        <textarea v-model="input"
          class="flex-1 w-full bg-transparent text-gray-100 px-4 py-3 font-mono text-sm outline-none resize-none placeholder-gray-600" />
      </div>
      <!-- 预览 -->
      <div class="bg-deep-charcoal border-4 border-black rounded-xl shadow-hard overflow-hidden flex flex-col">
        <div class="px-3 py-2 border-b-2 border-black text-xs font-bold text-gray-500 uppercase">预览</div>
        <div class="flex-1 overflow-auto px-4 py-3 md-preview" v-html="rendered"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.md-preview :deep(h1) { font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0; color: #f9b11f; }
.md-preview :deep(h2) { font-size: 1.25rem; font-weight: 700; margin: 0.5rem 0; color: #f9b11f; }
.md-preview :deep(h3) { font-size: 1.1rem; font-weight: 600; margin: 0.4rem 0; color: #e5a31b; }
.md-preview :deep(p) { margin: 0.3rem 0; color: #d1d5db; line-height: 1.6; }
.md-preview :deep(strong) { color: #fff; }
.md-preview :deep(em) { color: #a78bfa; }
.md-preview :deep(a) { color: #3b82f6; text-decoration: underline; }
.md-preview :deep(blockquote) { border-left: 3px solid #f9b11f; padding-left: 0.75rem; color: #9ca3af; margin: 0.5rem 0; }
.md-preview :deep(ul) { padding-left: 1.25rem; margin: 0.3rem 0; }
.md-preview :deep(li) { color: #d1d5db; margin: 0.15rem 0; list-style: disc; }
.md-preview :deep(hr) { border: none; border-top: 2px solid #333; margin: 0.75rem 0; }
.md-preview :deep(.md-code-block) { background: #1a1510; border: 2px solid #000; border-radius: 0.5rem; padding: 0.75rem; overflow-x: auto; margin: 0.5rem 0; }
.md-preview :deep(.md-code-block code) { color: #84cc16; font-size: 0.8rem; }
.md-preview :deep(.md-inline-code) { background: #1a1510; color: #f9b11f; padding: 0.1rem 0.3rem; border-radius: 0.25rem; font-size: 0.85rem; }
.md-preview :deep(.md-table) { width: 100%; border-collapse: collapse; margin: 0.5rem 0; }
.md-preview :deep(.md-table th) { background: #1a1510; border: 2px solid #000; padding: 0.4rem 0.6rem; text-align: left; color: #f9b11f; font-size: 0.8rem; }
.md-preview :deep(.md-table td) { border: 2px solid #000; padding: 0.4rem 0.6rem; color: #d1d5db; font-size: 0.8rem; }
</style>

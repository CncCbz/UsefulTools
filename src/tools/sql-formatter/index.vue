<script setup lang="ts">
import { ref } from 'vue'

const input = ref('')
const output = ref('')
const copyField = ref('')

const keywords = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INSERT', 'INTO', 'VALUES',
  'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'ON',
  'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'UNION',
  'ALL', 'AS', 'IN', 'NOT', 'NULL', 'IS', 'LIKE', 'BETWEEN',
  'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'DISTINCT',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ASC', 'DESC', 'WITH',
]

const majorKeywords = new Set([
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN',
  'INNER JOIN', 'OUTER JOIN', 'FULL JOIN', 'CROSS JOIN',
  'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
  'UNION', 'UNION ALL', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'WITH',
  'AND', 'OR', 'ON',
])

function formatSQL(sql: string): string {
  if (!sql.trim()) return ''

  // 标准化空白
  let s = sql.replace(/\s+/g, ' ').trim()

  // 大写关键字
  for (const kw of keywords) {
    const re = new RegExp(`\\b${kw}\\b`, 'gi')
    s = s.replace(re, kw)
  }

  // 合并复合关键字
  s = s.replace(/\bLEFT\s+JOIN\b/g, 'LEFT JOIN')
  s = s.replace(/\bRIGHT\s+JOIN\b/g, 'RIGHT JOIN')
  s = s.replace(/\bINNER\s+JOIN\b/g, 'INNER JOIN')
  s = s.replace(/\bOUTER\s+JOIN\b/g, 'OUTER JOIN')
  s = s.replace(/\bFULL\s+JOIN\b/g, 'FULL JOIN')
  s = s.replace(/\bCROSS\s+JOIN\b/g, 'CROSS JOIN')
  s = s.replace(/\bGROUP\s+BY\b/g, 'GROUP BY')
  s = s.replace(/\bORDER\s+BY\b/g, 'ORDER BY')
  s = s.replace(/\bINSERT\s+INTO\b/g, 'INSERT INTO')
  s = s.replace(/\bDELETE\s+FROM\b/g, 'DELETE FROM')
  s = s.replace(/\bCREATE\s+TABLE\b/g, 'CREATE TABLE')
  s = s.replace(/\bALTER\s+TABLE\b/g, 'ALTER TABLE')
  s = s.replace(/\bDROP\s+TABLE\b/g, 'DROP TABLE')
  s = s.replace(/\bUNION\s+ALL\b/g, 'UNION ALL')

  // 在主要关键字前换行
  for (const kw of majorKeywords) {
    const re = new RegExp(`\\s+${kw.replace(/\s+/g, '\\s+')}\\b`, 'g')
    s = s.replace(re, `\n${kw}`)
  }

  // 缩进子句
  const lines = s.split('\n')
  const result: string[] = []
  let indent = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (/^(AND|OR|ON)\b/.test(trimmed)) {
      result.push('  ' + trimmed)
    } else if (/^(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|GROUP|ORDER|HAVING|LIMIT|OFFSET|UNION|SET|VALUES)\b/.test(trimmed)) {
      result.push(trimmed)
    } else {
      result.push('  '.repeat(indent || 1) + trimmed)
    }
  }

  return result.join('\n')
}

function format() {
  output.value = formatSQL(input.value)
}

function loadSample() {
  input.value = 'SELECT u.id, u.name, u.email, COUNT(o.id) as order_count FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.status = \'active\' AND o.created_at > \'2024-01-01\' GROUP BY u.id, u.name, u.email HAVING COUNT(o.id) > 5 ORDER BY order_count DESC LIMIT 10'
  format()
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
        <span class="material-icons text-primary text-lg">storage</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">SQL 格式化</span>
      </div>
      <div class="flex gap-2">
        <button @click="loadSample"
          class="h-8 px-3 bg-bg-dark text-gray-400 font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs">
          加载示例
        </button>
        <button @click="format"
          class="h-8 px-4 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs">
          格式化
        </button>
      </div>
    </div>

    <div class="flex-1 grid grid-cols-2 gap-4 min-h-0">
      <div class="bg-deep-charcoal border-4 border-black rounded-xl shadow-hard overflow-hidden flex flex-col">
        <div class="px-3 py-2 border-b-2 border-black text-xs font-bold text-gray-500 uppercase">输入 SQL</div>
        <textarea v-model="input" @input="format" placeholder="输入 SQL 语句..."
          class="flex-1 w-full bg-transparent text-gray-100 px-4 py-3 font-mono text-sm outline-none resize-none placeholder-gray-600" />
      </div>
      <div class="bg-deep-charcoal border-4 border-black rounded-xl shadow-hard overflow-hidden flex flex-col">
        <div class="flex items-center justify-between px-3 py-2 border-b-2 border-black">
          <span class="text-xs font-bold text-gray-500 uppercase">格式化结果</span>
          <button v-if="output" @click="copy(output, 'output')"
            class="flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors">
            <span class="material-icons text-sm">{{ copyField === 'output' ? 'check' : 'content_copy' }}</span>
          </button>
        </div>
        <pre class="flex-1 overflow-auto px-4 py-3 font-mono text-sm text-gray-100 whitespace-pre-wrap select-all">{{ output }}</pre>
      </div>
    </div>
  </div>
</template>

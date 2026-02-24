/**
 * 操作定义 — 每个操作是一个纯函数 (input, params) => output
 */
import CryptoJS from 'crypto-js'
import pako from 'pako'
export interface OperationParam {
  key: string
  label: string
  type: 'text' | 'select' | 'number' | 'boolean'
  default: any
  options?: { label: string; value: any }[]
}

export interface OperationDef {
  id: string
  name: string
  icon: string
  category: string
  description: string
  params: OperationParam[]
  execute: (input: string, params: Record<string, any>) => string
}

/* ─── 工具函数 ─── */

function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

function hexEncode(bytes: Uint8Array, sep = ''): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(sep)
}

function hexDecode(hex: string): Uint8Array {
  const clean = hex.replace(/[\s\-:]/g, '')
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/* ─── ROT13 / ROTn ─── */
function rotN(str: string, n: number): string {
  return str.replace(/[a-zA-Z]/g, c => {
    const base = c <= 'Z' ? 65 : 97
    return String.fromCharCode(((c.charCodeAt(0) - base + n) % 26) + base)
  })
}

/* ─── 操作列表 ─── */
export const operations: OperationDef[] = [
  // ── 编码 ──
  {
    id: 'to-base64',
    name: 'Base64 编码',
    icon: 'lock',
    category: '编码',
    description: '将文本编码为 Base64',
    params: [],
    execute: (input) => btoa(unescape(encodeURIComponent(input))),
  },
  {
    id: 'from-base64',
    name: 'Base64 解码',
    icon: 'lock_open',
    category: '编码',
    description: '将 Base64 解码为文本',
    params: [],
    execute: (input) => {
      try { return decodeURIComponent(escape(atob(input.trim()))) }
      catch { return '⚠ 无效的 Base64' }
    },
  },
  {
    id: 'url-encode',
    name: 'URL 编码',
    icon: 'link',
    category: '编码',
    description: 'encodeURIComponent',
    params: [],
    execute: (input) => encodeURIComponent(input),
  },
  {
    id: 'url-decode',
    name: 'URL 解码',
    icon: 'link_off',
    category: '编码',
    description: 'decodeURIComponent',
    params: [],
    execute: (input) => {
      try { return decodeURIComponent(input) }
      catch { return '⚠ 无效的 URL 编码' }
    },
  },
  {
    id: 'to-hex',
    name: 'Hex 编码',
    icon: 'tag',
    category: '编码',
    description: '文本转十六进制',
    params: [
      { key: 'sep', label: '分隔符', type: 'select', default: ' ', options: [
        { label: '空格', value: ' ' }, { label: '无', value: '' }, { label: '冒号', value: ':' }, { label: '横线', value: '-' },
      ]},
    ],
    execute: (input, p) => hexEncode(utf8ToBytes(input), p.sep),
  },
  {
    id: 'from-hex',
    name: 'Hex 解码',
    icon: 'tag',
    category: '编码',
    description: '十六进制转文本',
    params: [],
    execute: (input) => {
      try { return bytesToUtf8(hexDecode(input)) }
      catch { return '⚠ 无效的 Hex' }
    },
  },
  {
    id: 'html-encode',
    name: 'HTML 实体编码',
    icon: 'code',
    category: '编码',
    description: '转义 HTML 特殊字符',
    params: [],
    execute: (input) => input.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'),
  },
  {
    id: 'html-decode',
    name: 'HTML 实体解码',
    icon: 'code_off',
    category: '编码',
    description: '还原 HTML 实体',
    params: [],
    execute: (input) => {
      const el = document.createElement('textarea')
      el.innerHTML = input
      return el.value
    },
  },
  {
    id: 'unicode-escape',
    name: 'Unicode 转义',
    icon: 'translate',
    category: '编码',
    description: '转为 \\uXXXX 格式',
    params: [],
    execute: (input) => Array.from(input).map(c => {
      const code = c.codePointAt(0)!
      return code > 127 ? `\\u${code.toString(16).padStart(4, '0')}` : c
    }).join(''),
  },
  {
    id: 'unicode-unescape',
    name: 'Unicode 反转义',
    icon: 'translate',
    category: '编码',
    description: '还原 \\uXXXX',
    params: [],
    execute: (input) => input.replace(/\\u([0-9a-fA-F]{4,6})/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16))),
  },

  // ── 哈希 ──
  {
    id: 'md5',
    name: 'MD5',
    icon: 'fingerprint',
    category: '哈希',
    description: 'MD5 哈希（简易实现）',
    params: [],
    execute: (input) => md5(input),
  },

  // ── 加密 ──
  {
    id: 'rot-n',
    name: 'ROT N',
    icon: 'rotate_right',
    category: '加密',
    description: '凯撒密码 / ROT13',
    params: [
      { key: 'n', label: '偏移量', type: 'number', default: 13 },
    ],
    execute: (input, p) => rotN(input, Number(p.n) || 13),
  },
  {
    id: 'xor',
    name: 'XOR',
    icon: 'shuffle',
    category: '加密',
    description: '按字节 XOR 加密',
    params: [
      { key: 'key', label: '密钥 (Hex)', type: 'text', default: 'ff' },
    ],
    execute: (input, p) => {
      const keyBytes = hexDecode(p.key || 'ff')
      const inputBytes = utf8ToBytes(input)
      const result = new Uint8Array(inputBytes.length)
      for (let i = 0; i < inputBytes.length; i++) {
        result[i] = inputBytes[i] ^ keyBytes[i % keyBytes.length]
      }
      return hexEncode(result, ' ')
    },
  },
  {
    id: 'reverse',
    name: '反转字符串',
    icon: 'swap_horiz',
    category: '文本',
    description: '反转文本内容',
    params: [],
    execute: (input) => Array.from(input).reverse().join(''),
  },

  // ── 文本 ──
  {
    id: 'to-upper',
    name: '转大写',
    icon: 'text_fields',
    category: '文本',
    description: '全部转为大写',
    params: [],
    execute: (input) => input.toUpperCase(),
  },
  {
    id: 'to-lower',
    name: '转小写',
    icon: 'text_fields',
    category: '文本',
    description: '全部转为小写',
    params: [],
    execute: (input) => input.toLowerCase(),
  },
  {
    id: 'trim-lines',
    name: '去除空行',
    icon: 'format_align_left',
    category: '文本',
    description: '移除空白行',
    params: [],
    execute: (input) => input.split('\n').filter(l => l.trim()).join('\n'),
  },
  {
    id: 'line-numbers',
    name: '添加行号',
    icon: 'format_list_numbered',
    category: '文本',
    description: '为每行添加行号',
    params: [],
    execute: (input) => input.split('\n').map((l, i) => `${(i + 1).toString().padStart(4)} | ${l}`).join('\n'),
  },
  {
    id: 'count-chars',
    name: '字符统计',
    icon: 'analytics',
    category: '文本',
    description: '统计字符、单词、行数',
    params: [],
    execute: (input) => {
      const chars = input.length
      const lines = input ? input.split('\n').length : 0
      const words = input.trim() ? input.trim().split(/\s+/).length : 0
      const bytes = utf8ToBytes(input).length
      return `字符: ${chars}\n单词: ${words}\n行数: ${lines}\n字节: ${bytes}`
    },
  },
  {
    id: 'sort-lines',
    name: '行排序',
    icon: 'sort',
    category: '文本',
    description: '按字母顺序排序每行',
    params: [
      { key: 'reverse', label: '倒序', type: 'boolean', default: false },
    ],
    execute: (input, p) => {
      const lines = input.split('\n')
      lines.sort()
      if (p.reverse) lines.reverse()
      return lines.join('\n')
    },
  },
  {
    id: 'unique-lines',
    name: '去重行',
    icon: 'filter_list',
    category: '文本',
    description: '移除重复行',
    params: [],
    execute: (input) => [...new Set(input.split('\n'))].join('\n'),
  },
  {
    id: 'find-replace',
    name: '查找替换',
    icon: 'find_replace',
    category: '文本',
    description: '文本查找替换',
    params: [
      { key: 'find', label: '查找', type: 'text', default: '' },
      { key: 'replace', label: '替换', type: 'text', default: '' },
      { key: 'regex', label: '正则', type: 'boolean', default: false },
    ],
    execute: (input, p) => {
      if (!p.find) return input
      if (p.regex) {
        try { return input.replace(new RegExp(p.find, 'g'), p.replace) }
        catch { return '⚠ 无效的正则表达式' }
      }
      return input.split(p.find).join(p.replace)
    },
  },

  // ── 编码（补充） ──
  {
    id: 'to-base32',
    name: 'Base32 编码',
    icon: 'lock',
    category: '编码',
    description: '将文本编码为 Base32',
    params: [],
    execute: (input) => base32Encode(utf8ToBytes(input)),
  },
  {
    id: 'from-base32',
    name: 'Base32 解码',
    icon: 'lock_open',
    category: '编码',
    description: '将 Base32 解码为文本',
    params: [],
    execute: (input) => {
      try { return bytesToUtf8(base32Decode(input.trim())) }
      catch { return '⚠ 无效的 Base32' }
    },
  },
  {
    id: 'to-binary',
    name: '二进制编码',
    icon: 'memory',
    category: '编码',
    description: '文本转二进制',
    params: [
      { key: 'sep', label: '分隔符', type: 'select', default: ' ', options: [
        { label: '空格', value: ' ' }, { label: '无', value: '' },
      ]},
    ],
    execute: (input, p) => Array.from(utf8ToBytes(input)).map(b => b.toString(2).padStart(8, '0')).join(p.sep),
  },
  {
    id: 'from-binary',
    name: '二进制解码',
    icon: 'memory',
    category: '编码',
    description: '二进制转文本',
    params: [],
    execute: (input) => {
      const clean = input.replace(/[^01]/g, '')
      if (clean.length % 8 !== 0) return '⚠ 长度不是8的倍数'
      const bytes = new Uint8Array(clean.length / 8)
      for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substring(i * 8, i * 8 + 8), 2)
      return bytesToUtf8(bytes)
    },
  },
  {
    id: 'to-octal',
    name: '八进制编码',
    icon: 'looks_8',
    category: '编码',
    description: '文本转八进制',
    params: [],
    execute: (input) => Array.from(utf8ToBytes(input)).map(b => b.toString(8).padStart(3, '0')).join(' '),
  },
  {
    id: 'from-octal',
    name: '八进制解码',
    icon: 'looks_8',
    category: '编码',
    description: '八进制转文本',
    params: [],
    execute: (input) => {
      try {
        const parts = input.trim().split(/\s+/)
        const bytes = new Uint8Array(parts.map(p => parseInt(p, 8)))
        return bytesToUtf8(bytes)
      } catch { return '⚠ 无效的八进制' }
    },
  },
  {
    id: 'to-morse',
    name: '摩尔斯编码',
    icon: 'radio',
    category: '编码',
    description: '文本转摩尔斯电码',
    params: [],
    execute: (input) => {
      const table: Record<string, string> = {
        'A':'.-','B':'-...','C':'-.-.','D':'-..','E':'.','F':'..-.','G':'--.','H':'....','I':'..','J':'.---',
        'K':'-.-','L':'.-..','M':'--','N':'-.','O':'---','P':'.--.','Q':'--.-','R':'.-.','S':'...','T':'-',
        'U':'..-','V':'...-','W':'.--','X':'-..-','Y':'-.--','Z':'--..','0':'-----','1':'.----','2':'..---',
        '3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.', ' ': '/',
      }
      return input.toUpperCase().split('').map(c => table[c] || c).join(' ')
    },
  },
  {
    id: 'from-morse',
    name: '摩尔斯解码',
    icon: 'radio',
    category: '编码',
    description: '摩尔斯电码转文本',
    params: [],
    execute: (input) => {
      const table: Record<string, string> = {
        '.-':'A','-...':'B','-.-.':'C','-..':'D','.':'E','..-.':'F','--.':'G','....':'H','..':'I','.---':'J',
        '-.-':'K','.-..':'L','--':'M','-.':'N','---':'O','.--.':'P','--.-':'Q','.-.':'R','...':'S','-':'T',
        '..-':'U','...-':'V','.--':'W','-..-':'X','-.--':'Y','--..':'Z','-----':'0','.----':'1','..---':'2',
        '...--':'3','....-':'4','.....':'5','-....':'6','--...':'7','---..':'8','----.':'9', '/': ' ',
      }
      return input.split(' ').map(c => table[c] || c).join('')
    },
  },

  // ── 哈希（补充） ──
  {
    id: 'sha1',
    name: 'SHA-1',
    icon: 'fingerprint',
    category: '哈希',
    description: 'SHA-1 哈希',
    params: [],
    execute: (input) => sha1(input),
  },
  {
    id: 'sha256',
    name: 'SHA-256',
    icon: 'fingerprint',
    category: '哈希',
    description: 'SHA-256 哈希',
    params: [],
    execute: (input) => sha256(input),
  },
  {
    id: 'crc32',
    name: 'CRC-32',
    icon: 'verified',
    category: '哈希',
    description: 'CRC-32 校验',
    params: [],
    execute: (input) => {
      let crc = 0xFFFFFFFF
      const bytes = utf8ToBytes(input)
      for (let i = 0; i < bytes.length; i++) {
        crc ^= bytes[i]
        for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
      }
      return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0')
    },
  },
  {
    id: 'hmac-sha256',
    name: 'HMAC-SHA256',
    icon: 'enhanced_encryption',
    category: '哈希',
    description: 'HMAC-SHA256 消息认证码',
    params: [
      { key: 'key', label: '密钥', type: 'text', default: 'secret' },
    ],
    execute: (input, p) => hmacSha256(p.key || 'secret', input),
  },

  // ── 加密（补充） ──
  {
    id: 'aes-encrypt',
    name: 'AES 加密',
    icon: 'enhanced_encryption',
    category: '加密',
    description: 'AES-CBC 加密（输出 Base64）',
    params: [
      { key: 'key', label: '密钥', type: 'text', default: '0123456789abcdef' },
      { key: 'iv', label: 'IV (16字符)', type: 'text', default: 'abcdef0123456789' },
    ],
    execute: (input, p) => aesEncrypt(input, p.key, p.iv),
  },
  {
    id: 'aes-decrypt',
    name: 'AES 解密',
    icon: 'no_encryption',
    category: '加密',
    description: 'AES-CBC 解密（输入 Base64）',
    params: [
      { key: 'key', label: '密钥', type: 'text', default: '0123456789abcdef' },
      { key: 'iv', label: 'IV (16字符)', type: 'text', default: 'abcdef0123456789' },
    ],
    execute: (input, p) => aesDecrypt(input.trim(), p.key, p.iv),
  },
  {
    id: 'rc4',
    name: 'RC4',
    icon: 'vpn_key',
    category: '加密',
    description: 'RC4 流密码（输出 Hex）',
    params: [
      { key: 'key', label: '密钥', type: 'text', default: 'secret' },
    ],
    execute: (input, p) => {
      const key = utf8ToBytes(p.key || 'secret')
      const data = utf8ToBytes(input)
      const S = new Uint8Array(256)
      for (let i = 0; i < 256; i++) S[i] = i
      let j = 0
      for (let i = 0; i < 256; i++) {
        j = (j + S[i] + key[i % key.length]) & 255
        ;[S[i], S[j]] = [S[j], S[i]]
      }
      let x = 0; j = 0
      const result = new Uint8Array(data.length)
      for (let i = 0; i < data.length; i++) {
        x = (x + 1) & 255
        j = (j + S[x]) & 255
        ;[S[x], S[j]] = [S[j], S[x]]
        result[i] = data[i] ^ S[(S[x] + S[j]) & 255]
      }
      return hexEncode(result, ' ')
    },
  },
  {
    id: 'vigenere-enc',
    name: 'Vigenère 加密',
    icon: 'lock',
    category: '加密',
    description: '维吉尼亚密码加密',
    params: [
      { key: 'key', label: '密钥', type: 'text', default: 'KEY' },
    ],
    execute: (input, p) => {
      const key = (p.key || 'KEY').toUpperCase()
      if (!key.match(/^[A-Z]+$/)) return '⚠ 密钥只能包含字母'
      let ki = 0
      return input.replace(/[a-zA-Z]/g, c => {
        const base = c <= 'Z' ? 65 : 97
        const shift = key.charCodeAt(ki % key.length) - 65
        ki++
        return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26) + base)
      })
    },
  },
  {
    id: 'vigenere-dec',
    name: 'Vigenère 解密',
    icon: 'lock_open',
    category: '加密',
    description: '维吉尼亚密码解密',
    params: [
      { key: 'key', label: '密钥', type: 'text', default: 'KEY' },
    ],
    execute: (input, p) => {
      const key = (p.key || 'KEY').toUpperCase()
      if (!key.match(/^[A-Z]+$/)) return '⚠ 密钥只能包含字母'
      let ki = 0
      return input.replace(/[a-zA-Z]/g, c => {
        const base = c <= 'Z' ? 65 : 97
        const shift = key.charCodeAt(ki % key.length) - 65
        ki++
        return String.fromCharCode(((c.charCodeAt(0) - base - shift + 26) % 26) + base)
      })
    },
  },
  {
    id: 'atbash',
    name: 'Atbash 密码',
    icon: 'swap_vert',
    category: '加密',
    description: 'A↔Z, B↔Y 字母替换',
    params: [],
    execute: (input) => input.replace(/[a-zA-Z]/g, c => {
      const base = c <= 'Z' ? 65 : 97
      return String.fromCharCode(base + 25 - (c.charCodeAt(0) - base))
    }),
  },
  {
    id: 'rail-fence-enc',
    name: '栅栏密码加密',
    icon: 'fence',
    category: '加密',
    description: '栅栏密码（Rail Fence）',
    params: [
      { key: 'rails', label: '栏数', type: 'number', default: 3 },
    ],
    execute: (input, p) => {
      const rails = Math.max(2, Number(p.rails) || 3)
      const fence: string[][] = Array.from({ length: rails }, () => [])
      let rail = 0, dir = 1
      for (const c of input) {
        fence[rail].push(c)
        if (rail === 0) dir = 1
        else if (rail === rails - 1) dir = -1
        rail += dir
      }
      return fence.flat().join('')
    },
  },
  {
    id: 'rail-fence-dec',
    name: '栅栏密码解密',
    icon: 'fence',
    category: '加密',
    description: '栅栏密码解密',
    params: [
      { key: 'rails', label: '栏数', type: 'number', default: 3 },
    ],
    execute: (input, p) => {
      const rails = Math.max(2, Number(p.rails) || 3)
      const n = input.length
      const pattern: number[] = []
      let rail = 0, dir = 1
      for (let i = 0; i < n; i++) {
        pattern.push(rail)
        if (rail === 0) dir = 1
        else if (rail === rails - 1) dir = -1
        rail += dir
      }
      const sorted = pattern.map((r, i) => ({ r, i })).sort((a, b) => a.r - b.r || a.i - b.i)
      const result = new Array(n)
      for (let i = 0; i < n; i++) result[sorted[i].i] = input[i]
      return result.join('')
    },
  },

  // ── 数据格式 ──
  {
    id: 'json-beautify',
    name: 'JSON 美化',
    icon: 'data_object',
    category: '数据格式',
    description: '格式化 JSON',
    params: [
      { key: 'indent', label: '缩进', type: 'number', default: 2 },
    ],
    execute: (input, p) => {
      try { return JSON.stringify(JSON.parse(input), null, Number(p.indent) || 2) }
      catch { return '⚠ 无效的 JSON' }
    },
  },
  {
    id: 'json-minify',
    name: 'JSON 压缩',
    icon: 'data_object',
    category: '数据格式',
    description: '压缩 JSON（去除空白）',
    params: [],
    execute: (input) => {
      try { return JSON.stringify(JSON.parse(input)) }
      catch { return '⚠ 无效的 JSON' }
    },
  },
  {
    id: 'extract-urls',
    name: '提取 URL',
    icon: 'link',
    category: '数据格式',
    description: '从文本中提取所有 URL',
    params: [],
    execute: (input) => {
      const urls = input.match(/https?:\/\/[^\s<>"')\]]+/gi)
      return urls ? urls.join('\n') : '(未找到 URL)'
    },
  },
  {
    id: 'extract-emails',
    name: '提取邮箱',
    icon: 'email',
    category: '数据格式',
    description: '从文本中提取邮箱地址',
    params: [],
    execute: (input) => {
      const emails = input.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)
      return emails ? [...new Set(emails)].join('\n') : '(未找到邮箱)'
    },
  },
  {
    id: 'extract-ips',
    name: '提取 IP',
    icon: 'dns',
    category: '数据格式',
    description: '从文本中提取 IPv4 地址',
    params: [],
    execute: (input) => {
      const ips = input.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)
      return ips ? [...new Set(ips)].join('\n') : '(未找到 IP)'
    },
  },
  {
    id: 'csv-to-json',
    name: 'CSV → JSON',
    icon: 'table_chart',
    category: '数据格式',
    description: 'CSV 转 JSON 数组',
    params: [
      { key: 'sep', label: '分隔符', type: 'select', default: ',', options: [
        { label: '逗号', value: ',' }, { label: 'Tab', value: '\t' }, { label: '分号', value: ';' },
      ]},
    ],
    execute: (input, p) => {
      const lines = input.trim().split('\n')
      if (lines.length < 2) return '⚠ 至少需要标题行和数据行'
      const headers = lines[0].split(p.sep)
      const rows = lines.slice(1).map(line => {
        const vals = line.split(p.sep)
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => { obj[h.trim()] = (vals[i] || '').trim() })
        return obj
      })
      return JSON.stringify(rows, null, 2)
    },
  },

  // ── 哈希（crypto-js） ──
  {
    id: 'sha384',
    name: 'SHA-384',
    icon: 'fingerprint',
    category: '哈希',
    description: 'SHA-384 哈希',
    params: [],
    execute: (input) => CryptoJS.SHA384(input).toString(),
  },
  {
    id: 'sha512',
    name: 'SHA-512',
    icon: 'fingerprint',
    category: '哈希',
    description: 'SHA-512 哈希',
    params: [],
    execute: (input) => CryptoJS.SHA512(input).toString(),
  },
  {
    id: 'sha3',
    name: 'SHA-3',
    icon: 'fingerprint',
    category: '哈希',
    description: 'SHA-3 哈希',
    params: [
      { key: 'len', label: '输出长度', type: 'select', default: 256, options: [
        { label: '224', value: 224 }, { label: '256', value: 256 }, { label: '384', value: 384 }, { label: '512', value: 512 },
      ]},
    ],
    execute: (input, p) => CryptoJS.SHA3(input, { outputLength: Number(p.len) || 256 }).toString(),
  },
  {
    id: 'ripemd160',
    name: 'RIPEMD-160',
    icon: 'fingerprint',
    category: '哈希',
    description: 'RIPEMD-160 哈希',
    params: [],
    execute: (input) => CryptoJS.RIPEMD160(input).toString(),
  },

  // ── 加密（crypto-js） ──
  {
    id: 'triple-des-enc',
    name: '3DES 加密',
    icon: 'enhanced_encryption',
    category: '加密',
    description: 'Triple DES 加密（输出 Base64）',
    params: [
      { key: 'key', label: '密钥', type: 'text', default: 'my-secret-key-123' },
    ],
    execute: (input, p) => CryptoJS.TripleDES.encrypt(input, p.key || 'key').toString(),
  },
  {
    id: 'triple-des-dec',
    name: '3DES 解密',
    icon: 'no_encryption',
    category: '加密',
    description: 'Triple DES 解密（输入 Base64）',
    params: [
      { key: 'key', label: '密钥', type: 'text', default: 'my-secret-key-123' },
    ],
    execute: (input, p) => {
      try { return CryptoJS.TripleDES.decrypt(input.trim(), p.key || 'key').toString(CryptoJS.enc.Utf8) || '⚠ 解密失败（密钥错误？）' }
      catch { return '⚠ 解密失败' }
    },
  },
  {
    id: 'rabbit-enc',
    name: 'Rabbit 加密',
    icon: 'enhanced_encryption',
    category: '加密',
    description: 'Rabbit 流密码加密',
    params: [
      { key: 'key', label: '密钥', type: 'text', default: 'secret' },
    ],
    execute: (input, p) => CryptoJS.Rabbit.encrypt(input, p.key || 'key').toString(),
  },
  {
    id: 'rabbit-dec',
    name: 'Rabbit 解密',
    icon: 'no_encryption',
    category: '加密',
    description: 'Rabbit 流密码解密',
    params: [
      { key: 'key', label: '密钥', type: 'text', default: 'secret' },
    ],
    execute: (input, p) => {
      try { return CryptoJS.Rabbit.decrypt(input.trim(), p.key || 'key').toString(CryptoJS.enc.Utf8) || '⚠ 解密失败' }
      catch { return '⚠ 解密失败' }
    },
  },
  {
    id: 'des-enc',
    name: 'DES 加密',
    icon: 'enhanced_encryption',
    category: '加密',
    description: 'DES 加密（输出 Base64）',
    params: [
      { key: 'key', label: '密钥', type: 'text', default: 'secretk' },
    ],
    execute: (input, p) => CryptoJS.DES.encrypt(input, p.key || 'key').toString(),
  },
  {
    id: 'des-dec',
    name: 'DES 解密',
    icon: 'no_encryption',
    category: '加密',
    description: 'DES 解密（输入 Base64）',
    params: [
      { key: 'key', label: '密钥', type: 'text', default: 'secretk' },
    ],
    execute: (input, p) => {
      try { return CryptoJS.DES.decrypt(input.trim(), p.key || 'key').toString(CryptoJS.enc.Utf8) || '⚠ 解密失败' }
      catch { return '⚠ 解密失败' }
    },
  },
  {
    id: 'aes-cjs-enc',
    name: 'AES 加密(密码)',
    icon: 'enhanced_encryption',
    category: '加密',
    description: 'AES 密码模式加密（自动派生密钥）',
    params: [
      { key: 'pass', label: '密码', type: 'text', default: 'password' },
    ],
    execute: (input, p) => CryptoJS.AES.encrypt(input, p.pass || 'password').toString(),
  },
  {
    id: 'aes-cjs-dec',
    name: 'AES 解密(密码)',
    icon: 'no_encryption',
    category: '加密',
    description: 'AES 密码模式解密',
    params: [
      { key: 'pass', label: '密码', type: 'text', default: 'password' },
    ],
    execute: (input, p) => {
      try { return CryptoJS.AES.decrypt(input.trim(), p.pass || 'password').toString(CryptoJS.enc.Utf8) || '⚠ 解密失败' }
      catch { return '⚠ 解密失败' }
    },
  },

  // ── 压缩 ──
  {
    id: 'gzip-compress',
    name: 'Gzip 压缩',
    icon: 'compress',
    category: '压缩',
    description: 'Gzip 压缩（输出 Base64）',
    params: [],
    execute: (input) => {
      try {
        const compressed = pako.gzip(input)
        return btoa(String.fromCharCode(...compressed))
      } catch (e: any) { return `⚠ ${e.message}` }
    },
  },
  {
    id: 'gzip-decompress',
    name: 'Gzip 解压',
    icon: 'expand',
    category: '压缩',
    description: 'Gzip 解压（输入 Base64）',
    params: [],
    execute: (input) => {
      try {
        const bytes = Uint8Array.from(atob(input.trim()), c => c.charCodeAt(0))
        return pako.ungzip(bytes, { to: 'string' })
      } catch (e: any) { return `⚠ ${e.message}` }
    },
  },
  {
    id: 'deflate-compress',
    name: 'Deflate 压缩',
    icon: 'compress',
    category: '压缩',
    description: 'Deflate 压缩（输出 Base64）',
    params: [],
    execute: (input) => {
      try {
        const compressed = pako.deflate(input)
        return btoa(String.fromCharCode(...compressed))
      } catch (e: any) { return `⚠ ${e.message}` }
    },
  },
  {
    id: 'deflate-decompress',
    name: 'Deflate 解压',
    icon: 'expand',
    category: '压缩',
    description: 'Deflate 解压（输入 Base64）',
    params: [],
    execute: (input) => {
      try {
        const bytes = Uint8Array.from(atob(input.trim()), c => c.charCodeAt(0))
        return pako.inflate(bytes, { to: 'string' })
      } catch (e: any) { return `⚠ ${e.message}` }
    },
  },

  // ── 编码（补充） ──
  {
    id: 'to-base58',
    name: 'Base58 编码',
    icon: 'lock',
    category: '编码',
    description: 'Base58 编码（比特币格式）',
    params: [],
    execute: (input) => base58Encode(utf8ToBytes(input)),
  },
  {
    id: 'from-base58',
    name: 'Base58 解码',
    icon: 'lock_open',
    category: '编码',
    description: 'Base58 解码',
    params: [],
    execute: (input) => {
      try { return bytesToUtf8(base58Decode(input.trim())) }
      catch { return '⚠ 无效的 Base58' }
    },
  },
  {
    id: 'to-punycode',
    name: 'Punycode 编码',
    icon: 'language',
    category: '编码',
    description: '国际化域名编码',
    params: [],
    execute: (input) => {
      try {
        const url = new URL(`http://${input}`)
        return url.hostname
      } catch {
        // 逐行处理
        return input.split('\n').map(line => {
          try { return new URL(`http://${line.trim()}`).hostname }
          catch { return line }
        }).join('\n')
      }
    },
  },

  // ── 数据格式（补充） ──
  {
    id: 'hex-dump',
    name: '十六进制 Dump',
    icon: 'grid_on',
    category: '数据格式',
    description: '生成十六进制 Dump 视图',
    params: [
      { key: 'width', label: '每行字节', type: 'number', default: 16 },
    ],
    execute: (input, p) => {
      const bytes = utf8ToBytes(input)
      const width = Math.max(1, Number(p.width) || 16)
      const lines: string[] = []
      for (let i = 0; i < bytes.length; i += width) {
        const offset = i.toString(16).padStart(8, '0')
        const chunk = bytes.slice(i, i + width)
        const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ')
        const ascii = Array.from(chunk).map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join('')
        lines.push(`${offset}  ${hex.padEnd(width * 3 - 1)}  |${ascii}|`)
      }
      return lines.join('\n')
    },
  },
  {
    id: 'xml-beautify',
    name: 'XML 美化',
    icon: 'code',
    category: '数据格式',
    description: '格式化 XML',
    params: [
      { key: 'indent', label: '缩进空格', type: 'number', default: 2 },
    ],
    execute: (input, p) => {
      const indent = Number(p.indent) || 2
      let formatted = '', pad = 0
      const lines = input.replace(/(>)(<)(\/*)/g, '$1\n$2$3').split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (trimmed.startsWith('</')) pad--
        formatted += ' '.repeat(Math.max(0, pad) * indent) + trimmed + '\n'
        if (trimmed.match(/^<[^/!?].*[^/]>$/) && !trimmed.startsWith('<?')) pad++
      }
      return formatted.trimEnd()
    },
  },

  // ── 分析工具 ──
  {
    id: 'entropy',
    name: '熵计算',
    icon: 'insights',
    category: '分析',
    description: '计算 Shannon 信息熵',
    params: [],
    execute: (input) => {
      if (!input) return '0'
      const freq = new Map<string, number>()
      for (const c of input) freq.set(c, (freq.get(c) || 0) + 1)
      const len = input.length
      let entropy = 0
      for (const count of freq.values()) {
        const p = count / len
        entropy -= p * Math.log2(p)
      }
      return `Shannon 熵: ${entropy.toFixed(6)} bits/字符\n总信息量: ${(entropy * len).toFixed(2)} bits\n字符种类: ${freq.size}\n文本长度: ${len}`
    },
  },
  {
    id: 'char-frequency',
    name: '字频分析',
    icon: 'bar_chart',
    category: '分析',
    description: '统计每个字符出现频率',
    params: [
      { key: 'top', label: '显示前N', type: 'number', default: 30 },
    ],
    execute: (input, p) => {
      const freq = new Map<string, number>()
      for (const c of input) freq.set(c, (freq.get(c) || 0) + 1)
      const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1])
      const top = Math.max(1, Number(p.top) || 30)
      const len = input.length
      return sorted.slice(0, top).map(([char, count]) => {
        const display = char === ' ' ? '(空格)' : char === '\n' ? '(换行)' : char === '\t' ? '(Tab)' : char
        const pct = ((count / len) * 100).toFixed(1)
        const bar = '█'.repeat(Math.round(count / sorted[0][1] * 20))
        return `${display.padEnd(6)} ${String(count).padStart(5)} (${pct.padStart(5)}%) ${bar}`
      }).join('\n')
    },
  },
  {
    id: 'random-bytes',
    name: '随机字节',
    icon: 'casino',
    category: '分析',
    description: '生成随机字节（Hex）',
    params: [
      { key: 'count', label: '字节数', type: 'number', default: 32 },
      { key: 'format', label: '格式', type: 'select', default: 'hex', options: [
        { label: 'Hex', value: 'hex' }, { label: 'Base64', value: 'base64' }, { label: '十进制', value: 'dec' },
      ]},
    ],
    execute: (_input, p) => {
      const count = Math.max(1, Math.min(1024, Number(p.count) || 32))
      const bytes = new Uint8Array(count)
      crypto.getRandomValues(bytes)
      if (p.format === 'base64') return btoa(String.fromCharCode(...bytes))
      if (p.format === 'dec') return Array.from(bytes).join(' ')
      return hexEncode(bytes, ' ')
    },
  },
  {
    id: 'uuid-gen',
    name: '生成 UUID',
    icon: 'badge',
    category: '分析',
    description: '生成 UUID v4',
    params: [
      { key: 'count', label: '数量', type: 'number', default: 1 },
      { key: 'upper', label: '大写', type: 'boolean', default: false },
    ],
    execute: (_input, p) => {
      const count = Math.max(1, Math.min(100, Number(p.count) || 1))
      const uuids: string[] = []
      for (let i = 0; i < count; i++) {
        const bytes = new Uint8Array(16)
        crypto.getRandomValues(bytes)
        bytes[6] = (bytes[6] & 0x0f) | 0x40
        bytes[8] = (bytes[8] & 0x3f) | 0x80
        const hex = hexEncode(bytes)
        const uuid = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
        uuids.push(p.upper ? uuid.toUpperCase() : uuid)
      }
      return uuids.join('\n')
    },
  },
  {
    id: 'jwt-decode',
    name: 'JWT 解码',
    icon: 'token',
    category: '数据格式',
    description: '解码 JWT Token',
    params: [],
    execute: (input) => {
      try {
        const parts = input.trim().split('.')
        if (parts.length !== 3) return '⚠ 无效的 JWT（需要3段）'
        const pad = (s: string) => s + '='.repeat((4 - s.length % 4) % 4)
        const header = JSON.parse(atob(pad(parts[0].replace(/-/g,'+').replace(/_/g,'/'))))
        const payload = JSON.parse(atob(pad(parts[1].replace(/-/g,'+').replace(/_/g,'/'))))
        return `── Header ──\n${JSON.stringify(header, null, 2)}\n\n── Payload ──\n${JSON.stringify(payload, null, 2)}\n\n── Signature ──\n${parts[2]}`
      } catch { return '⚠ JWT 解码失败' }
    },
  },
  {
    id: 'timestamp-conv',
    name: '时间戳转换',
    icon: 'schedule',
    category: '数据格式',
    description: '时间戳 ↔ 日期',
    params: [],
    execute: (input) => {
      const trimmed = input.trim()
      const num = Number(trimmed)
      if (!isNaN(num) && trimmed.length > 0) {
        const ts = num > 1e12 ? num : num * 1000
        const d = new Date(ts)
        return `时间戳: ${num}\n毫秒: ${ts}\nUTC: ${d.toUTCString()}\n本地: ${d.toLocaleString('zh-CN')}\nISO: ${d.toISOString()}`
      }
      const d = new Date(trimmed)
      if (isNaN(d.getTime())) return '⚠ 无法解析输入'
      return `秒: ${Math.floor(d.getTime() / 1000)}\n毫秒: ${d.getTime()}\nUTC: ${d.toUTCString()}\nISO: ${d.toISOString()}`
    },
  },

  // ── 文本转换 ──
  {
    id: 'to-camel-case',
    name: '转驼峰命名',
    icon: 'text_rotation_none',
    category: '文本',
    description: 'snake_case / kebab-case → camelCase',
    params: [
      { key: 'pascal', label: 'PascalCase', type: 'boolean', default: false },
    ],
    execute: (input, p) => {
      return input.split('\n').map(line => {
        const result = line.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
        if (p.pascal && result.length > 0) return result[0].toUpperCase() + result.slice(1)
        return result.length > 0 ? result[0].toLowerCase() + result.slice(1) : result
      }).join('\n')
    },
  },
  {
    id: 'to-snake-case',
    name: '转蛇形命名',
    icon: 'text_rotation_none',
    category: '文本',
    description: 'camelCase / kebab-case → snake_case',
    params: [],
    execute: (input) => input.split('\n').map(line =>
      line.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase()
    ).join('\n'),
  },
  {
    id: 'to-kebab-case',
    name: '转短横线命名',
    icon: 'text_rotation_none',
    category: '文本',
    description: 'camelCase / snake_case → kebab-case',
    params: [],
    execute: (input) => input.split('\n').map(line =>
      line.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[_\s]+/g, '-').toLowerCase()
    ).join('\n'),
  },
  {
    id: 'escape-string',
    name: '字符串转义',
    icon: 'format_quote',
    category: '文本',
    description: '转义特殊字符（\\n \\t \\" 等）',
    params: [
      { key: 'mode', label: '模式', type: 'select', default: 'escape', options: [
        { label: '转义', value: 'escape' }, { label: '反转义', value: 'unescape' },
      ]},
    ],
    execute: (input, p) => {
      if (p.mode === 'unescape') {
        return input.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r')
          .replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\')
      }
      return input.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t')
        .replace(/\r/g, '\\r').replace(/"/g, '\\"')
    },
  },
  {
    id: 'split-join',
    name: '分割/合并',
    icon: 'call_split',
    category: '文本',
    description: '按分隔符分割后用新分隔符合并',
    params: [
      { key: 'splitBy', label: '分割符', type: 'text', default: ',' },
      { key: 'joinBy', label: '合并符', type: 'text', default: '\\n' },
    ],
    execute: (input, p) => {
      const splitBy = (p.splitBy || ',').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
      const joinBy = (p.joinBy || '\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
      return input.split(splitBy).map(s => s.trim()).join(joinBy)
    },
  },
  {
    id: 'pad-lines',
    name: '行填充',
    icon: 'format_indent_increase',
    category: '文本',
    description: '在每行前后添加文本',
    params: [
      { key: 'prefix', label: '前缀', type: 'text', default: '' },
      { key: 'suffix', label: '后缀', type: 'text', default: '' },
    ],
    execute: (input, p) => input.split('\n').map(line => `${p.prefix || ''}${line}${p.suffix || ''}`).join('\n'),
  },
  {
    id: 'head-tail',
    name: '取首/尾行',
    icon: 'vertical_align_center',
    category: '文本',
    description: '取前N行或后N行',
    params: [
      { key: 'mode', label: '模式', type: 'select', default: 'head', options: [
        { label: '前N行', value: 'head' }, { label: '后N行', value: 'tail' },
      ]},
      { key: 'n', label: '行数', type: 'number', default: 10 },
    ],
    execute: (input, p) => {
      const lines = input.split('\n')
      const n = Math.max(1, Number(p.n) || 10)
      return p.mode === 'tail' ? lines.slice(-n).join('\n') : lines.slice(0, n).join('\n')
    },
  },
  {
    id: 'reverse-lines',
    name: '反转行序',
    icon: 'swap_vert',
    category: '文本',
    description: '将所有行倒序排列',
    params: [],
    execute: (input) => input.split('\n').reverse().join('\n'),
  },
  {
    id: 'number-lines',
    name: '行号过滤',
    icon: 'filter_alt',
    category: '文本',
    description: '只保留指定行号范围',
    params: [
      { key: 'from', label: '起始行', type: 'number', default: 1 },
      { key: 'to', label: '结束行', type: 'number', default: 10 },
    ],
    execute: (input, p) => {
      const lines = input.split('\n')
      const from = Math.max(1, Number(p.from) || 1)
      const to = Math.min(lines.length, Number(p.to) || 10)
      return lines.slice(from - 1, to).join('\n')
    },
  },

  // ── 数据格式（补充2） ──
  {
    id: 'json-to-csv',
    name: 'JSON → CSV',
    icon: 'table_chart',
    category: '数据格式',
    description: 'JSON 数组转 CSV',
    params: [
      { key: 'sep', label: '分隔符', type: 'text', default: ',' },
    ],
    execute: (input, p) => {
      try {
        const arr = JSON.parse(input.trim())
        if (!Array.isArray(arr) || arr.length === 0) return '⚠ 需要非空 JSON 数组'
        const sep = p.sep || ','
        const keys = Object.keys(arr[0])
        const header = keys.join(sep)
        const rows = arr.map((obj: any) => keys.map(k => {
          const v = String(obj[k] ?? '')
          return v.includes(sep) || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
        }).join(sep))
        return [header, ...rows].join('\n')
      } catch { return '⚠ JSON 解析失败' }
    },
  },
  {
    id: 'json-to-yaml',
    name: 'JSON → YAML',
    icon: 'data_object',
    category: '数据格式',
    description: '简易 JSON 转 YAML',
    params: [],
    execute: (input) => {
      try {
        const obj = JSON.parse(input.trim())
        const toYaml = (val: any, indent: number): string => {
          const pad = '  '.repeat(indent)
          if (val === null) return 'null'
          if (typeof val === 'string') return val.includes('\n') ? `|\n${val.split('\n').map(l => pad + '  ' + l).join('\n')}` : val.includes(':') || val.includes('#') ? `"${val}"` : val
          if (typeof val !== 'object') return String(val)
          if (Array.isArray(val)) return val.length === 0 ? '[]' : '\n' + val.map(v => `${pad}- ${toYaml(v, indent + 1).trimStart()}`).join('\n')
          const entries = Object.entries(val)
          if (entries.length === 0) return '{}'
          return '\n' + entries.map(([k, v]) => `${pad}${k}: ${toYaml(v, indent + 1).trimStart()}`).join('\n')
        }
        return toYaml(obj, 0).trimStart()
      } catch { return '⚠ JSON 解析失败' }
    },
  },
  {
    id: 'json-path',
    name: 'JSON 路径提取',
    icon: 'account_tree',
    category: '数据格式',
    description: '用点号路径提取 JSON 值（如 data.items.0.name）',
    params: [
      { key: 'path', label: '路径', type: 'text', default: '' },
    ],
    execute: (input, p) => {
      try {
        const obj = JSON.parse(input.trim())
        const path = (p.path || '').split('.').filter(Boolean)
        let current: any = obj
        for (const key of path) {
          if (current == null) return '⚠ 路径不存在'
          current = current[key] ?? current[Number(key)]
        }
        return typeof current === 'object' ? JSON.stringify(current, null, 2) : String(current ?? 'undefined')
      } catch { return '⚠ JSON 解析失败' }
    },
  },
  {
    id: 'querystring-parse',
    name: 'URL 参数解析',
    icon: 'link',
    category: '数据格式',
    description: '解析 URL query string 为键值对',
    params: [],
    execute: (input) => {
      try {
        let qs = input.trim()
        if (qs.includes('?')) qs = qs.split('?').slice(1).join('?')
        qs = qs.replace(/^#.*/, '')
        const params = new URLSearchParams(qs)
        const result: string[] = []
        params.forEach((v, k) => result.push(`${k} = ${decodeURIComponent(v)}`))
        return result.length > 0 ? result.join('\n') : '⚠ 未找到参数'
      } catch { return '⚠ 解析失败' }
    },
  },
  {
    id: 'querystring-build',
    name: 'URL 参数构建',
    icon: 'link',
    category: '数据格式',
    description: '从键值对构建 query string（每行 key=value）',
    params: [],
    execute: (input) => {
      const params = new URLSearchParams()
      for (const line of input.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx === -1) { params.append(trimmed, ''); continue }
        params.append(trimmed.slice(0, eqIdx).trim(), trimmed.slice(eqIdx + 1).trim())
      }
      return params.toString()
    },
  },

  // ── 编码（补充3） ──
  {
    id: 'to-base64url',
    name: 'Base64URL 编码',
    icon: 'lock',
    category: '编码',
    description: 'URL 安全的 Base64 编码',
    params: [],
    execute: (input) => btoa(unescape(encodeURIComponent(input))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  },
  {
    id: 'from-base64url',
    name: 'Base64URL 解码',
    icon: 'lock_open',
    category: '编码',
    description: 'URL 安全的 Base64 解码',
    params: [],
    execute: (input) => {
      try {
        let s = input.trim().replace(/-/g, '+').replace(/_/g, '/')
        while (s.length % 4) s += '='
        return decodeURIComponent(escape(atob(s)))
      } catch { return '⚠ 解码失败' }
    },
  },

  // ── 哈希（补充2） ──
  {
    id: 'bcrypt-like-hash',
    name: 'PBKDF2 哈希',
    icon: 'fingerprint',
    category: '哈希',
    description: 'PBKDF2 密钥派生（SHA-256）',
    params: [
      { key: 'salt', label: '盐值', type: 'text', default: 'salt' },
      { key: 'iterations', label: '迭代次数', type: 'number', default: 10000 },
      { key: 'keySize', label: '密钥长度(字)', type: 'number', default: 8 },
    ],
    execute: (input, p) => {
      const salt = p.salt || 'salt'
      const iterations = Math.max(1, Number(p.iterations) || 10000)
      const keySize = Math.max(1, Number(p.keySize) || 8)
      const derived = CryptoJS.PBKDF2(input, salt, { keySize, iterations, hasher: CryptoJS.algo.SHA256 })
      return derived.toString()
    },
  },
  {
    id: 'hmac-md5',
    name: 'HMAC-MD5',
    icon: 'enhanced_encryption',
    category: '哈希',
    description: 'HMAC-MD5 消息认证码',
    params: [
      { key: 'key', label: '密钥', type: 'text', default: 'secret' },
    ],
    execute: (input, p) => CryptoJS.HmacMD5(input, p.key || 'secret').toString(),
  },
  {
    id: 'hmac-sha1',
    name: 'HMAC-SHA1',
    icon: 'enhanced_encryption',
    category: '哈希',
    description: 'HMAC-SHA1 消息认证码',
    params: [
      { key: 'key', label: '密钥', type: 'text', default: 'secret' },
    ],
    execute: (input, p) => CryptoJS.HmacSHA1(input, p.key || 'secret').toString(),
  },
  {
    id: 'hmac-sha512',
    name: 'HMAC-SHA512',
    icon: 'enhanced_encryption',
    category: '哈希',
    description: 'HMAC-SHA512 消息认证码',
    params: [
      { key: 'key', label: '密钥', type: 'text', default: 'secret' },
    ],
    execute: (input, p) => CryptoJS.HmacSHA512(input, p.key || 'secret').toString(),
  },

  // ── 实用工具 ──
  {
    id: 'color-convert',
    name: '颜色转换',
    icon: 'palette',
    category: '分析',
    description: 'HEX ↔ RGB ↔ HSL 颜色转换',
    params: [],
    execute: (input) => {
      const trimmed = input.trim()
      // HEX → RGB/HSL
      const hexMatch = trimmed.match(/^#?([0-9a-f]{3,8})$/i)
      if (hexMatch) {
        let hex = hexMatch[1]
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]
        if (hex.length === 4) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3]
        const r = parseInt(hex.slice(0,2), 16), g = parseInt(hex.slice(2,4), 16), b = parseInt(hex.slice(4,6), 16)
        const a = hex.length >= 8 ? parseInt(hex.slice(6,8), 16) / 255 : 1
        const [h, s, l] = rgbToHsl(r, g, b)
        let result = `HEX: #${hex.slice(0,6).toUpperCase()}\nRGB: rgb(${r}, ${g}, ${b})\nHSL: hsl(${h}, ${s}%, ${l}%)`
        if (a < 1) result += `\nAlpha: ${a.toFixed(2)}`
        return result
      }
      // RGB → HEX/HSL
      const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i)
      if (rgbMatch) {
        const r = Number(rgbMatch[1]), g = Number(rgbMatch[2]), b = Number(rgbMatch[3])
        const hex = `#${((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1).toUpperCase()}`
        const [h, s, l] = rgbToHsl(r, g, b)
        return `HEX: ${hex}\nRGB: rgb(${r}, ${g}, ${b})\nHSL: hsl(${h}, ${s}%, ${l}%)`
      }
      return '⚠ 请输入 HEX（如 #ff6600）或 RGB（如 rgb(255,102,0)）'
    },
  },
  {
    id: 'lorem-ipsum',
    name: 'Lorem Ipsum',
    icon: 'notes',
    category: '分析',
    description: '生成占位文本',
    params: [
      { key: 'paragraphs', label: '段落数', type: 'number', default: 3 },
    ],
    execute: (_input, p) => {
      const sentences = [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
        'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
        'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.',
        'Nulla facilisi morbi tempus iaculis urna id volutpat lacus.',
        'Viverra accumsan in nisl nisi scelerisque eu ultrices vitae auctor.',
        'Eget nulla facilisi etiam dignissim diam quis enim lobortis.',
        'Amet consectetur adipiscing elit pellentesque habitant morbi tristique senectus.',
        'Turpis egestas integer eget aliquet nibh praesent tristique magna.',
      ]
      const count = Math.max(1, Math.min(20, Number(p.paragraphs) || 3))
      const paragraphs: string[] = []
      for (let i = 0; i < count; i++) {
        const n = 3 + Math.floor(Math.random() * 4)
        const para: string[] = []
        for (let j = 0; j < n; j++) para.push(sentences[Math.floor(Math.random() * sentences.length)])
        paragraphs.push(para.join(' '))
      }
      return paragraphs.join('\n\n')
    },
  },
  {
    id: 'text-stats',
    name: '文本统计',
    icon: 'analytics',
    category: '分析',
    description: '详细的文本统计信息',
    params: [],
    execute: (input) => {
      const chars = input.length
      const charsNoSpace = input.replace(/\s/g, '').length
      const words = input.trim() ? input.trim().split(/\s+/).length : 0
      const lines = input.split('\n').length
      const sentences = input.split(/[.!?。！？]+/).filter(s => s.trim()).length
      const bytes = new TextEncoder().encode(input).length
      const cjk = (input.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length
      return `字符数: ${chars}\n字符数(无空格): ${charsNoSpace}\n单词数: ${words}\n中文字数: ${cjk}\n行数: ${lines}\n句子数: ${sentences}\n字节数: ${bytes}\nUTF-8 大小: ${bytes > 1024 ? (bytes/1024).toFixed(2) + ' KB' : bytes + ' B'}`
    },
  },
  {
    id: 'diff-chars',
    name: '逐字符对比',
    icon: 'compare',
    category: '分析',
    description: '对比两段文本的差异（用 --- 分隔）',
    params: [],
    execute: (input) => {
      const parts = input.split(/^---$/m)
      if (parts.length < 2) return '⚠ 请用 --- 分隔两段文本'
      const a = parts[0].trimEnd(), b = parts.slice(1).join('---').trimStart()
      const result: string[] = []
      let i = 0, j = 0
      while (i < a.length || j < b.length) {
        if (i < a.length && j < b.length && a[i] === b[j]) {
          result.push(a[i]); i++; j++
        } else if (i < a.length && (j >= b.length || a[i] !== b[j])) {
          result.push(`[-${a[i]}-]`); i++
        } else {
          result.push(`[+${b[j]}+]`); j++
        }
      }
      return result.join('')
    },
  },
]

export const operationCategories = [...new Set(operations.map(o => o.category))]

/* ─── RGB → HSL 工具函数 ─── */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, Math.round(l * 100)]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

/* ─── 简易 MD5 实现 ─── */
function md5(string: string): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3]
    a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586)
    c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330)
    a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426)
    c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983)
    a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417)
    c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162)
    a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101)
    c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329)
    a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632)
    c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302)
    a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083)
    c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848)
    a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690)
    c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501)
    a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784)
    c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734)
    a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463)
    c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556)
    a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353)
    c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640)
    a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222)
    c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189)
    a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835)
    c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651)
    a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415)
    c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055)
    a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606)
    c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799)
    a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744)
    c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649)
    a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379)
    c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551)
    x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3])
  }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t))
    return add32((a << s) | (a >>> (32 - s)), b)
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | ((~b) & d), a, b, x, s, t) }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & (~d)), a, b, x, s, t) }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t) }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | (~d)), a, b, x, s, t) }
  function md51(s: string) {
    const n = s.length
    let state = [1732584193, -271733879, -1732584194, 271733878]
    let i: number
    for (i = 64; i <= n; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)))
    }
    s = s.substring(i - 64)
    const tail = new Array(16).fill(0)
    for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3)
    tail[i >> 2] |= 0x80 << ((i % 4) << 3)
    if (i > 55) { md5cycle(state, tail); tail.fill(0) }
    tail[14] = n * 8
    md5cycle(state, tail)
    return state
  }
  function md5blk(s: string) {
    const md5blks = new Array(16)
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24)
    }
    return md5blks
  }
  const hex_chr = '0123456789abcdef'.split('')
  function rhex(n: number) {
    let s = ''
    for (let j = 0; j < 4; j++) s += hex_chr[(n >> (j * 8 + 4)) & 0x0f] + hex_chr[(n >> (j * 8)) & 0x0f]
    return s
  }
  function add32(a: number, b: number) { return (a + b) & 0xFFFFFFFF }
  const x = md51(string)
  return rhex(x[0]) + rhex(x[1]) + rhex(x[2]) + rhex(x[3])
}

/* ─── SHA-1 纯 JS 实现 ─── */
function sha1(str: string): string {
  const bytes = utf8ToBytes(str)
  const len = bytes.length
  const bitLen = len * 8

  // 预处理：填充
  const padded = new Uint8Array(Math.ceil((len + 9) / 64) * 64)
  padded.set(bytes)
  padded[len] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 4, bitLen, false)

  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0
  const w = new Uint32Array(80)

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false)
    for (let i = 16; i < 80; i++) {
      const t = w[i-3] ^ w[i-8] ^ w[i-14] ^ w[i-16]
      w[i] = (t << 1) | (t >>> 31)
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4
    for (let i = 0; i < 80; i++) {
      let f: number, k: number
      if (i < 20) { f = (b & c) | ((~b) & d); k = 0x5A827999 }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1 }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC }
      else { f = b ^ c ^ d; k = 0xCA62C1D6 }
      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) | 0
      e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = temp
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0
  }
  return [h0, h1, h2, h3, h4].map(v => (v >>> 0).toString(16).padStart(8, '0')).join('')
}

/* ─── SHA-256 纯 JS 实现 ─── */
function sha256(str: string): string {
  const K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ])
  const bytes = utf8ToBytes(str)
  const len = bytes.length
  const padded = new Uint8Array(Math.ceil((len + 9) / 64) * 64)
  padded.set(bytes)
  padded[len] = 0x80
  const dv = new DataView(padded.buffer)
  dv.setUint32(padded.length - 4, len * 8, false)

  let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19
  const w = new Uint32Array(64)
  const rr = (v: number, n: number) => (v >>> n) | (v << (32 - n))

  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false)
    for (let i = 16; i < 64; i++) {
      const s0 = rr(w[i-15],7) ^ rr(w[i-15],18) ^ (w[i-15]>>>3)
      const s1 = rr(w[i-2],17) ^ rr(w[i-2],19) ^ (w[i-2]>>>10)
      w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0
    }
    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7
    for (let i = 0; i < 64; i++) {
      const S1 = rr(e,6) ^ rr(e,11) ^ rr(e,25)
      const ch = (e & f) ^ ((~e) & g)
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0
      const S0 = rr(a,2) ^ rr(a,13) ^ rr(a,22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) | 0
      h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0
    }
    h0=(h0+a)|0;h1=(h1+b)|0;h2=(h2+c)|0;h3=(h3+d)|0;h4=(h4+e)|0;h5=(h5+f)|0;h6=(h6+g)|0;h7=(h7+h)|0
  }
  return [h0,h1,h2,h3,h4,h5,h6,h7].map(v => (v>>>0).toString(16).padStart(8,'0')).join('')
}

/* ─── HMAC-SHA256 ─── */
function hmacSha256(key: string, message: string): string {
  const blockSize = 64
  let keyBytes = utf8ToBytes(key)
  if (keyBytes.length > blockSize) {
    // hash the key if too long (simplified: use sha256 hex then convert)
    const hashed = sha256(key)
    keyBytes = hexDecode(hashed)
  }
  const paddedKey = new Uint8Array(blockSize)
  paddedKey.set(keyBytes)

  const ipad = new Uint8Array(blockSize)
  const opad = new Uint8Array(blockSize)
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = paddedKey[i] ^ 0x36
    opad[i] = paddedKey[i] ^ 0x5c
  }

  const msgBytes = utf8ToBytes(message)
  const inner = new Uint8Array(blockSize + msgBytes.length)
  inner.set(ipad)
  inner.set(msgBytes, blockSize)
  const innerHash = sha256(bytesToUtf8(inner))

  const outer = new Uint8Array(blockSize + 32)
  outer.set(opad)
  outer.set(hexDecode(innerHash), blockSize)
  return sha256(bytesToUtf8(outer))
}

/* ─── Base32 编解码 ─── */
const B32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, result = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      bits -= 5
      result += B32_CHARS[(value >>> bits) & 31]
    }
  }
  if (bits > 0) result += B32_CHARS[(value << (5 - bits)) & 31]
  while (result.length % 8) result += '='
  return result
}

function base32Decode(str: string): Uint8Array {
  const clean = str.replace(/=+$/, '').toUpperCase()
  let bits = 0, value = 0
  const result: number[] = []
  for (const c of clean) {
    const idx = B32_CHARS.indexOf(c)
    if (idx === -1) throw new Error('Invalid Base32')
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bits -= 8
      result.push((value >>> bits) & 255)
    }
  }
  return new Uint8Array(result)
}

/* ─── Base58 编解码（Bitcoin 字母表） ─── */
const B58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
function base58Encode(bytes: Uint8Array): string {
  const digits = [0]
  for (const b of bytes) {
    let carry = b
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8
      digits[i] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0 }
  }
  let result = ''
  for (const b of bytes) { if (b === 0) result += B58_CHARS[0]; else break }
  for (let i = digits.length - 1; i >= 0; i--) result += B58_CHARS[digits[i]]
  return result
}
function base58Decode(str: string): Uint8Array {
  const bytes = [0]
  for (const c of str) {
    const idx = B58_CHARS.indexOf(c)
    if (idx === -1) throw new Error('Invalid Base58 character')
    let carry = idx
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58
      bytes[i] = carry & 0xff
      carry >>= 8
    }
    while (carry) { bytes.push(carry & 0xff); carry >>= 8 }
  }
  for (const c of str) { if (c === B58_CHARS[0]) bytes.push(0); else break }
  return new Uint8Array(bytes.reverse())
}

/* ─── AES-CBC 纯 JS 实现（128-bit） ─── */
function aesEncrypt(plaintext: string, keyStr: string, ivStr: string): string {
  try {
    const key = padOrTruncate(utf8ToBytes(keyStr), 16)
    const iv = padOrTruncate(utf8ToBytes(ivStr), 16)
    const data = pkcs7Pad(utf8ToBytes(plaintext), 16)
    const expandedKey = aesExpandKey(key)
    const result = new Uint8Array(data.length)
    let prev = iv

    for (let i = 0; i < data.length; i += 16) {
      const block = new Uint8Array(16)
      for (let j = 0; j < 16; j++) block[j] = data[i + j] ^ prev[j]
      const encrypted = aesEncryptBlock(block, expandedKey)
      result.set(encrypted, i)
      prev = encrypted
    }
    return btoa(String.fromCharCode(...result))
  } catch (e: any) { return `⚠ ${e.message}` }
}

function aesDecrypt(cipherB64: string, keyStr: string, ivStr: string): string {
  try {
    const key = padOrTruncate(utf8ToBytes(keyStr), 16)
    const iv = padOrTruncate(utf8ToBytes(ivStr), 16)
    const data = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0))
    if (data.length % 16 !== 0) return '⚠ 密文长度无效'
    const expandedKey = aesExpandKey(key)
    const result = new Uint8Array(data.length)
    let prev = iv

    for (let i = 0; i < data.length; i += 16) {
      const block = data.slice(i, i + 16)
      const decrypted = aesDecryptBlock(block, expandedKey)
      for (let j = 0; j < 16; j++) result[i + j] = decrypted[j] ^ prev[j]
      prev = block
    }
    return bytesToUtf8(pkcs7Unpad(result))
  } catch (e: any) { return `⚠ ${e.message}` }
}

function padOrTruncate(arr: Uint8Array, len: number): Uint8Array {
  const r = new Uint8Array(len)
  r.set(arr.slice(0, len))
  return r
}

function pkcs7Pad(data: Uint8Array, blockSize: number): Uint8Array {
  const pad = blockSize - (data.length % blockSize)
  const result = new Uint8Array(data.length + pad)
  result.set(data)
  for (let i = data.length; i < result.length; i++) result[i] = pad
  return result
}

function pkcs7Unpad(data: Uint8Array): Uint8Array {
  const pad = data[data.length - 1]
  if (pad > 16 || pad === 0) throw new Error('无效的填充')
  return data.slice(0, data.length - pad)
}

// AES S-Box
const SBOX = new Uint8Array([
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
])
const INV_SBOX = new Uint8Array(256)
for (let i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i

const RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36]

function aesExpandKey(key: Uint8Array): Uint32Array {
  const Nk = 4, Nr = 10, w = new Uint32Array(4 * (Nr + 1))
  for (let i = 0; i < Nk; i++) w[i] = (key[4*i]<<24)|(key[4*i+1]<<16)|(key[4*i+2]<<8)|key[4*i+3]
  for (let i = Nk; i < w.length; i++) {
    let t = w[i - 1]
    if (i % Nk === 0) {
      t = ((t << 8) | (t >>> 24))
      t = (SBOX[(t>>>24)&0xff]<<24)|(SBOX[(t>>>16)&0xff]<<16)|(SBOX[(t>>>8)&0xff]<<8)|SBOX[t&0xff]
      t ^= (RCON[i/Nk - 1] << 24)
    }
    w[i] = w[i - Nk] ^ t
  }
  return w
}

function aesEncryptBlock(block: Uint8Array, w: Uint32Array): Uint8Array {
  const s = new Uint8Array(16)
  s.set(block)
  addRoundKey(s, w, 0)
  for (let r = 1; r <= 10; r++) {
    subBytes(s); shiftRows(s)
    if (r < 10) mixColumns(s)
    addRoundKey(s, w, r)
  }
  return s
}

function aesDecryptBlock(block: Uint8Array, w: Uint32Array): Uint8Array {
  const s = new Uint8Array(16)
  s.set(block)
  addRoundKey(s, w, 10)
  for (let r = 9; r >= 0; r--) {
    invShiftRows(s); invSubBytes(s)
    addRoundKey(s, w, r)
    if (r > 0) invMixColumns(s)
  }
  return s
}

function addRoundKey(s: Uint8Array, w: Uint32Array, round: number) {
  for (let c = 0; c < 4; c++) {
    const wv = w[round * 4 + c]
    s[c*4] ^= (wv >>> 24) & 0xff; s[c*4+1] ^= (wv >>> 16) & 0xff
    s[c*4+2] ^= (wv >>> 8) & 0xff; s[c*4+3] ^= wv & 0xff
  }
}
function subBytes(s: Uint8Array) { for (let i = 0; i < 16; i++) s[i] = SBOX[s[i]] }
function invSubBytes(s: Uint8Array) { for (let i = 0; i < 16; i++) s[i] = INV_SBOX[s[i]] }
function shiftRows(s: Uint8Array) {
  let t: number
  t=s[1]; s[1]=s[5]; s[5]=s[9]; s[9]=s[13]; s[13]=t
  t=s[2]; s[2]=s[10]; s[10]=t; t=s[6]; s[6]=s[14]; s[14]=t
  t=s[15]; s[15]=s[11]; s[11]=s[7]; s[7]=s[3]; s[3]=t
}
function invShiftRows(s: Uint8Array) {
  let t: number
  t=s[13]; s[13]=s[9]; s[9]=s[5]; s[5]=s[1]; s[1]=t
  t=s[2]; s[2]=s[10]; s[10]=t; t=s[6]; s[6]=s[14]; s[14]=t
  t=s[3]; s[3]=s[7]; s[7]=s[11]; s[11]=s[15]; s[15]=t
}
function gmul(a: number, b: number): number {
  let p = 0
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a
    const hi = a & 0x80
    a = (a << 1) & 0xff
    if (hi) a ^= 0x1b
    b >>= 1
  }
  return p
}
function mixColumns(s: Uint8Array) {
  for (let c = 0; c < 4; c++) {
    const i = c * 4
    const a = s[i], b = s[i+1], cc = s[i+2], d = s[i+3]
    s[i]   = gmul(a,2)^gmul(b,3)^cc^d
    s[i+1] = a^gmul(b,2)^gmul(cc,3)^d
    s[i+2] = a^b^gmul(cc,2)^gmul(d,3)
    s[i+3] = gmul(a,3)^b^cc^gmul(d,2)
  }
}
function invMixColumns(s: Uint8Array) {
  for (let c = 0; c < 4; c++) {
    const i = c * 4
    const a = s[i], b = s[i+1], cc = s[i+2], d = s[i+3]
    s[i]   = gmul(a,14)^gmul(b,11)^gmul(cc,13)^gmul(d,9)
    s[i+1] = gmul(a,9)^gmul(b,14)^gmul(cc,11)^gmul(d,13)
    s[i+2] = gmul(a,13)^gmul(b,9)^gmul(cc,14)^gmul(d,11)
    s[i+3] = gmul(a,11)^gmul(b,13)^gmul(cc,9)^gmul(d,14)
  }
}

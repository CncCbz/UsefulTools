<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const input = ref('https://example.com')
const size = ref(256)
const canvasRef = ref<HTMLCanvasElement>()

// 简易 QR 码生成 — 使用 Canvas 绘制
// 利用一个轻量的 QR 编码算法
// 这里用 API 方式通过 canvas 绘制文本二维码的简化方案
// 实际使用 QR 编码矩阵

function generateQR() {
  const canvas = canvasRef.value
  if (!canvas || !input.value.trim()) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = size.value
  canvas.height = size.value

  // 使用简易的 QR 矩阵生成
  const matrix = encodeQR(input.value.trim())
  const cellSize = size.value / matrix.length

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size.value, size.value)

  ctx.fillStyle = '#000000'
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (matrix[y][x]) {
        ctx.fillRect(x * cellSize, y * cellSize, cellSize + 0.5, cellSize + 0.5)
      }
    }
  }
}

// 最小 QR Code 编码器 (Version 1, Mode Byte, ECC L)
function encodeQR(text: string): boolean[][] {
  const size = 21 // Version 1
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  // 定位图案
  function drawFinder(cx: number, cy: number) {
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const x = cx + dx, y = cy + dy
        if (x < 0 || x >= size || y < 0 || y >= size) continue
        const ring = Math.max(Math.abs(dx), Math.abs(dy))
        matrix[y][x] = ring !== 2
        reserved[y][x] = true
      }
    }
    // 分隔符
    for (let i = -4; i <= 4; i++) {
      for (const [dx, dy] of [[i, -4], [i, 4], [-4, i], [4, i]]) {
        const x = cx + dx, y = cy + dy
        if (x >= 0 && x < size && y >= 0 && y < size) {
          reserved[y][x] = true
        }
      }
    }
  }

  drawFinder(3, 3)
  drawFinder(size - 4, 3)
  drawFinder(3, size - 4)

  // 定时图案
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0
    matrix[i][6] = i % 2 === 0
    reserved[6][i] = true
    reserved[i][6] = true
  }

  // 暗模块
  matrix[size - 8][8] = true
  reserved[size - 8][8] = true

  // 格式信息区域保留
  for (let i = 0; i < 9; i++) {
    reserved[8][i] = true
    reserved[i][8] = true
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true
    reserved[size - 1 - i][8] = true
  }

  // 数据编码 (简化: byte mode, ECC L)
  const bytes = new TextEncoder().encode(text)
  const dataBits: number[] = []

  // Mode indicator (0100 = byte)
  dataBits.push(0, 1, 0, 0)
  // Character count (8 bits for V1)
  for (let i = 7; i >= 0; i--) dataBits.push((bytes.length >> i) & 1)
  // Data
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) dataBits.push((b >> i) & 1)
  }
  // Terminator
  while (dataBits.length < 152) dataBits.push(0) // V1-L: 19 data codewords = 152 bits

  // 填充到数据容量
  const totalBits = 26 * 8 // V1 total codewords
  // Pad with alternating 0xEC, 0x11
  let padIdx = 0
  while (dataBits.length < totalBits) {
    const padByte = padIdx % 2 === 0 ? 0xEC : 0x11
    for (let i = 7; i >= 0; i--) dataBits.push((padByte >> i) & 1)
    padIdx++
  }

  // 放置数据位
  let bitIdx = 0
  let upward = true
  for (let right = size - 1; right >= 0; right -= 2) {
    if (right === 6) right = 5 // 跳过定时列
    const cols = [right, right - 1].filter(c => c >= 0)
    const rows = upward ? Array.from({ length: size }, (_, i) => size - 1 - i) : Array.from({ length: size }, (_, i) => i)
    for (const row of rows) {
      for (const col of cols) {
        if (!reserved[row][col] && bitIdx < dataBits.length) {
          matrix[row][col] = dataBits[bitIdx] === 1
          bitIdx++
        }
      }
    }
    upward = !upward
  }

  // 写入格式信息 (Mask 0, ECC L) = 0x77C4
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0]
  // 水平
  const hPos = [0, 1, 2, 3, 4, 5, 7, 8, size - 8, size - 7, size - 6, size - 5, size - 4, size - 3, size - 2]
  for (let i = 0; i < 15; i++) matrix[8][hPos[i]] = formatBits[i] === 1
  // 垂直
  const vPos = [size - 1, size - 2, size - 3, size - 4, size - 5, size - 6, size - 7, 8, 7, 5, 4, 3, 2, 1, 0]
  for (let i = 0; i < 15; i++) matrix[vPos[i]][8] = formatBits[i] === 1

  // 应用掩码 0: (row + col) % 2 === 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!reserved[y][x] && (y + x) % 2 === 0) {
        matrix[y][x] = !matrix[y][x]
      }
    }
  }

  // 添加静默区
  const quiet = 2
  const final: boolean[][] = Array.from({ length: size + quiet * 2 }, () => Array(size + quiet * 2).fill(false))
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      final[y + quiet][x + quiet] = matrix[y][x]
    }
  }
  return final
}

watch([input, size], () => generateQR())
onMounted(() => generateQR())

function download() {
  const canvas = canvasRef.value
  if (!canvas) return
  const link = document.createElement('a')
  link.download = 'qrcode.png'
  link.href = canvas.toDataURL('image/png')
  link.click()
}
</script>

<template>
  <div class="flex flex-col h-full gap-5">
    <div class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-icons text-primary text-lg">qr_code_2</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">QR 码生成器</span>
      </div>
      <textarea v-model="input" rows="3" placeholder="输入 URL 或文本..."
        class="w-full bg-bg-dark text-gray-100 border-4 border-black rounded-lg px-4 py-3 font-mono text-sm shadow-hard focus:border-primary focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] transition-all outline-none placeholder-gray-600 resize-none" />
      <div class="flex items-center gap-3 mt-3">
        <span class="text-xs text-gray-500">尺寸:</span>
        <input v-model.number="size" type="range" min="128" max="512" step="64" class="w-32 accent-primary" />
        <span class="font-mono text-xs text-gray-400">{{ size }}px</span>
      </div>
    </div>

    <div class="flex-1 flex flex-col items-center justify-center gap-4">
      <div class="bg-white p-4 rounded-xl border-4 border-black shadow-hard">
        <canvas ref="canvasRef" :width="size" :height="size" class="block"></canvas>
      </div>
      <button @click="download"
        class="h-10 px-5 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-sm flex items-center gap-2">
        <span class="material-icons text-lg">download</span> 下载 PNG
      </button>
    </div>
  </div>
</template>

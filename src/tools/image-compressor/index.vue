<script setup lang="ts">
import { ref } from 'vue'

const quality = ref(80)
const format = ref<'jpeg' | 'png' | 'webp'>('jpeg')
const originalFile = ref<File | null>(null)
const originalUrl = ref('')
const compressedUrl = ref('')
const originalSize = ref(0)
const compressedSize = ref(0)
const processing = ref(false)

function handleDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) processFile(file)
}

function handleFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) processFile(file)
}

function processFile(file: File) {
  originalFile.value = file
  originalSize.value = file.size
  originalUrl.value = URL.createObjectURL(file)
  compress()
}

async function compress() {
  if (!originalFile.value) return
  processing.value = true

  const img = new Image()
  img.src = originalUrl.value
  await new Promise(resolve => { img.onload = resolve })

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  const mimeType = `image/${format.value}`
  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, mimeType, quality.value / 100)
  )

  if (blob) {
    if (compressedUrl.value) URL.revokeObjectURL(compressedUrl.value)
    compressedUrl.value = URL.createObjectURL(blob)
    compressedSize.value = blob.size
  }
  processing.value = false
}

function download() {
  if (!compressedUrl.value) return
  const link = document.createElement('a')
  link.download = `compressed.${format.value}`
  link.href = compressedUrl.value
  link.click()
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const ratio = () => originalSize.value ? Math.round((1 - compressedSize.value / originalSize.value) * 100) : 0
</script>

<template>
  <div class="flex flex-col h-full gap-5">
    <!-- 控制区 -->
    <div class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-icons text-primary text-lg">photo_size_select_large</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">图片压缩/转换</span>
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex gap-2">
          <button v-for="f in (['jpeg', 'png', 'webp'] as const)" :key="f" @click="format = f; originalFile && compress()"
            class="h-9 px-3 font-bold border-2 border-black rounded text-xs transition-all uppercase"
            :class="format === f ? 'bg-primary text-black shadow-none translate-x-0.5 translate-y-0.5' : 'bg-bg-dark text-gray-400 shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5'">
            {{ f }}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">质量:</span>
          <input v-model.number="quality" type="range" min="10" max="100" class="w-28 accent-primary"
            @change="originalFile && compress()" />
          <span class="font-mono text-xs text-gray-400">{{ quality }}%</span>
        </div>
      </div>
    </div>

    <!-- 拖拽区 / 预览 -->
    <div v-if="!originalFile"
      class="flex-1 bg-deep-charcoal border-4 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary transition-colors"
      @drop="handleDrop" @dragover.prevent
      @click="($refs.fileInput as HTMLInputElement)?.click()">
      <span class="material-icons text-5xl text-gray-600">cloud_upload</span>
      <span class="text-gray-500 text-sm">拖拽图片到此处，或点击选择文件</span>
      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileInput" />
    </div>

    <div v-else class="flex-1 flex flex-col gap-4 min-h-0">
      <!-- 大小对比 -->
      <div class="flex items-center gap-4 px-2">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">原始:</span>
          <span class="font-mono text-sm text-gray-300">{{ formatSize(originalSize) }}</span>
        </div>
        <span class="material-icons text-primary">arrow_forward</span>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">压缩后:</span>
          <span class="font-mono text-sm text-neon-green">{{ formatSize(compressedSize) }}</span>
        </div>
        <span class="text-xs font-bold" :class="ratio() > 0 ? 'text-neon-green' : 'text-coral-red'">
          {{ ratio() > 0 ? `-${ratio()}%` : `+${Math.abs(ratio())}%` }}
        </span>
        <div class="flex-1"></div>
        <button @click="download"
          class="h-9 px-4 bg-primary text-black font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs flex items-center gap-1">
          <span class="material-icons text-sm">download</span> 下载
        </button>
        <button @click="originalFile = null; originalUrl = ''; compressedUrl = ''"
          class="h-9 px-3 bg-bg-dark text-gray-400 font-bold border-2 border-black rounded shadow-hard-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs">
          重选
        </button>
      </div>

      <!-- 图片预览 -->
      <div class="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div class="bg-deep-charcoal border-4 border-black rounded-xl shadow-hard overflow-hidden flex flex-col">
          <div class="px-3 py-2 border-b-2 border-black text-xs font-bold text-gray-500 uppercase">原始</div>
          <div class="flex-1 overflow-auto flex items-center justify-center p-2">
            <img :src="originalUrl" class="max-w-full max-h-full object-contain" />
          </div>
        </div>
        <div class="bg-deep-charcoal border-4 border-black rounded-xl shadow-hard overflow-hidden flex flex-col">
          <div class="px-3 py-2 border-b-2 border-black text-xs font-bold text-gray-500 uppercase">压缩后 ({{ format.toUpperCase() }})</div>
          <div class="flex-1 overflow-auto flex items-center justify-center p-2">
            <img v-if="compressedUrl" :src="compressedUrl" class="max-w-full max-h-full object-contain" />
            <span v-else class="text-gray-600 text-sm">处理中...</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

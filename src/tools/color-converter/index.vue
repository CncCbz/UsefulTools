<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const hexInput = ref('#3b82f6')
const copyField = ref('')

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) {
    const s = hex.replace('#', '').match(/^([0-9a-f])([0-9a-f])([0-9a-f])$/i)
    if (!s) return null
    return [parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16), parseInt(s[3] + s[3], 16)]
  }
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

const rgb = computed(() => hexToRgb(hexInput.value))
const hsl = computed(() => rgb.value ? rgbToHsl(...rgb.value) : null)

const formats = computed(() => {
  if (!rgb.value || !hsl.value) return []
  const [r, g, b] = rgb.value
  const [h, s, l] = hsl.value
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  return [
    { label: 'HEX', value: hex.toUpperCase(), color: 'text-primary' },
    { label: 'RGB', value: `rgb(${r}, ${g}, ${b})`, color: 'text-electric-blue' },
    { label: 'HSL', value: `hsl(${h}, ${s}%, ${l}%)`, color: 'text-vibrant-purple' },
    { label: 'RGB 数值', value: `${r}, ${g}, ${b}`, color: 'text-neon-green' },
  ]
})

const presets = [
  '#ef4444', '#f97316', '#f9b11f', '#84cc16', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff',
  '#000000', '#6b7280',
]

async function copy(text: string, field: string) {
  await navigator.clipboard.writeText(text)
  copyField.value = field
  setTimeout(() => { copyField.value = '' }, 1200)
}
</script>

<template>
  <div class="flex flex-col h-full gap-5">
    <!-- 输入 + 预览 -->
    <div class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-icons text-primary text-lg">palette</span>
        <span class="text-sm font-bold text-gray-400 uppercase tracking-wider">颜色转换器</span>
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <input type="color" :value="hexInput" @input="hexInput = ($event.target as HTMLInputElement).value"
          class="w-16 h-16 border-4 border-black rounded-lg cursor-pointer shadow-hard" />
        <input v-model="hexInput" placeholder="#3b82f6"
          class="flex-1 h-12 bg-bg-dark text-gray-100 border-4 border-black rounded-lg px-4 font-mono text-lg shadow-hard focus:border-primary focus:shadow-none focus:translate-x-[4px] focus:translate-y-[4px] transition-all outline-none placeholder-gray-600" />
        <div class="w-24 h-16 border-4 border-black rounded-lg shadow-hard" :style="{ backgroundColor: hexInput }"></div>
      </div>
      <!-- 预设色板 -->
      <div class="flex flex-wrap gap-2 mt-3">
        <button v-for="c in presets" :key="c" @click="hexInput = c"
          class="w-8 h-8 border-2 border-black rounded hover:scale-110 transition-transform"
          :style="{ backgroundColor: c }"></button>
      </div>
    </div>

    <!-- 格式输出 -->
    <div v-if="formats.length" class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
      <div v-for="f in formats" :key="f.label"
        class="bg-deep-charcoal border-4 border-black rounded-xl p-4 shadow-hard cursor-pointer hover:border-primary transition-all group"
        @click="copy(f.value, f.label)">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">{{ f.label }}</span>
          <span class="material-icons text-sm opacity-0 group-hover:opacity-100 transition-opacity"
            :class="copyField === f.label ? 'text-neon-green' : 'text-gray-500'">
            {{ copyField === f.label ? 'check' : 'content_copy' }}
          </span>
        </div>
        <div class="font-mono text-lg select-all" :class="f.color">{{ f.value }}</div>
      </div>
    </div>

    <div v-if="!rgb" class="px-4 py-2 bg-coral-red/20 border-2 border-coral-red rounded flex items-center gap-2 text-coral-red font-bold text-sm">
      <span class="material-icons text-lg">error_outline</span>
      无效的颜色值
    </div>
  </div>
</template>

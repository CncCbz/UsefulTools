<script setup lang="ts">
import { useTabs } from '../composables/useTabs'

const props = defineProps<{
  id: string
  icon: string
  title: string
  subtitle: string
  description: string
  bgColor: string
  textColor?: string
  pulse?: boolean
  swatches?: string[]
  route?: string
}>()

const { openTab } = useTabs()

function handleClick() {
  if (props.id) {
    openTab(props.id)
  }
}
</script>

<template>
  <div
    class="group relative rounded-xl border-[3px] border-black p-4 shadow-hard hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all duration-200 cursor-pointer flex flex-col justify-between h-44"
    :class="bgColor"
    @click="handleClick"
  >
    <!-- Top row: icon -->
    <div class="flex justify-between items-start">
      <div class="p-2 bg-black rounded-lg inline-block">
        <span class="material-icons text-white text-2xl">{{ icon }}</span>
      </div>
      <!-- Pulse dot -->
      <div
        v-if="pulse"
        class="h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-black animate-pulse"
      />
    </div>

    <!-- Bottom content -->
    <div>
      <h3
        class="text-base font-black uppercase leading-tight mb-1"
        :class="textColor || 'text-black'"
        v-html="title"
      />
      <p
        class="font-medium text-xs border-t-2 pt-1.5 mt-1.5 opacity-80 line-clamp-2"
        :class="[textColor || 'text-black', 'border-black/20']"
      >{{ description }}</p>
    </div>

    <!-- Hover arrow -->
    <div class="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
      <span class="material-icons text-2xl rotate-45" :class="textColor || 'text-black'">arrow_upward</span>
    </div>

    <!-- Color swatches -->
    <div v-if="swatches" class="absolute top-4 right-4 flex flex-col gap-0.5">
      <div
        v-for="color in swatches"
        :key="color"
        class="w-4 h-4 border-2 border-black rounded"
        :style="{ backgroundColor: color }"
      />
    </div>
  </div>
</template>


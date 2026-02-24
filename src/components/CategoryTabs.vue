<script setup lang="ts">
import { allCategories } from '../data/tools'

const model = defineModel<string>({ default: '全部工具' })

const categories = ['全部工具', ...allCategories]
</script>

<template>
  <div class="flex gap-4 mb-8 overflow-x-auto pb-4">
    <button
      v-for="cat in categories"
      :key="cat"
      class="px-6 py-2 rounded font-bold uppercase whitespace-nowrap border-2 transition-all"
      :class="model === cat
        ? 'bg-primary text-black border-black shadow-hard-sm hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none'
        : 'bg-bg-dark text-white border-white/20 hover:border-primary hover:bg-primary/10'"
      @click="model = cat"
    >
      {{ cat }}
    </button>
  </div>
</template>


<script setup lang="ts">
const model = defineModel<number>({ default: 0 })

const navItems = [
  { icon: 'construction', title: '工具' },
  { icon: 'favorite', title: '收藏' },
]
</script>

<template>
  <aside class="w-full md:w-24 md:h-screen bg-deep-charcoal border-b-4 md:border-b-0 md:border-r-4 border-black flex md:flex-col items-center justify-between py-4 md:py-8 px-4 z-20 shrink-0">
    <!-- Logo -->
    <div class="w-12 h-12 bg-primary border-2 border-black shadow-hard-sm flex items-center justify-center rounded-lg cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
      <span class="material-icons text-black text-3xl">grid_view</span>
    </div>

    <!-- Navigation -->
    <nav class="flex md:flex-col gap-4 md:gap-8">
      <button
        v-for="(item, index) in navItems"
        :key="item.icon"
        :title="item.title"
        class="group w-12 h-12 border-2 border-black rounded-lg shadow-hard-sm flex items-center justify-center hover:bg-primary hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        :class="model === index ? 'bg-primary' : 'bg-[#332b1f]'"
        @click="model = index"
      >
        <span
          class="material-icons text-2xl group-hover:text-black"
          :class="model === index ? 'text-black' : 'text-white'"
        >{{ item.icon }}</span>
      </button>
    </nav>

    <!-- Settings -->
    <button class="w-12 h-12 bg-[#332b1f] border-2 border-black rounded-lg shadow-hard-sm flex items-center justify-center hover:bg-gray-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
      <span class="material-icons text-white text-2xl hover:text-black">settings</span>
    </button>
  </aside>
</template>


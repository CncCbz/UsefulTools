<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const model = defineModel<number>({ default: 0 })
const emit = defineEmits<{
  openSettings: []
}>()

const navItems = [
  { icon: 'construction', title: '工具' },
  { icon: 'favorite', title: '收藏' },
]

function goToStore() {
  router.push('/store')
}
</script>

<template>
  <aside class="w-full md:w-24 md:h-full bg-deep-charcoal border-b-4 md:border-b-0 md:border-r-4 border-black flex md:flex-col items-center py-4 md:py-8 px-4 z-20 shrink-0">
    <!-- Logo -->
    <div class="w-12 h-12 bg-primary border-2 border-black shadow-hard-sm flex items-center justify-center rounded-lg cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
      <span class="material-icons text-black text-3xl">grid_view</span>
    </div>

    <!-- Navigation -->
    <nav class="flex md:flex-col gap-4 md:gap-8 mt-4 md:mt-8">
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

      <!-- 分隔线 -->
      <div class="hidden md:block w-8 h-0.5 bg-black/30 mx-auto"></div>
      <div class="block md:hidden w-0.5 h-8 bg-black/30 my-auto"></div>

      <!-- 插件商店 -->
      <button
        title="插件商店"
        class="group w-12 h-12 border-2 border-black rounded-lg shadow-hard-sm flex items-center justify-center bg-[#332b1f] hover:bg-primary hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        @click="goToStore"
      >
        <span class="material-icons text-2xl text-white group-hover:text-black">store</span>
      </button>
    </nav>

    <!-- Settings -->
    <button
      class="w-12 h-12 bg-[#332b1f] border-2 border-black rounded-lg shadow-hard-sm flex items-center justify-center hover:bg-gray-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all mt-auto"
      @click="emit('openSettings')"
    >
      <span class="material-icons text-white text-2xl hover:text-black">settings</span>
    </button>
  </aside>
</template>


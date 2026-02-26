<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import Sortable from 'sortablejs'
import CategoryTabs from '../components/CategoryTabs.vue'
import ToolCard from '../components/ToolCard.vue'
import { tools } from '../data/tools'
import { useFavorites } from '../composables/useFavorites'
import { useToolOrder } from '../composables/useToolOrder'
import { useSettings } from '../composables/useSettings'

const props = defineProps<{
  /** 0=全部工具, 1=收藏 */
  navMode?: number
  searchQuery?: string
}>()

const activeCategory = ref('全部工具')
const { isFavorite } = useFavorites()
const { sortTools, updateOrder } = useToolOrder()
const settings = useSettings()

const canDrag = computed(() => props.navMode !== 1 && activeCategory.value === '全部工具')

const gridClass = computed(() => {
  const cols = settings.value.gridColumns
  if (cols === 3) return 'grid-cols-3'
  if (cols === 4) return 'grid-cols-4'
  if (cols === 5) return 'grid-cols-5'
  if (cols === 6) return 'grid-cols-6'
  return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
})

const filteredTools = computed(() => {
  let list = sortTools([...tools])

  if (props.navMode === 1) {
    list = list.filter(t => isFavorite(t.id))
  }

  if (activeCategory.value !== '全部工具') {
    list = list.filter(t => t.categories.includes(activeCategory.value))
  }

  const q = (props.searchQuery ?? '').trim().toLowerCase()
  if (q) {
    list = list.filter(t =>
      t.subtitle.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.categories.some(c => c.toLowerCase().includes(q))
    )
  }

  return list
})

const gridRef = ref<HTMLElement | null>(null)
let sortableInstance: Sortable | null = null

function initSortable() {
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
  if (!gridRef.value || !canDrag.value) return

  sortableInstance = Sortable.create(gridRef.value, {
    animation: 200,
    ghostClass: 'opacity-30',
    forceFallback: true,
    onEnd(evt) {
      const { oldIndex, newIndex } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return

      const children = gridRef.value?.children
      if (!children) return
      const newOrder: string[] = []
      for (let i = 0; i < children.length; i++) {
        const id = (children[i] as HTMLElement).dataset.id
        if (id) newOrder.push(id)
      }
      updateOrder(newOrder)
    },
  })
}

watch(canDrag, () => { nextTick(initSortable) })
onMounted(initSortable)
onBeforeUnmount(() => { sortableInstance?.destroy() })
</script>

<template>
  <div>
    <CategoryTabs v-model="activeCategory" />

    <div
      ref="gridRef"
      class="grid gap-4 md:gap-5"
      :class="gridClass"
    >
      <div v-for="tool in filteredTools" :key="tool.id" :data-id="tool.id">
        <ToolCard
          :id="tool.id"
          :icon="tool.icon"
          :title="tool.title"
          :subtitle="tool.subtitle"
          :description="tool.description"
          :bg-color="tool.bgColor"
          :text-color="tool.textColor"
          :pulse="tool.pulse"
          :swatches="tool.swatches"
          :route="tool.route"
        />
      </div>
    </div>

    <!-- 搜索无结果提示 -->
    <div
      v-if="navMode !== 1 && filteredTools.length === 0 && (searchQuery ?? '').trim()"
      class="flex flex-col items-center justify-center py-20 text-gray-500"
    >
      <span class="material-icons text-6xl mb-4">search_off</span>
      <p class="text-lg font-bold">没有找到匹配的工具</p>
      <p class="text-sm mt-1">试试其他关键词吧</p>
    </div>

    <!-- 收藏为空提示 -->
    <div
      v-if="navMode === 1 && filteredTools.length === 0"
      class="flex flex-col items-center justify-center py-20 text-gray-500"
    >
      <span class="material-icons text-6xl mb-4">favorite_border</span>
      <p class="text-lg font-bold">还没有收藏任何工具</p>
      <p class="text-sm mt-1">进入工具页面，点击顶栏的 ♥ 按钮来收藏</p>
    </div>
  </div>
</template>


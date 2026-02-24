<script setup lang="ts">
import { ref, computed, watch, markRaw, reactive } from 'vue'
import { VueFlow, useVueFlow, MarkerType, type EdgeChange, type NodeChange } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import { operations, operationCategories, type OperationDef } from './operations'
import OperationNode from './OperationNode.vue'
import InputNode from './InputNode.vue'
import OutputNode from './OutputNode.vue'

/* ─── Vue Flow ─── */
const {
  nodes,
  edges,
  addNodes,
  addEdges,
  removeNodes,
  removeEdges,
  onConnect,
  onNodeDragStop,
  screenToFlowCoordinate,
  findNode,
  applyEdgeChanges,
  applyNodeChanges,
} = useVueFlow({
  nodes: [
    {
      id: 'input-1',
      type: 'inputNode',
      position: { x: 30, y: 150 },
      data: { text: 'Hello, World!' },
    },
    {
      id: 'output-1',
      type: 'outputNode',
      position: { x: 600, y: 150 },
      data: { text: '' },
    },
  ],
  edges: [],
  defaultEdgeOptions: {
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#f9b11f', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f9b11f' },
  },
})

/* ─── 自定义节点类型 ─── */
const nodeTypes = {
  operationNode: markRaw(OperationNode),
  inputNode: markRaw(InputNode),
  outputNode: markRaw(OutputNode),
} as any

/* ─── 执行结果存储（独立于 node.data，避免循环触发） ─── */
const nodeResults = reactive<Map<string, { output: string; error: string }>>(new Map())

function getNodeResult(id: string) {
  return nodeResults.get(id) || { output: '', error: '' }
}

/* ─── 左侧操作列表 ─── */
const searchQuery = ref('')
const activeCategory = ref('')

const filteredOps = computed(() => {
  let list = operations
  if (activeCategory.value) list = list.filter(o => o.category === activeCategory.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(o => o.name.toLowerCase().includes(q) || o.description.toLowerCase().includes(q))
  }
  return list
})

/* ─── 拖拽从左侧到画布 ─── */
function onSidebarDragStart(e: DragEvent, opId: string) {
  e.dataTransfer!.effectAllowed = 'copy'
  e.dataTransfer!.setData('application/cyberchef-op', opId)
}

function onCanvasDragOver(e: DragEvent) {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
}

let nodeIdCounter = 100

function onCanvasDrop(e: DragEvent) {
  e.preventDefault()
  const opId = e.dataTransfer?.getData('application/cyberchef-op')
  if (!opId) return

  const op = operations.find(o => o.id === opId)
  if (!op) return

  const position = screenToFlowCoordinate({ x: e.clientX, y: e.clientY })
  const params: Record<string, any> = {}
  op.params.forEach(p => { params[p.key] = p.default })

  addNodes({
    id: `op-${++nodeIdCounter}`,
    type: 'operationNode',
    position,
    data: { opId: op.id, params, enabled: true },
  })
}

/* ─── 双击添加节点 ─── */
function onDblClickAdd(op: OperationDef) {
  const params: Record<string, any> = {}
  op.params.forEach(p => { params[p.key] = p.default })

  const existingOpNodes = nodes.value.filter(n => n.type === 'operationNode')
  const x = existingOpNodes.length > 0
    ? Math.max(...existingOpNodes.map(n => n.position.x)) + 260
    : 300

  addNodes({
    id: `op-${++nodeIdCounter}`,
    type: 'operationNode',
    position: { x, y: 150 },
    data: { opId: op.id, params, enabled: true },
  })
}

/* ─── 连线 ─── */
onConnect((connection) => {
  addEdges({
    ...connection,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#f9b11f', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f9b11f' },
  })
})

/* ─── 拖拽节点到边上自动插入 ─── */
function getNodeCenter(nodeId: string): { x: number; y: number } | null {
  const node = findNode(nodeId)
  if (!node) return null
  // 估算节点中心（position 是左上角）
  const w = node.dimensions?.width || 200
  const h = node.dimensions?.height || 60
  return { x: node.position.x + w / 2, y: node.position.y + h / 2 }
}

function pointToSegmentDist(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax, dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

const EDGE_DROP_THRESHOLD = 60 // 像素距离阈值

onNodeDragStop(({ node }) => {
  // 只对操作节点生效
  if (node.type !== 'operationNode') return

  const nc = getNodeCenter(node.id)
  if (!nc) return

  // 检查该节点是否已经有连线（已连入流程的不再自动插入）
  const hasEdges = edges.value.some(e => e.source === node.id || e.target === node.id)
  if (hasEdges) return

  // 找最近的边
  let closestEdge: (typeof edges.value)[number] | null = null
  let closestDist = Infinity

  for (const edge of edges.value) {
    const sc = getNodeCenter(edge.source)
    const tc = getNodeCenter(edge.target)
    if (!sc || !tc) continue
    const dist = pointToSegmentDist(nc.x, nc.y, sc.x, sc.y, tc.x, tc.y)
    if (dist < closestDist) {
      closestDist = dist
      closestEdge = edge
    }
  }

  if (!closestEdge || closestDist > EDGE_DROP_THRESHOLD) return

  const edgeStyle = {
    type: 'smoothstep' as const,
    animated: true,
    style: { stroke: '#f9b11f', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f9b11f' },
  }

  // 删除原边，插入两条新边
  const { source, target, sourceHandle, targetHandle } = closestEdge
  removeEdges(closestEdge.id)
  addEdges([
    { source, sourceHandle, target: node.id, targetHandle: null, ...edgeStyle },
    { source: node.id, sourceHandle: null, target, targetHandle, ...edgeStyle },
  ])
})

/* ─── 节点/边变更处理（选中、删除、移动等） ─── */
function onNodesChange(changes: NodeChange[]) {
  applyNodeChanges(changes)
}

function onEdgesChange(changes: EdgeChange[]) {
  applyEdgeChanges(changes)
}

/* ─── 节点事件 ─── */
function onNodeRemove(nodeId: string) {
  removeNodes(nodeId)
  nodeResults.delete(nodeId)
}

function onNodeToggle(nodeId: string) {
  const node = findNode(nodeId)
  if (node) node.data = { ...node.data, enabled: !node.data.enabled }
}

function onNodeUpdateParam(nodeId: string, key: string, value: any) {
  const node = findNode(nodeId)
  if (node) node.data = { ...node.data, params: { ...node.data.params, [key]: value } }
}

function onInputUpdateText(nodeId: string, value: string) {
  const node = findNode(nodeId)
  if (node) node.data = { ...node.data, text: value }
}

/* ─── 执行流程图（拓扑排序 + 多分支，结果写入 nodeResults） ─── */
function executeFlow() {
  const adj = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  for (const n of nodes.value) {
    adj.set(n.id, [])
    inDegree.set(n.id, 0)
  }
  for (const e of edges.value) {
    adj.get(e.source)?.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const outputs = new Map<string, string>()

  while (queue.length > 0) {
    const id = queue.shift()!
    const node = findNode(id)
    if (!node) continue

    // 收集上游输入
    const parentEdges = edges.value.filter(e => e.target === id)
    const collectInput = () => {
      if (parentEdges.length === 0) return ''
      if (parentEdges.length === 1) return outputs.get(parentEdges[0].source) || ''
      return parentEdges.map(e => outputs.get(e.source) || '').join('\n')
    }

    if (node.type === 'inputNode') {
      outputs.set(id, node.data.text || '')
      nodeResults.set(id, { output: node.data.text || '', error: '' })
    } else if (node.type === 'operationNode') {
      const inputText = collectInput()
      const op = operations.find(o => o.id === node.data.opId)
      if (!op || !node.data.enabled) {
        outputs.set(id, inputText)
        nodeResults.set(id, { output: inputText, error: '' })
      } else {
        try {
          const result = op.execute(inputText, node.data.params)
          outputs.set(id, result)
          nodeResults.set(id, { output: result, error: '' })
        } catch (e: any) {
          outputs.set(id, inputText)
          nodeResults.set(id, { output: inputText, error: e.message || '执行出错' })
        }
      }
    } else if (node.type === 'outputNode') {
      const inputText = collectInput()
      outputs.set(id, inputText)
      nodeResults.set(id, { output: inputText, error: '' })
    }

    for (const targetId of adj.get(id) || []) {
      const newDeg = (inDegree.get(targetId) || 1) - 1
      inDegree.set(targetId, newDeg)
      if (newDeg === 0) queue.push(targetId)
    }
  }
}

/* ─── 构建仅追踪用户输入的 fingerprint，避免循环 ─── */
watch(
  () => {
    // 只追踪：输入节点文本、操作节点的 opId/params/enabled、边的连接
    const inputFingerprints = nodes.value
      .filter(n => n.type === 'inputNode')
      .map(n => `${n.id}:${n.data.text}`)
      .join('|')
    const opFingerprints = nodes.value
      .filter(n => n.type === 'operationNode')
      .map(n => `${n.id}:${n.data.opId}:${n.data.enabled}:${JSON.stringify(n.data.params)}`)
      .join('|')
    const edgeFingerprint = edges.value.map(e => `${e.source}->${e.target}`).join('|')
    return `${inputFingerprints}||${opFingerprints}||${edgeFingerprint}`
  },
  () => { executeFlow() },
)

/* ─── 添加输出节点 ─── */
let outputCounter = 1
function addOutputNode() {
  const existingOutputs = nodes.value.filter(n => n.type === 'outputNode')
  const y = existingOutputs.length > 0
    ? Math.max(...existingOutputs.map(n => n.position.y)) + 150
    : 350
  const x = existingOutputs.length > 0
    ? Math.max(...existingOutputs.map(n => n.position.x))
    : 600
  addNodes({
    id: `output-${++outputCounter}`,
    type: 'outputNode',
    position: { x, y },
    data: { text: '' },
  })
}

/* ─── 添加输入节点 ─── */
let inputCounter = 1
function addInputNode() {
  const existingInputs = nodes.value.filter(n => n.type === 'inputNode')
  const y = existingInputs.length > 0
    ? Math.max(...existingInputs.map(n => n.position.y)) + 150
    : 350
  addNodes({
    id: `input-${++inputCounter}`,
    type: 'inputNode',
    position: { x: 30, y },
    data: { text: '' },
  })
}

/* ─── 清空画布 ─── */
function clearCanvas() {
  const allNodeIds = nodes.value.map(n => n.id)
  removeNodes(allNodeIds)
  nodeResults.clear()
  nodeIdCounter = 100
  outputCounter = 1
  inputCounter = 1
  addNodes([
    {
      id: 'input-1',
      type: 'inputNode',
      position: { x: 30, y: 150 },
      data: { text: 'Hello, World!' },
    },
    {
      id: 'output-1',
      type: 'outputNode',
      position: { x: 600, y: 150 },
      data: { text: '' },
    },
  ])
}
</script>

<template>
  <div class="flex h-full min-h-0">
    <!-- ═══ 左侧：操作列表 ═══ -->
    <div class="w-72 shrink-0 flex flex-col bg-deep-charcoal border-4 border-black rounded-xl shadow-hard overflow-hidden mr-3">
      <!-- 搜索 -->
      <div class="p-2.5 border-b-2 border-black">
        <div class="relative">
          <span class="material-icons absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">search</span>
          <input v-model="searchQuery" placeholder="搜索操作..."
            class="w-full h-8 bg-bg-dark text-gray-100 border-2 border-black rounded-lg pl-8 pr-2 text-xs outline-none focus:border-primary transition-colors placeholder-gray-600" />
        </div>
      </div>

      <!-- 分类标签 -->
      <div class="flex flex-wrap gap-1 px-2.5 py-1.5 border-b-2 border-black">
        <button @click="activeCategory = ''"
          class="px-1.5 py-0.5 text-[10px] font-bold rounded border-2 border-black transition-all"
          :class="!activeCategory ? 'bg-primary text-black' : 'bg-bg-dark text-gray-400 hover:text-primary'">
          全部
        </button>
        <button v-for="cat in operationCategories" :key="cat" @click="activeCategory = cat"
          class="px-1.5 py-0.5 text-[10px] font-bold rounded border-2 border-black transition-all"
          :class="activeCategory === cat ? 'bg-primary text-black' : 'bg-bg-dark text-gray-400 hover:text-primary'">
          {{ cat }}
        </button>
      </div>

      <!-- 操作列表 -->
      <div class="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        <div v-for="op in filteredOps" :key="op.id"
          draggable="true"
          @dragstart="onSidebarDragStart($event, op.id)"
          @dblclick="onDblClickAdd(op)"
          class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border-2 border-transparent hover:border-primary/50 hover:bg-primary/5 cursor-grab active:cursor-grabbing transition-all group">
          <span class="material-icons text-sm text-gray-500 group-hover:text-primary">{{ op.icon }}</span>
          <div class="flex-1 min-w-0">
            <div class="text-[11px] font-bold text-gray-200 truncate">{{ op.name }}</div>
            <div class="text-[9px] text-gray-500 truncate">{{ op.description }}</div>
          </div>
          <button @click.stop="onDblClickAdd(op)"
            class="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded bg-primary/20 text-primary text-xs transition-opacity">
            <span class="material-icons text-xs">add</span>
          </button>
        </div>
        <div v-if="!filteredOps.length" class="text-center text-gray-600 text-xs py-6">无匹配操作</div>
      </div>
    </div>

    <!-- ═══ 右侧：流程图画布 ═══ -->
    <div class="flex-1 flex flex-col min-h-0 min-w-0">
      <!-- 工具栏 -->
      <div class="flex items-center gap-2 mb-2 shrink-0">
        <button @click="addInputNode"
          class="px-2.5 py-1 text-xs font-bold bg-bg-dark text-gray-300 border-2 border-black rounded-lg shadow-hard-sm hover:border-primary hover:text-primary hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-1">
          <span class="material-icons text-sm">input</span>添加输入
        </button>
        <button @click="addOutputNode"
          class="px-2.5 py-1 text-xs font-bold bg-bg-dark text-gray-300 border-2 border-black rounded-lg shadow-hard-sm hover:border-neon-green hover:text-neon-green hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-1">
          <span class="material-icons text-sm">output</span>添加输出
        </button>
        <div class="flex-1" />
        <button @click="clearCanvas"
          class="px-2.5 py-1 text-xs font-bold bg-bg-dark text-gray-400 border-2 border-black rounded-lg shadow-hard-sm hover:border-coral-red hover:text-coral-red hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-1">
          <span class="material-icons text-sm">delete_sweep</span>清空
        </button>
      </div>

      <!-- 画布 -->
      <div class="flex-1 min-h-0 border-4 border-black rounded-xl shadow-hard overflow-hidden bg-bg-dark">
        <VueFlow
          :node-types="nodeTypes"
          :default-edge-options="{ type: 'smoothstep', animated: true }"
          :snap-to-grid="true"
          :snap-grid="[20, 20]"
          :delete-key-code="'Backspace'"
          :edges-updatable="true"
          fit-view-on-init
          @dragover="onCanvasDragOver"
          @drop="onCanvasDrop"
          @nodes-change="onNodesChange"
          @edges-change="onEdgesChange"
        >
          <Background :gap="20" :size="1" pattern-color="#333" />
          <Controls position="bottom-right" />

          <template #node-operationNode="nodeProps">
            <OperationNode
              v-bind="nodeProps"
              :data="{ ...nodeProps.data, ...getNodeResult(nodeProps.id) }"
              @remove="onNodeRemove(nodeProps.id)"
              @toggle="onNodeToggle(nodeProps.id)"
              @update-param="(key: string, val: any) => onNodeUpdateParam(nodeProps.id, key, val)"
            />
          </template>

          <template #node-inputNode="nodeProps">
            <InputNode
              v-bind="nodeProps"
              @update-text="(val: string) => onInputUpdateText(nodeProps.id, val)"
            />
          </template>

          <template #node-outputNode="nodeProps">
            <OutputNode
              v-bind="nodeProps"
              :data="{ text: getNodeResult(nodeProps.id).output || nodeProps.data.text }"
            />
          </template>
        </VueFlow>
      </div>
    </div>
  </div>
</template>

<style>
/* Vue Flow 主题覆盖 */
.vue-flow {
  background: #231c0f !important;
}
.vue-flow__edge-path {
  stroke: #f9b11f !important;
  stroke-width: 2px;
}
.vue-flow__edge.animated .vue-flow__edge-path {
  stroke-dasharray: 5;
  animation: dashdraw 0.5s linear infinite;
}
@keyframes dashdraw {
  from { stroke-dashoffset: 10; }
}
.vue-flow__connection-line {
  stroke: #f9b11f !important;
  stroke-width: 2px;
  stroke-dasharray: 5 5;
}
.vue-flow__controls {
  background: #1f1a14 !important;
  border: 2px solid #000 !important;
  border-radius: 8px !important;
  box-shadow: 3px 3px 0 0 #000 !important;
}
.vue-flow__controls-button {
  background: #1f1a14 !important;
  border-bottom: 1px solid #333 !important;
  fill: #f9b11f !important;
}
.vue-flow__controls-button:hover {
  background: #2a2318 !important;
}
/* 选中的边高亮 */
.vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #ff6b6b !important;
  stroke-width: 3px;
}
</style>

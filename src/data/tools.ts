export interface ToolInfo {
  id: string
  icon: string
  title: string
  subtitle: string
  description: string
  bgColor: string
  textColor?: string
  pulse?: boolean
  swatches?: string[]
  route: string
  categories: string[]
  /** 懒加载组件，指向 src/tools/xxx/index.vue */
  component: () => Promise<any>
}

export const tools: ToolInfo[] = [
  {
    id: 'json-formatter',
    icon: 'data_object',
    title: 'JSON<br/>格式化',
    subtitle: 'JSON格式化',
    description: '格式化、压缩、校验',
    bgColor: 'bg-primary',
    route: '/json-formatter',
    categories: ['编码开发'],
    component: () => import('../tools/json-formatter/index.vue'),
  },
  {
    id: 'js-runner',
    icon: 'javascript',
    title: 'JS代码<br/>运行器',
    subtitle: 'JS代码运行器',
    description: '编写、运行、调试JS代码',
    bgColor: 'bg-electric-blue',
    route: '/js-runner',
    categories: ['编码开发'],
    component: () => import('../tools/js-runner/index.vue'),
  },
  {
    id: 'translator',
    icon: 'translate',
    title: 'Google<br/>翻译',
    subtitle: 'Google翻译',
    description: '多语言翻译，支持自动检测',
    bgColor: 'bg-neon-green',
    textColor: 'text-black',
    route: '/translator',
    categories: ['文本处理'],
    component: () => import('../tools/translator/index.vue'),
  },
  {
    id: 'timestamp-converter',
    icon: 'schedule',
    title: '时间戳<br/>转换',
    subtitle: '时间戳转换',
    description: '时间戳与日期互转，实时时钟',
    bgColor: 'bg-vibrant-purple',
    route: '/timestamp-converter',
    categories: ['转换解析'],
    component: () => import('../tools/timestamp-converter/index.vue'),
  },
  {
    id: 'text-diff',
    icon: 'difference',
    title: '文本<br/>对比',
    subtitle: '文本对比',
    description: '逐行对比两段文本，高亮差异',
    bgColor: 'bg-coral-red',
    route: '/text-diff',
    categories: ['文本处理'],
    component: () => import('../tools/text-diff/index.vue'),
  },
  {
    id: 'json-diff',
    icon: 'data_object',
    title: 'JSON<br/>对比',
    subtitle: 'JSON对比',
    description: '深度比较两个JSON的key与value差异',
    bgColor: 'bg-hot-pink',
    route: '/json-diff',
    categories: ['编码开发'],
    component: () => import('../tools/json-diff/index.vue'),
  },
  {
    id: 'cron-expression',
    icon: 'timer',
    title: 'Cron<br/>表达式',
    subtitle: 'Cron表达式',
    description: '解析Cron表达式，预览执行时间',
    bgColor: 'bg-electric-blue',
    route: '/cron-expression',
    categories: ['转换解析'],
    component: () => import('../tools/cron-expression/index.vue'),
  },
  {
    id: 'regex-tester',
    icon: 'manage_search',
    title: '正则<br/>测试',
    subtitle: '正则表达式测试',
    description: '测试正则表达式，可视化匹配结果',
    bgColor: 'bg-vibrant-purple',
    route: '/regex-tester',
    categories: ['编码开发'],
    component: () => import('../tools/regex-tester/index.vue'),
  },
  {
    id: 'jwt-parser',
    icon: 'vpn_key',
    title: 'JWT<br/>解析器',
    subtitle: 'JWT解析器',
    description: '解析JWT Token，查看Header/Payload/过期状态',
    bgColor: 'bg-primary',
    route: '/jwt-parser',
    categories: ['转换解析'],
    component: () => import('../tools/jwt-parser/index.vue'),
  },
  {
    id: 'base-converter',
    icon: 'swap_horiz',
    title: '进制<br/>转换',
    subtitle: '进制转换',
    description: '二/八/十/十六进制互转，支持自定义进制',
    bgColor: 'bg-neon-green',
    textColor: 'text-black',
    route: '/base-converter',
    categories: ['转换解析'],
    component: () => import('../tools/base-converter/index.vue'),
  },
]

/** 从工具列表中自动提取所有分类（去重） */
export const allCategories = [...new Set(tools.flatMap(t => t.categories))]


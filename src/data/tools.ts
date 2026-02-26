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
  /** 懒加载组件，指向 src/tools/xxx/index.vue 或插件动态加载 */
  component?: () => Promise<any>
}

# 🛠️ UsefulTools

> 开发者实用工具集 — 基于 Tauri 2 + Vue 3 的 Windows 桌面应用

一个集合了 **26 款** 常用开发/设计小工具的桌面应用，开箱即用，离线可用，界面采用「块状工作室」风格设计。

## ✨ 特性

- 🧰 26 款实用工具，覆盖编码开发、文本处理、转换解析、生成工具、设计工具五大分类
- 🔌 插件化架构，工具通过插件商店安装/卸载，按需加载
- 🔍 全局搜索 + 分类筛选，快速定位工具
- ⭐ 收藏常用工具，支持拖拽排序自定义布局
- 📦 数据导入/导出，设置不丢失
- 🎨 深色主题 + 金黄主色调，硬阴影卡片风格
- ⚡ 基于 Tauri 2，体积小、启动快、资源占用低

## 🧰 工具列表

| 分类 | 工具 |
|------|------|
| 编码开发 | JSON 格式化 · JS 代码运行器 · JSON 对比 · 正则测试 · 加解密工坊 · Hash 生成器 · URL 编解码 · HTML 实体编解码 · SQL 格式化 |
| 文本处理 | Google 翻译 · 文本对比 · Markdown 预览 · 大小写转换 · 文本统计 |
| 转换解析 | 时间戳转换 · Cron 表达式 · JWT 解析器 · 进制转换 · JSON ↔ YAML · IP/子网计算器 |
| 生成工具 | UUID 生成器 · Lorem Ipsum · QR 码生成器 · 密码生成器 |
| 设计工具 | 颜色转换器 · 图片压缩转换 |

## 🏗️ 技术栈

- **桌面框架**: [Tauri 2](https://tauri.app/)（Rust 后端 + Web 前端）
- **前端框架**: Vue 3.5+（Composition API + `<script setup>`）
- **语言**: TypeScript 5.6 + Rust
- **样式**: Tailwind CSS 4
- **构建**: Vite 6
- **路由**: vue-router 4（Hash 模式，工具页懒加载）
- **代码编辑**: CodeMirror 6
- **包管理**: pnpm

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8
- [Rust](https://www.rust-lang.org/tools/install) >= 1.77
- Tauri 2 系统依赖（参考 [Tauri 官方文档](https://tauri.app/start/prerequisites/)）

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/your-username/usefultools.git
cd usefultools

# 安装依赖
pnpm install

# 启动开发模式（Tauri 桌面应用）
pnpm tauri dev

# 仅启动前端开发服务器（端口 1420）
pnpm dev
```

插件商店需要同时运行 NestJS 服务：

```bash
# 在 UsefulTools_Plugin 目录下
pnpm install
pnpm start:dev    # 启动开发服务器（端口 3000）
```

### 构建生产版本

```bash
pnpm tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`，Windows 下生成 NSIS 安装包。

## 📁 项目结构

```
UsefulTools/                     # Tauri 桌面应用（前端 + Rust 后端）
├── src/
│   ├── main.ts                  # 应用入口
│   ├── App.vue                  # 根组件（首页/工具页双布局）
│   ├── styles/main.css          # 全局样式 + Tailwind @theme
│   ├── components/              # 通用 UI 组件
│   ├── composables/             # 组合式函数（usePluginStore 等）
│   ├── data/tools.ts            # ToolInfo 类型定义
│   ├── router/index.ts          # 路由配置
│   ├── views/
│   │   ├── HomeView.vue         # 首页（工具卡片网格）
│   │   └── PluginStoreView.vue  # 插件商店
│   └── tools/                   # 各工具实现（每个工具一个文件夹）
│       └── {tool-name}/
│           └── index.vue
├── src-tauri/                   # Rust 后端（插件管理、系统命令）
├── dist-plugins/                # 构建产物：各工具的独立 ESM bundle
├── vite.plugins.config.ts       # 插件构建配置
└── scripts/deploy-plugins.ts    # 部署脚本

UsefulTools_Plugin/              # NestJS 插件商店服务
├── src/plugins/
│   ├── plugins.controller.ts    # API 路由
│   ├── plugins.service.ts       # 插件注册表 + bundle 管理
│   └── plugins.interface.ts     # 类型定义
└── bundles/                     # 各工具的 .mjs bundle 文件
```

## 🔌 插件系统架构

应用采用「主应用 + 插件商店」模式：

- **主应用**（UsefulTools）：提供框架、路由、UI 外壳，不内置任何工具
- **插件商店服务**（UsefulTools_Plugin）：NestJS 后端，提供插件注册表 API 和 bundle 下载
- **插件 bundle**：每个工具被构建为独立的 `.mjs` 文件，Vue 和 `@tauri-apps/*` 作为 external 由主应用提供

用户在插件商店浏览、安装工具 → Rust 后端下载 bundle 并校验 SHA-256 → 前端动态加载组件 → 工具出现在首页。

## 🔧 开发新工具插件

### 第一步：创建工具组件

在 `src/tools/{tool-name}/index.vue` 创建组件：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const input = ref('')
// 你的工具逻辑...
</script>

<template>
  <div class="flex flex-col h-full gap-4">
    <!-- 你的工具 UI -->
  </div>
</template>
```

规范：
- 工具 ID 使用 kebab-case（如 `my-tool`）
- 使用 `<script setup lang="ts">` + Composition API
- 界面文案使用中文
- 图标使用 Material Icons：`<span class="material-icons">icon_name</span>`
- Tailwind class 直接使用，主应用已加载
- 需要 HTTP 请求时用 `import { fetch } from '@tauri-apps/plugin-http'`

### 第二步：在 NestJS 注册元数据

编辑 `UsefulTools_Plugin/src/plugins/plugins.service.ts`，在 `plugins` 数组中添加一条：

```ts
{
  id: 'my-tool',
  version: '1.0.0',
  author: 'UsefulTools',
  icon: 'build',                    // Material Icons 名称
  title: '我的<br/>工具',            // 支持 <br/> 换行
  subtitle: '我的工具',
  description: '一句话描述工具功能',
  bgColor: 'bg-primary',            // 卡片背景色
  categories: ['编码开发'],          // 分类
  bundleUrl: BASE + '/my-tool/bundle',
  bundleSize: 0,                     // 启动时自动计算
  checksum: '',                      // 启动时自动计算
  requires: [],                      // 所需权限：'http' | 'fs:read' | 'dialog' 等
  downloads: 0,
  rating: 4.5,
  updatedAt: '2026-02-26T00:00:00Z',
  createdAt: '2026-02-26T00:00:00Z',
},
```

可选的 `bgColor` 值：
| 类名 | 颜色 |
|------|------|
| `bg-primary` | 金黄 |
| `bg-electric-blue` | 电光蓝 |
| `bg-neon-green` | 霓虹绿（需加 `textColor: 'text-black'`） |
| `bg-vibrant-purple` | 亮紫 |
| `bg-coral-red` | 珊瑚红 |
| `bg-hot-pink` | 热粉 |

### 第三步：构建 + 部署

```bash
# 在 UsefulTools 目录下

# 仅构建插件 bundle
pnpm build:plugins

# 构建 + 复制到 NestJS bundles 目录（一键完成）
pnpm deploy:plugins
```

然后重启 NestJS 服务：

```bash
# 在 UsefulTools_Plugin 目录下
pnpm start:dev
```

服务启动时会自动计算每个 bundle 的 SHA-256 checksum 和文件大小。打开应用的插件商店即可看到新工具。

### 注意事项

- 工具组件中的 `<style>` 和引入的第三方 CSS 会在构建时自动内联到 JS bundle
- `vue`、`@tauri-apps/api/core`、`@tauri-apps/plugin-http` 等由主应用提供，不会重复打包
- 首页工具卡片支持右键卸载插件

## 📄 License

MIT

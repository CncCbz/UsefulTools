# 🛠️ UsefulTools

> 开发者实用工具集 — 基于 Tauri 2 + Vue 3 的 Windows 桌面应用

一个集合了 **26 款** 常用开发/设计小工具的桌面应用，开箱即用，离线可用，界面采用「块状工作室」风格设计。

## ✨ 特性

- 🧰 26 款实用工具，覆盖编码开发、文本处理、转换解析、生成工具、设计工具五大分类
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

### 构建生产版本

```bash
pnpm tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`，Windows 下生成 NSIS 安装包。

## 📁 项目结构

```
src/
├── main.ts                  # 应用入口
├── App.vue                  # 根组件（首页/工具页双布局）
├── styles/main.css          # 全局样式 + Tailwind @theme
├── components/              # 通用 UI 组件
├── composables/             # 组合式函数
├── data/tools.ts            # 工具注册表
├── router/index.ts          # 路由配置（自动生成）
├── views/HomeView.vue       # 首页视图
└── tools/                   # 各工具实现
    └── {tool-name}/
        └── index.vue

src-tauri/                   # Rust 后端
```

## 🔧 添加新工具

1. 在 `src/tools/{tool-name}/index.vue` 创建工具组件
2. 在 `src/data/tools.ts` 的 `tools` 数组中添加条目
3. 路由自动生成，无需额外配置

## 📄 License

MIT

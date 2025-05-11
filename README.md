# Web Worker 数据处理器

这是一个基于Next.js的Web应用，利用Web Worker进行数据处理，包含丰富的UI组件库。

## 技术栈

- Next.js 14
- TypeScript
- Tailwind CSS
- Radix UI
- Web Workers

## 安装运行

1. 安装依赖：
```bash
pnpm install
```

2. 开发模式运行：
```bash
pnpm dev
```

3. 构建生产版本：
```bash
pnpm build
```

## 项目结构

- `app/`: Next.js应用路由
  - `workers/`: Web Worker脚本
- `components/`: UI组件库
  - `ui/`: 基础UI组件
- `public/`: 静态资源
- `styles/`: 全局样式
- `lib/`: 工具函数

## 功能特性

- 使用Web Worker处理密集型计算
- 响应式设计，适配移动端
- 丰富的可复用UI组件
- 主题切换支持

## 文档说明

项目文档位于`docs/`目录下：
- `system_context.puml`: 系统上下文图
- `container.puml`: 容器图
- `component.puml`: 组件图
- `code.puml`: 代码图
- `comparison.md`: Web Worker与传统方案对比

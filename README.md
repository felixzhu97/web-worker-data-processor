# Web Worker 数据处理器

这是一个基于Next.js的Web应用，利用Web Worker进行数据处理，包含丰富的UI组件库。

## 技术栈

- Next.js 15
- TypeScript 5  
- Tailwind CSS 3
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

```
web-worker-data-processor/
├── app/                # Next.js应用路由
│   ├── workers/        # Web Worker脚本
├── components/         # UI组件库
│   ├── ui/             # 基础UI组件  
├── public/             # 静态资源
├── styles/             # 全局样式
├── lib/                # 工具函数
```

## 核心功能

### Web Worker 数据处理
- 使用专用线程处理CSV等大数据文件
- 主线程与Worker线程高效通信
- 进度实时反馈

### UI组件库
- 50+可复用组件
- 暗黑/明亮主题
- 响应式设计

## 配置说明

### Web Worker使用
1. 在`app/workers/`添加Worker脚本
2. 使用`new Worker()`创建实例
3. 通过`postMessage`通信

## 文档资源

- 架构图: `docs/c4/`
- 性能对比: `docs/qa/comparison.md`
- 用户手册: `docs/qa/user_manual.md`
- WebWorker原理: `docs/qa/WebWorker的原理.md`

## 许可证

MIT License

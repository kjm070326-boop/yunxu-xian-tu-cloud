# Phase 3a 笔记

在 `client/` 建好 Vite + React + TypeScript 客户端，`/api` 开发代理指向 `http://localhost:3000`。新增类型化的信封感知 API 客户端（对应已发布的 `/api/v1` 路由）、TanStack Query 钩子、每次写入的幂等键、读取最新 `getstate`/`If-Match`、中文错误映射。

界面按 PLAN.md 实现手机优先的玻璃层级：深色状态栏、修为状态、章节门槛、目标进度、故事打字机（可跳过）、自由行动、快捷操作、底部导航、带候选回复与草稿保存的 NPC 聊天。CSS 含安全区边距、44px 控件、青色可操作态、金色奖励、加载/禁用态与减弱动效支持。

验证通过：`npm test`（7 个文件、53 个测试）、`npx tsc --noEmit`、`npx vite build --config vite.config.ts`（Vite 8 生产包）。客户端只用已装好的依赖。NPC 内容与状态展示有意保持轻量，等服务端内容/角色端点提供更丰富的记录后再补。

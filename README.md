# LinePhone 小手机

LinePhone 是一个可安装到主屏幕的本地 PWA，支持导入与编辑酒馆角色卡、世界书，连续暂存多条聊天气泡后再统一请求 AI。

线上地址：<https://jhyshl.github.io/xiaoshouji/>

## Vue 源码

所有界面、功能和数据逻辑均位于 `vue-source/`，以后不再直接维护根目录中的单体 HTML/JS：

```text
vue-source/
├─ src/components/
│  ├─ layout/       手机外框、状态栏、底部导航
│  ├─ home/         首页的独立组件
│  ├─ contacts/     联系人和消息列表
│  ├─ chat/         聊天、气泡、编辑弹窗、待发送栏
│  ├─ library/      导入、角色卡、世界书及条目编辑
│  ├─ persona/      玩家头像与玩家人设
│  └─ settings/     API、模型、上下文、提示词与备份
├─ src/composables/ 业务操作
├─ src/services/    IndexedDB、AI、提示词和导入解析
├─ src/store/       全局响应式状态与旧数据迁移
└─ src/utils/       通用工具
```

根目录的 `index.html`、`assets/`、`manifest.webmanifest`、`sw.js` 和 `icons/` 是 Vite 生成的 GitHub Pages 成品。

## 本地构建

```bash
cd vue-source
pnpm install
pnpm run build
```

Vite 的部署基础路径固定为 `/xiaoshouji/`。构建后将 `vue-source/dist/` 中的内容发布到仓库根目录。

## 数据兼容

数据库仍使用同源 IndexedDB：`linephone-db` / `app` / `state`。Vue 版会迁移已有聊天、角色卡、世界书、头像和设置，并为旧数据补充可编辑的 `replyRules`。

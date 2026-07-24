# LinePhone 小手机

LinePhone 是一个可安装到主屏幕的本地 PWA，支持导入与编辑酒馆角色卡、世界书，连续暂存多条聊天气泡后再统一请求 AI。

线上地址：<https://jhyshl.github.io/xiaoshouji/>

## Vue 源码

所有界面、功能和数据逻辑均位于 `vue-source/`，以后不再直接维护根目录中的单体 HTML/JS：

```text
vue-source/
├─ src/components/
│  ├─ layout/       手机外框、状态栏、底部导航
│  ├─ home/         可分页、可长按拖动的桌面组件
│  ├─ contacts/     联系人和消息列表
│  ├─ chat/         聊天、气泡、编辑弹窗、待发送栏
│  ├─ library/      导入、角色卡、世界书及条目编辑
│  ├─ persona/      玩家头像与玩家人设
│  ├─ auth/         Discord 登录与访问门禁
│  ├─ account/      Discord 身份和验证状态
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

数据库仍使用同源 IndexedDB：`linephone-db` / `app`。登录后以 Supabase 用户 ID 隔离本地状态；首次登录会把旧的 `state` 数据迁移给第一个账户。Vue 版会迁移已有聊天、角色卡、世界书、头像和设置，并为旧数据补充可编辑的 `replyRules`。

桌面图标、组件顺序和所在分页也保存在同一个本地数据库中。

## 访问控制

网页使用 Supabase Auth 的 Discord OAuth 登录。登录后的 Edge Function 会核验指定 Discord 社区和身份组，通过后才激活账户。Discord OAuth 令牌只用于即时核验并会从前端会话中清除；服务端 secret 不会进入网页构建产物。

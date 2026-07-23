# LinePhone 小手机

LinePhone 是一个可独立打开、可安装到手机桌面的本地 PWA 小手机。

## 已实现

- 更接近真实手机的桌面、状态栏、应用入口和底部导航
- 导入并在前端编辑 SillyTavern 常见 JSON / PNG 角色卡
- 导入并编辑 JSON 世界书与角色卡内嵌世界书
- 单独开启或关闭世界书条目
- 自定义玩家人设、玩家头像与角色头像
- 暴露并可编辑系统提示词模板，支持实时预览
- 点击发送后先生成玩家气泡并进入待提交状态，不立即调用 AI
- 点击“确认并发送给 AI”后统一提交全部待发气泡
- 自定义 AI 可见的上下文轮数；一轮玩家消息或一轮 AI 回复各计 1 条
- 长按或右键消息气泡后编辑、删除
- 从兼容接口拉取模型列表后直接选择模型
- 强制短回复，并把 AI 的每一句拆成独立气泡
- 每个角色独立聊天记录
- IndexedDB 本地保存
- 完整数据备份与恢复（API Key 不进入备份）
- Service Worker 离线应用壳

## 发布

这是纯静态项目，不需要安装依赖或运行构建命令。把本目录中的全部文件放在静态网站根目录即可。

GitHub 仓库根目录至少应当包含：

```text
index.html
app.js
styles.css
manifest.webmanifest
sw.js
icons/
```

使用 HTTPS 发布后，可以在 Android Chrome 或 iPhone Safari 中添加到主屏幕。

## API 说明

填写 OpenAI Chat Completions 兼容接口和 API Key 后，点击“拉取模型”，再从列表选择模型。部分服务商不允许浏览器直接跨域请求，此时需要 Cloudflare Worker 等代理。

系统提示词支持以下占位符：

```text
{{char}}
{{user}}
{{player_persona}}
{{character_card}}
{{worldbook}}
{{reply_rules}}
```

不要把自己的统一 API Key 写进公开源码。当前版本的 Key 只保存在玩家自己的设备中。


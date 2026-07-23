# LinePhone 小手机

LinePhone 是一个可独立打开、可安装到手机桌面的本地 PWA 小手机。

## 已实现

- 简约、INS、线条风移动端界面
- 导入 SillyTavern 常见 JSON / PNG 角色卡
- 导入 JSON 世界书与角色卡内嵌世界书
- 按常驻条目和关键词选择世界书内容
- 连续暂存多条玩家消息，再合并为一次 AI 请求
- 强制短回复，并把 AI 的每一句拆成独立气泡
- 每个角色独立聊天记录
- OpenAI Chat Completions 兼容接口
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

默认填写 OpenAI Chat Completions 接口，也可以使用兼容服务。部分服务商不允许浏览器直接跨域请求，此时需要 Cloudflare Worker 等代理。

不要把自己的统一 API Key 写进公开源码。当前版本的 Key 只保存在玩家自己的设备中。


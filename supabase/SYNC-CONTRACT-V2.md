# LinePhone 同步协议 v2

## 目标

- 完整聊天历史保存在各终端的 IndexedDB 或酒馆本地存档中。
- Supabase 只保留每个账号、每个角色的“当前最新窗口”。
- 同一账号可注册多台设备；设备通过短期事件队列获知变化，再读取最新快照。
- 角色、酒馆存档和小手机聊天分支必须显式绑定，禁止不同角色串记忆。

## 云端实体

每个实体通过 `(user_id, entity_type, entity_id)` 唯一定位。`entity_id` 使用
`character:{tavernCharacterKey}` 或 `character:{phoneCharacterId}`。

| entity_type | 内容 | 保存策略 |
| --- | --- | --- |
| `tavern.active` | 当前酒馆角色、存档 ID、楼层数和摘要边界 | 覆盖 |
| `tavern.summary` | 当前阶段总结、覆盖楼层、来源哈希和过期标记 | 覆盖 |
| `tavern.recent` | 摘要边界之后的原始 user/char 楼层 | 覆盖 |
| `phone.chat` | 当前小手机聊天分支与最近 50 条气泡 | 覆盖 |

`latest_snapshots` 永远只有上述实体的最新 revision。`sync_events` 只承担多设备通知，
客户端收到事件后按实体读取最新快照，因此不会为每次修改永久保存一份完整副本。

## 楼层与自动总结

一楼等于一条玩家消息及其随后的一条角色回复。假设总结间隔为 20：

- 19 楼：没有总结，`tavern.recent` 保存 19 楼。
- 25 楼：`tavern.summary` 覆盖第 1–20 楼，`tavern.recent` 保存第 21–25 楼。
- 40 楼：使用旧总结和第 21–40 楼滚动生成新总结。

酒馆接收器对已覆盖楼层计算 SHA-256。编辑、删除或重 roll 使哈希变化时，接收器会从
当前酒馆存档重新生成总结并覆盖快照。模型暂不可用时，旧总结必须标记 `stale: true`，
小手机不得把过期总结作为事实注入 AI。

## 存档与聊天分支

- 酒馆切换存档后，`tavern.active.saveId` 立即被当前存档覆盖。
- 旧存档的完整内容继续留在酒馆本地，不在云端复制。
- 小手机每个角色可有多个本地分支，分支可绑定 `(tavernCharacterKey, tavernSaveId)`。
- 收到的新 `saveId` 与当前分支不一致时，小手机必须提示：切换到已绑定分支、建立空白分支，或复制当前本地聊天并建立“沿用旧档”的新分支。

## 冲突规则

- 每次写入使用递增 `revision`。
- `commit_sync_change` 在同一事务内更新最新快照并写入事件。
- 低于或等于当前 revision 的写入会被拒绝；客户端读取最新 revision 后重试一次。
- 事件 ID 使用 UUID，重复提交同一事件保持幂等。
- 内容语义采用 latest-state-wins；本地完整历史不因云端窗口覆盖而删除。

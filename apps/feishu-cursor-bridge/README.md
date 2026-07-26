# feishu-cursor-bridge

飞书群机器人 `MEM-AIVisdefect-Agent` ↔ **Cursor SDK Cloud Agent**（默认读 GitHub `Yuhamixli/MEM-AIVisdefect`）。

群里 `@机器人 问题`，或私聊机器人，就会在云端跑 Agent 查仓库后回复。

> **注意**：Cloud Agent 只解决「Cursor 算力在云上」；飞书事件仍需本桥进程在线（长连接）。关机后 `@` 不会回。真正 7×24 需把本服务部署到常开机器。
>
> **知识边界**：机器人答的是 **GitHub `main`**。飞书定稿请 `npm run sync-docs` 进 `docs/agent-knowledge-base/feishu-sync/` 并 push。

## 快速开始

```bash
cd apps/feishu-cursor-bridge
cp .env.example .env
# 填写 CURSOR_API_KEY、FEISHU_APP_ID、FEISHU_APP_SECRET
npm install
npm run watchdog   # 推荐：自带看门狗
# 或 npm start     # 裸跑，断了不会自动拉起
```

健康检查：`http://127.0.0.1:8787/health`

**群晖 NAS 部署**：见 [`docs/SYNOLOGY.md`](./docs/SYNOLOGY.md)（Container Manager + Docker Compose）。  
注意：电脑与 NAS **不要同时**跑两个桥实例。

### 环境变量

| 变量 | 说明 |
|------|------|
| `CURSOR_API_KEY` | [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations) |
| `FEISHU_APP_ID` / `FEISHU_APP_SECRET` | 飞书自建应用凭证 |
| `CURSOR_RUNTIME` | `cloud`（默认）或 `local` |
| `CURSOR_CLOUD_REPO` / `CURSOR_CLOUD_REF` | Cloud Agent 仓库 |
| `CURSOR_MODEL` | Cloud Agent 模型 ID，如 `grok-4.5`、`composer-2.5`（可用 `Cursor.models.list` 查） |
| `REQUIRE_MENTION` | 群聊是否必须 @，默认 `true` |
| `RECENT_CHAT_LIMIT` | @ 时附带最近群消息条数，默认 `40`；`0` 关闭 |
| `FEISHU_SYNC_FOLDER_TOKEN` | `npm run sync-docs` 根文件夹 |

### 飞书开放平台

1. 长连接 + 事件 `im.message.receive_v1`
2. 权限（发布版本后生效）：
   - 获取与发送单聊、群组消息（私聊 + 群聊）
   - 接收群聊中 @ 机器人消息
   - 获取群组中所有消息（可选，附带群聊语境）
   - 云文档只读（`sync-docs`）
3. 应用能力里开启**机器人**，并允许用户主动私聊机器人
4. 发布版本

### 用法

- **群聊**：`@MEM-AIVisdefect-Agent 双周报在哪？`（必须 @）
- **私聊**：直接发问题即可，**不必 @**（桥会把 p2p 消息全部当作对机器人说话）
- 发 `重置` — 清空**你个人**的 Agent 会话
- 只发「hi / 在吗」等空 ping — 短回提示，不跑 Cloud Agent

### 飞书文档 → Git

```bash
cd apps/feishu-cursor-bridge
npm run sync-docs
# → docs/agent-knowledge-base/feishu-sync/ (+ INDEX.md)
git add ../../docs/agent-knowledge-base/feishu-sync
git commit -m "Sync Feishu docs into knowledge base"
git push
```

### 群聊上下文

默认拉取该群最近约 40 条消息塞进 prompt（仅作语境，以当前问题为准）。  
需 `im:message` / 历史只读权限；未开通则跳过附带，不影响回答仓库问题。

## 故障排查

| 现象 | 处理 |
|------|------|
| `@` / 私聊无响应 | 先看 `http://<桥>:8787/health` 是否 `ok`+`wsReady`；再查长连接与事件订阅 |
| 仅群可用、私聊不行 | 开放平台权限含「单聊」消息，并允许私聊机器人后重新发布 |
| `Cursor Agent 运行失败（run=…）` | 多为云端瞬时故障；发「重置」再问。桥已对失败自动重试一次。查 NAS 日志看 `[cursor] run error` |
| 群聊语境未附带 | 开通消息历史权限并发布版本 |
| sync-docs 失败 | 开通云空间/云文档只读 |
| Cursor 401 | 检查 `CURSOR_API_KEY` |

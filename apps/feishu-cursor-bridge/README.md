# feishu-cursor-bridge

飞书群机器人 `MEM-AIVisdefect-Agent` ↔ **Cursor SDK Cloud Agent**（默认读 GitHub `Yuhamixli/MEM-AIVisdefect`）。

群里 `@机器人 问题`，或私聊机器人，就会在云端跑 Agent 查仓库后回复。

> **注意**：Cloud Agent 只解决「Cursor 算力在云上」；飞书事件仍需本桥进程在线（长连接）。关机后 `@` 不会回。真正 7×24 需把本服务部署到常开机器。
>
> **知识边界**：机器人答的是 **GitHub `main`**，不是飞书未入库草稿。飞书定稿必须同步进 `docs/agent-knowledge-base/` 并 push，见知识库 README「飞书 ↔ GitHub 知识同步」。

## 快速开始

```bash
cd apps/feishu-cursor-bridge
cp .env.example .env
# 填写 CURSOR_API_KEY、FEISHU_APP_ID、FEISHU_APP_SECRET
npm install
npm start
```

保持此进程在线（本机可访问公网即可，**不需要**公网回调 URL）。

### 环境变量

| 变量 | 说明 |
|------|------|
| `CURSOR_API_KEY` | [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations) |
| `FEISHU_APP_ID` / `FEISHU_APP_SECRET` | 飞书自建应用凭证 |
| `CURSOR_RUNTIME` | `cloud`（默认）或 `local` |
| `CURSOR_CLOUD_REPO` | Cloud Agent 仓库 URL |
| `CURSOR_CLOUD_REF` | 默认 `main` |
| `REPO_CWD` | 仅 local；默认仓库根 |
| `CURSOR_MODEL` | 默认 `composer-2.5` |
| `REQUIRE_MENTION` | 群聊是否必须 @机器人，默认 `true` |

### 飞书开放平台配置（一次性）

1. 应用 **MEM-AIVisdefect-Agent** → **事件与回调**
2. 订阅方式选 **使用长连接接收事件**（先 `npm start` 再保存）
3. 添加事件：`im.message.receive_v1`（接收消息）
4. 权限：`im:message`、`im:message.group_at_msg`（或等价「获取与发送单聊/群组消息」）并发布版本
5. 机器人能力已开启；机器人已在群「03组-拉挤外观检测」中

### 用法

- 群：`@MEM-AIVisdefect-Agent 双周报在哪个飞书目录？`
- 私聊：直接发问题
- 重置会话上下文：发 `重置` / `reset`

同一群会复用同一个 Cursor `agentId`（存在 `.data/sessions.json`）。

## 设计要点

- 事件处理 **3 秒内返回**；Cursor 跑在后台，先回「处理中」再回结果
- 默认 **只读回答**（system preamble）；明确说「改代码」才会动仓库
- 符合 ADR-002：不整包上小诺 runtime，用 Cursor 控制面接飞书

## 故障排查

| 现象 | 处理 |
|------|------|
| `@` 无反应 | 确认本进程在跑 + 长连接已保存 + 事件已订阅 |
| Cursor 401 | 检查 `CURSOR_API_KEY` |
| 文件夹空 | 与桥无关：成员需先加入企业再开共享盘 |

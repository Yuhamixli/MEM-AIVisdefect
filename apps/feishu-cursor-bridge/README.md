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
| `FEISHU_SYNC_FOLDER_TOKEN` | `sync-docs` / `tidy-drive` 共享盘根文件夹 |
| `CONVERSATION_LOG` | 是否落盘全部用户↔机器人对话（含私聊），默认 `true` |
| `ADMIN_TOKEN` | 访问对话管理页的密钥；未设置则 `/admin` 关闭 |

### 查看全员与机器人的对话（含私聊）

飞书客户端**无法**打开别人与机器人的私聊。本桥在 NAS 上做**组织运维日志**（仅管理员）：

1. 设置管理员密钥（二选一）：
   - `.env` 里 `ADMIN_TOKEN=...`，或
   - 项目目录放文件 `admin.token`（一行密钥；群晖上更可靠）
   - 并保持 `CONVERSATION_LOG=true`
2. 浏览器打开（仅局域网 / 持有 token 者）：

```text
http://<NAS或本机IP>:8787/admin/conversations?token=<ADMIN_TOKEN>
```

JSON：`.../admin/conversations?token=...&format=json`  
单会话：`.../admin/conversations/<sessionKey>?token=...`

落盘路径（容器卷）：`.data/conversations/YYYY-MM-DD.jsonl`（随 `bridge-data` 持久化）。

> **隐私**：日志含私聊全文，只给运维/课题负责人；勿把 `ADMIN_TOKEN` 发到群里或提交 Git。

**飞书官方补充**（若企业已开通）：管理后台 → 安全 / 合规 → **消息审计**（名称因版本而异），可按策略审计会话；需管理员权限与对应套餐，与桥日志互为补充。

### 飞书开放平台

1. 长连接 + 事件 `im.message.receive_v1`
2. 权限（发布版本后生效）：
   - 获取与发送单聊、群组消息（私聊 + 群聊）
   - 接收群聊中 @ 机器人消息
   - 获取群组中所有消息（可选，附带群聊语境）
   - 云文档只读（`sync-docs`）
   - **通讯录**（对话日志显示姓名）：`contact:user.base:readonly` 或「获取用户基本信息」；若无此权限，桥会尝试用群成员列表补全姓名（需群成员只读相关权限）
3. 应用能力里开启**机器人**，并允许用户主动私聊机器人
4. 发布版本

对话日志「姓名」解析顺序：事件/回填里的 name → `.data/user-names.json` 缓存 → Contact API → 群成员列表。无通讯录权限时仍会尽量显示，否则管理页姓名为「（未知）」并附 open_id。

### 用法

- **群聊**：`@MEM-AIVisdefect-Agent 双周报在哪？`（必须 @）
- **私聊**：直接发问题即可，**不必 @**（桥会把 p2p 消息全部当作对机器人说话）
- 发 `重置` — 清空**你个人**的 Agent 会话
- 只发「hi / 在吗」等空 ping — 短回提示，不跑 Cloud Agent
- Agent 长回复若含 Markdown：飞书侧用 **`post` + `md`** 渲染（代码块/列表/加粗/链接）；短确认句仍用纯 `text`。单段约 ≤2800 字，超长会拆条发送

### 飞书文档 → Git

```bash
cd apps/feishu-cursor-bridge
npm run sync-docs
# → docs/agent-knowledge-base/feishu-sync/ (+ INDEX.md)
git add ../../docs/agent-knowledge-base/feishu-sync
git commit -m "Sync Feishu docs into knowledge base"
git push
```

### 整理共享盘根目录

```bash
npm run tidy-drive          # 预览
npm run tidy-drive:apply    # 执行：建齐 NN 文件夹、把根目录散落文件归位
```

CI 每天 08:30（北京时间）自动跑（见 `.github/workflows/tidy-feishu-drive.yml`）。`push-docs` 已按 `docs/feishu-push-manifest.json` 的 `folderRoutes` 直接写入子文件夹，避免再堆根目录。

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

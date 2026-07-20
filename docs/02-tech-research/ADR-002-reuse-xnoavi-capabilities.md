# ADR-002：复用 XnoAvi（小诺）平台能力

**状态**: Proposed  
**日期**: 2026-07-12  
**决策者**: 项目组（待课题管理者确认）  
**源仓库**: `/Users/zz/Documents/GitHub/XnoAvi`（中航小诺 / xnobot）

---

## 1. 背景

MEM-AIVisdefect 已具备 `PROMPT.md`、`docs/agent-knowledge-base/`、`docs/feedback-inbox/`、`apps/bi` 管理看板。同类「智能体搭建 / 知识库 / 意见消化」能力在 XnoAvi 已工程化。课题侧应避免重复造轮子，同时**不要**把小诺整包 runtime（商网、司库、Evolution）拖进本仓库。

本 ADR 固定复用边界与 1–2 周落地路线。

---

## 2. 决策（结论先看）

1. **不**整包引入 xnobot runtime（商网桥 / 司库 DuckDB / Evolution Swarm 与课题无关且部署重）。
2. **优先复用** Cursor 控制面：skills / rules / handoff、知识分层约定、inbox → digest 流程；飞书侧用 `apps/feishu-cursor-bridge`（Cursor SDK 本地 Agent）接群机器人，**不**接小诺 gateway。
3. **Phase 2 试点**轻量 RAG：用 xnobot knowledge ingest 指向本仓库知识目录（或等价独立 ingest），不绑 gateway。
4. **裁剪引入** Agent Card：领域角色卡（标注 / 详设 / 实验）先落文档 + JSON，不接 spawn/crew gateway。
5. **永久自建**缺陷检测领域：拉挤工艺、七类缺陷、ADR-001 视觉栈、光学方案、数据集、50 件测试、`detector-ui`。

---

## 3. Top 5 可复用能力

| # | 能力 | XnoAvi 参考路径 | 对本课题的价值 |
|---|------|-----------------|----------------|
| 1 | Cursor 控制面 + Skills | `XnoAvi/workspace/AGENTS.md`；`XnoAvi/.cursor/rules/`（含 `xnoavi-dev.mdc`、`context-cost-governance.mdc`）；`XnoAvi/.cursor/skills/`（尤其 `agent-handoff`、`pm-workbench`） | 13 人课题长 session 的 handoff、上下文预算、门禁式 PM 工作流 |
| 2 | 分层知识库 + RAG 治理 | `XnoAvi/workspace/knowledge/`；`XnoAvi/xnobot/agent/knowledge/`；`XnoAvi/docs/knowledge-governance-architecture.md`；CLI：`xnobot knowledge ingest` / `governance *` | 长期/短期/学习/待学习分层；Chroma+BGE；dedup/freshness/trust |
| 3 | 意见/信号 → digest 闭环 | `XnoAvi/workspace/learning-inbox/`；与 MEM `docs/feedback-inbox/` 同类模式 | inbox → owner → digest → **不自动改章程**（MEM 已部分对齐） |
| 4 | 智能体工厂（Agent Card） | `XnoAvi/docs/agent-factory/DESIGN.md`；`XnoAvi/xnobot/platform/agent_card.py`；`xnobot platform agent-card *` | 目标/工具 allowlist/验收/风险级 → 可编译 spawn；本课题先裁剪为 JSON 角色卡 |
| 5 | 能力台账 / 策展索引 | `XnoAvi/workspace/knowledge/长期/capabilities/`（含 `manifest.json`） | ADR 索引 + capabilities stub，避免知识只堆 md |

**扩展（按需，非本期默认）**

- MCP：`workspace/mcp-servers/`、`config.tools.mcp`
- 部署：`DEPLOY.md`、`xnobot up`、`ui/` Dashboard
- 鉴权治理：`content_guard`、path_policy、Agent Card `risk_tier`
- 办公交付 skills：`formal-docx-polish`、`deliverables-bundle-polish`

---

## 4. 对照表：直接复用 / 适配接入 / 自建

### 4.1 直接复用（模式与文档，少改代码）

| 项 | 来源 | 落点（MEM） |
|----|------|-------------|
| `agent-handoff` skill | `XnoAvi/.cursor/skills/agent-handoff/` | 复制到 `.cursor/skills/agent-handoff/`，去小诺专有 INV 引用或改写 |
| 上下文成本治理规则 | `XnoAvi/.cursor/rules/context-cost-governance.mdc` | 精简并入 `.cursor/rules/` |
| 知识库 tier 语义 | `XnoAvi/workspace/knowledge/README.md` | 映射进 `docs/agent-knowledge-base/README.md`（约定即可） |
| inbox→digest 纪律 | XnoAvi learning-inbox；MEM 已有 `feedback-inbox.mdc` | 保持「digest 不自动改章程」 |
| `pm-workbench` 思想 | `XnoAvi/.cursor/skills/pm-workbench/` | 开题/详设/中期 → discover → PRD → ship-check（Cursor 内，不引 runtime） |
| capabilities / ADR 索引 | `workspace/knowledge/长期/capabilities/manifest.json` | `docs/02-tech-research/README.md` + capabilities stub |

### 4.2 适配后接入（Phase 2）

| 项 | 做法 | 边界 |
|----|------|------|
| 轻量 RAG | `xnobot knowledge ingest` 指向 `docs/agent-knowledge-base/`（及 BI `public/knowledge/` 镜像）；或独立 Chroma 目录 | **不**搬司库/商网配置 |
| Agent Card（裁剪） | 为 `struct-eng` / `data` / `algo-detect` 等写角色卡 JSON | 仅文档+JSON，不接 gateway |
| `.cursor/rules` 短规则 | 合并 `feedback-inbox.mdc` + XnoAvi INV 子集 → `mem-agent.mdc` | 控制篇幅，避免规则膨胀 |
| BI 知识检索 | 现有 `knowledge-index.json` → hybrid / `knowledge_search` | 先评估再接 API |
| MCP（可选） | 暴露 BI 写回、实验追踪、数据集元数据给 Cursor | 非开题阻塞项 |

### 4.3 本课题自建（领域特异）

- 拉挤 / 电芯压条工艺知识、`defect-catalog`、七类定义卡
- ADR-001 四层视觉栈与 PatchCore / YOLO / SAM2 / VLM 实验、50 件测试
- `apps/detector-ui/`、离线检测模块 I/O schema
- M币、五节点门禁、申报书 KPI（召回≥80%、准确率≥85% 等）
- 光学采集方案、`raw-data` 版本管理、产线节拍约束

### 4.4 明确排除（本期不做）

| 排除项 | 原因 |
|--------|------|
| 商网 channel / aTrust / `shangwang-bridge` | 内网与课题无关 |
| 司库 DuckDB 工具链 | 财务/司库域，非检测课题 |
| Evolution Swarm / nightly-evolution 全栈 | 平台能力迭代过重；CV 训练另走实验目录 |
| Docker 生产部署 xnobot gateway / 全量 Dashboard | 运维面过大；MEM 已有 Cloudflare BI |

---

## 5. 1–2 周落地路线

| 周 | 动作 | 产出 |
|----|------|------|
| **W1** | 落本 ADR；REPO-TODO `R-B08`；onboarding 指向 ADR-002 | 决策 recorded |
| **W1** | **先复制/改写 `agent-handoff` skill** + 精简 `.cursor/rules/mem-agent.mdc` | Agent 可 handoff |
| **W1** | 知识库 tier 文档对齐 + `capabilities` 索引 stub | 策展有结构 |
| **W2** | PoC：knowledge ingest 指向 MEM 知识目录（只读镜像或 path 配置） | 可语义检索 onboarding / 缺陷 catalog |
| **W2** | 定义 3 张领域 Agent Card 草稿（标注规范 / 详设材料 / 实验记录） | 建议路径：`docs/04-implementation/agent-cards/` |
| **W2** | 评估 BI：继续静态 sync vs 接 `knowledge_search` | 本 ADR Phase 2 附录决议 |

---

## 6. 后果

| 类型 | 说明 |
|------|------|
| 正 | Agent 上下文治理、知识检索、角色分工可加速开题→详设；少造控制面轮子 |
| 负 | 若上 RAG：依赖 Python 3.11+、Chroma、BGE；需与 BI 静态 `sync-spec` 划清边界 |
| 风险 | 误把司库/商网当「通用平台」→ 本 ADR §4.4 显式排除 |

---

## 7. 参考路径（写清）

**XnoAvi（只读参考，不改该仓库）**

- `/Users/zz/Documents/GitHub/XnoAvi/README.md`
- `/Users/zz/Documents/GitHub/XnoAvi/workspace/AGENTS.md`
- `/Users/zz/Documents/GitHub/XnoAvi/workspace/knowledge/README.md`
- `/Users/zz/Documents/GitHub/XnoAvi/docs/knowledge-governance-architecture.md`
- `/Users/zz/Documents/GitHub/XnoAvi/docs/agent-factory/DESIGN.md`
- `/Users/zz/Documents/GitHub/XnoAvi/.cursor/skills/agent-handoff/SKILL.md`
- `/Users/zz/Documents/GitHub/XnoAvi/.cursor/skills/pm-workbench/SKILL.md`
- `/Users/zz/Documents/GitHub/XnoAvi/.cursor/rules/context-cost-governance.mdc`
- `/Users/zz/Documents/GitHub/XnoAvi/.cursor/rules/xnoavi-dev.mdc`

**MEM（本仓库）**

- `PROMPT.md`
- `docs/agent-knowledge-base/README.md`
- `docs/feedback-inbox/README.md`
- `docs/02-tech-research/ADR-001-four-layer-vision-stack.md`
- `docs/project-management/REPO-TODO.md`（R-B08）
- `apps/bi/scripts/sync-spec.mjs`（知识目录同步）

远程（可选）：`https://github.com/Yuhamixli/XnoAvi.git`

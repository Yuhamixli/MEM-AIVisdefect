# 仓库建设待办（REPO TODO）

**更新**: 2026-07-11  
**范围**: 本 Git 仓库要建成什么样（产品/基础设施），不是课题周任务本身  
**对照**: 课题运营待办见 [`TODO.md`](./TODO.md)

> 原则：先搭**管理可读、Agent 可消费**的骨架；前端与检测能力按门禁分期，避免一上来堆算法代码。

---

## 总览

| 轨道 | 目标 | 当前 |
|------|------|------|
| A 文档与控制面 | PROMPT / docs / `.project-spec` 可维护 | 初版 + README 双入口 |
| B Agent 知识库 | 结构化知识 + 原始数据约定 + **意见箱** | 规范已写；feedback-inbox 已建 |
| C 管理数据层 | 章程/风险/里程碑/M币/TODO 机器可读 | JSON 部分有；CSV 表头有 |
| D 前端 BI | 管理看板（进度/风险/M币/团队/知识/意见箱） | **v0.2**：读免登 + 意见箱口令写；待配 Cloudflare secrets 公布 URL |
| E 检测应用 | 可视化检测 UI / 演示 | 未建（门禁后） |
| F 数据与实验工程 | raw→版本集、实验脚本、追踪 | 仅模板 |
| G 工程卫生 | gitignore、目录约定、CI | gitignore + 仓库地图已做 |

---

## A — 文档与控制面

| ID | 事项 | 状态 | 优先级 | 产出路径 |
|----|------|------|--------|----------|
| R-A01 | 根 README 导航补全（双 TODO 入口） | 完成 | P0 | `README.md` |
| R-A02 | `docs/` 各目录加简短 INDEX（人读） | 待办 | P1 | 各 `docs/*/README.md` |
| R-A03 | 变更控制一页纸落库 | 完成 | P1 | `docs/project-management/change-control.md` |
| R-A04 | 会议纪要目录约定 | 待办 | P2 | `docs/05-reporting/meetings/` |
| R-A05 | PROMPT 与章程字段定期对账检查清单 | 待办 | P2 | `docs/agent-knowledge-base/` |

## B — Agent 知识库

| ID | 事项 | 状态 | 优先级 | 产出路径 |
|----|------|------|--------|----------|
| R-B01 | 知识库目录规范 | 完成 | P0 | `docs/agent-knowledge-base/README.md` |
| R-B02 | 缺陷图谱占位表 | 完成 | P1 | `.../defect-catalog.md` |
| R-B02b | 入门包：行业背景 + 技术导读 + onboarding | 完成 | P1 | `industry-background.md` 等 |
| R-B03 | 团队档案表（md + csv） | 进行中 | P0 | `team-roster.md` / `.csv` |
| R-B04 | 原始数据约定 + 大文件不进 git | 完成 | P0 | `raw-data/` + `.gitignore` |
| R-B05 | ADR 索引 | 待办 | P1 | `docs/02-tech-research/README.md` |
| R-B06 | Agent「当前状态」单一入口强化 | 待办 | P0 | `progress-status.md` 或根 `STATUS.md` |
| R-B07 | 意见与需求收集箱 + 定时消化约定 | 完成 | P0 | `docs/feedback-inbox/` |

## C — 管理数据层（给 BI / Agent 用）

| ID | 事项 | 状态 | 优先级 | 产出路径 |
|----|------|------|--------|----------|
| R-C01 | `todo-catalog.json` | 待办 | P1 | `.project-spec/todo-catalog.json` |
| R-C02 | `repo-todo-catalog.json` | 待办 | P1 | `.project-spec/repo-todo-catalog.json` |
| R-C03 | M币 ledger JSON 与 md 双写 | 待办 | P1 | `.project-spec/m-coin-ledger.json` |
| R-C04 | 团队名册 CSV 表头 | 完成 | P0 | `team-roster.csv` |
| R-C05 | `.project-spec` schema 说明 | 待办 | P2 | `.project-spec/README.md` |

## D — 前端 BI（管理看板）

| ID | 事项 | 状态 | 优先级 | 产出路径 |
|----|------|------|--------|----------|
| R-D01 | 选定技术栈（Vite + React + TS） | 完成 | P0 | `apps/bi/` |
| R-D02 | 脚手架 + 设计 token | 完成 | P0 | `apps/bi/` |
| R-D03 | L0 总览：里程碑灯 / 预算执行率 / 开放风险 | 完成 | P0 | `/` |
| R-D04 | M币五账户页 | 完成 | P0 | `/budget` |
| R-D05 | 团队完整率 / 角色缺口 | 完成（占位） | P1 | `/team` |
| R-D06 | 质量 KPI 灰显占位 | 完成 | P1 | 总览页 |
| R-D07 | 读 `.project-spec` 的数据适配层 | 完成 | P0 | `sync-data` + `src/data/` |
| R-D08 | 部署方式决策 | 完成 | P0 | Cloudflare Pages + Function 写回 GitHub |
| R-D09 | 知识库浏览页（同步 docs + 检索） | 完成 | P0 | `/knowledge` |
| R-D10 | 意见箱网页表单 | 完成 | P0 | `/feedback` → `inbox/` |
| R-D11 | 写口令门（读免登） | 完成 | P0 | `WRITE_PASSWORD` + session |

## E — 检测应用（演示 UI，门禁后）

| ID | 事项 | 状态 | 优先级 | 触发 |
|----|------|------|--------|------|
| R-E01 | `apps/detector-ui/` 范围说明（与 BI 分离） | 待办 | P1 | M3 前后 |
| R-E02 | 图像回放 + 框/掩码叠加 | 暂缓 | P2 | 有样本 |
| R-E03 | 报警/缺陷列表与导出 | 暂缓 | P2 | M4 |
| R-E04 | 推理服务接口草稿 | 暂缓 | P2 | 有模型 |

## F — 数据与实验工程

| ID | 事项 | 状态 | 优先级 | 产出路径 |
|----|------|------|--------|----------|
| R-F01 | `data/` 与 `raw-data` 关系说明 | 待办 | P1 | `docs/data-management/` |
| R-F02 | 数据集版本登记模板 | 待办 | P1 | `dataset-versions.md` |
| R-F03 | 实验目录与模板联动 | 待办 | P2 | `docs/experiment-tracking/` |
| R-F04 | `scripts/mcoin_summary.py` | 待办 | P1 | `scripts/` |
| R-F05 | 训练代码目录约定 | 暂缓 | P2 | 门禁开后 |

## G — 工程卫生

| ID | 事项 | 状态 | 优先级 | 产出路径 |
|----|------|------|--------|----------|
| R-G01 | `.gitignore` | 完成 | P0 | `.gitignore` |
| R-G02 | README 仓库地图 | 完成 | P0 | `README.md` |
| R-G03 | `.cursor/rules` 项目管理短规则 | 待办 | P1 | `.cursor/rules/` |
| R-G04 | 贡献/提交约定 | 待办 | P2 | README 节或 `CONTRIBUTING.md` |
| R-G05 | 基础 CI（可选） | 待办 | P2 | `.github/workflows/` |

---

## 建议建设顺序

```
P0 近下一步（仓库侧）:
  ✅ BI v0.1（总览 / M币 / 团队）
  ✅ BI v0.2（知识库 + 意见箱网页 + Cloudflare 部署流水线）
  R-B06 状态单一入口
  R-F04 mcoin 汇总脚本
  配置 Cloudflare / GitHub secrets 并公布 BI 公开 URL

P1:
  机器可读双写 R-C01–C03
  知识库内容 R-B02 / ADR 索引
  变更控制 R-A03
  BI：名册 CSV 真实统计接入

门禁后:
  R-E* 检测 UI；R-F05 训练树
```

---

## 已完成（仓库侧）

| ID | 事项 | 完成日 |
|----|------|--------|
| R-0 | 控制面、docs 骨架、`.project-spec`、模板 | 2026-07-11 |
| R-0b | 课题 TODO、WBS、BI 指标纸、M币开账 | 2026-07-11 |
| R-0c | 本 REPO-TODO | 2026-07-11 |
| R-D01–D07 | BI v0.1：Vite/React、总览/M币/团队、spec 同步 | 2026-07-11 |
| R-D08–D11 | BI v0.2：Cloudflare 部署、知识库、意见箱口令表单 | 2026-07-11 |

---

## 边界

| 类型 | 文件 | 例子 |
|------|------|------|
| 课题运营 | [`TODO.md`](./TODO.md) | 见张老师、收名册、周报 |
| 仓库建设 | 本文件 | 搭 BI、知识库、gitignore、apps/ |

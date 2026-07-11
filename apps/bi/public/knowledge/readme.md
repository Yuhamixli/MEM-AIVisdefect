# MEM-AIVisdefect

复合材料拉挤成型表面缺陷的机器视觉在线检测项目。  
课题重心：**项目管理 + M币财务**；仓库同步建设文档、知识库与 BI。

## 双待办入口

| 类型 | 文件 | 管什么 |
|------|------|--------|
| 课题运营 | [`docs/project-management/TODO.md`](docs/project-management/TODO.md) | 见老师、名册、周报、里程碑 |
| 仓库建设 | [`docs/project-management/REPO-TODO.md`](docs/project-management/REPO-TODO.md) | 前端 BI、知识库、数据层、工程卫生 |

## 目标

| 指标 | 目标值 |
|------|--------|
| 检出率 (DR) | ≥ 95% |
| 分类准确率 | ≥ 90% |
| 误检率 (FPR) | ≤ 5% |
| 检测周期 | ≤ 产线节拍 |
| 成本货币 | 700,000 M币 |

## 仓库地图

```
PROMPT.md                 Agent 控制面
.project-spec/            机器可读：章程、风险、里程碑、M币
docs/
  feedback-inbox/         ★ 意见与需求收集箱（inbox → digest）
  project-management/     TODO / REPO-TODO / WBS / M币 / 名册
  agent-knowledge-base/   知识库 + raw-data 约定
  01–05, quality, …       调研、需求、汇报等
templates/                纪要、周报、实验模板
scripts/                  工具脚本（MLflow 等）
apps/                     bi/（管理看板）· detector-ui（待建）
```

## 快速导航

| 用途 | 路径 |
|------|------|
| AI Agent 控制面 | [`PROMPT.md`](PROMPT.md) |
| 课题 TODO | [`docs/project-management/TODO.md`](docs/project-management/TODO.md) |
| 仓库 TODO | [`docs/project-management/REPO-TODO.md`](docs/project-management/REPO-TODO.md) |
| BI 看板应用 | [`apps/bi/`](apps/bi/) | 本地：`cd apps/bi && npm i && npm run sync-data && npm run dev:api` + `npm run dev`；部署见该目录 README（Cloudflare Pages） |
| 团队能力画像 | [`docs/project-management/team-capability-profile.md`](docs/project-management/team-capability-profile.md) |
| 行业难点 | [`docs/agent-knowledge-base/industry-challenges.md`](docs/agent-knowledge-base/industry-challenges.md) |
| 入门导读 | [`docs/agent-knowledge-base/onboarding-guide.md`](docs/agent-knowledge-base/onboarding-guide.md) |
| 变更控制 | [`docs/project-management/change-control.md`](docs/project-management/change-control.md) |
| 意见与需求箱 | [`docs/feedback-inbox/`](docs/feedback-inbox/) | **推荐** BI「意见箱」网页填写；备选直接丢 `inbox/` |
| 机器可读状态 | [`.project-spec/`](.project-spec/) |
| 知识库 | [`docs/agent-knowledge-base/`](docs/agent-knowledge-base/) |

## 当前阶段

**规划** — 管理底座已起；BI 支持知识免登浏览与意见箱口令填写；待配置 Cloudflare secrets 后公布公开 URL。

| 项 | 值 |
|----|-----|
| 指导老师 | 张老师、朱老师（清华） |
| 团队 | 13 人（角色待评估） |
| 周期 | 2026-07-11 ~ 2026-10-11 |
| 预算 | 700,000 M |
| 数据 | 不急；约定目录已备 |

## 里程碑

| ID | 名称 | 完成标准 |
|----|------|----------|
| M1 | 需求确认 | 需求确认、数据策略明确 |
| M2 | 基线实验 | 基线可跑（门禁后） |
| M3 | 算法锁定 | 方案收敛 |
| M4 | 系统集成 | 检测 UI + BI 可演示 |
| M5 | 场景验证 | DR ≥ 95% |
| M6 | 项目收尾 | 归档 + M币结算 |

## 给 Agent

载入 `PROMPT.md`；待办同时看 `TODO.md`（运营）与 `REPO-TODO.md`（仓库建设）。默认**管理优先**，未经课题管理者同意不深潜训练代码。

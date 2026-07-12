# 汇报与沟通（05-reporting）

**更新**: 2026-07-12

本目录放**对外/对内汇报产物**与**会议过程资产**。模板在仓库根 `templates/`。

| 子路径 | 用途 |
|--------|------|
| [`meetings/`](./meetings/) | 会议纪要（含导师会、周会）；见目录 README |
| [`daily/`](./daily/) | 日报/周报落盘（可按 `YYYY-Www-weekly.md` 命名） |
| [`phase/`](./phase/) | 阶段总结报告（详设/中期/完成/结题等） |
| 根下 `2026-*-*.md` | 历史/一次性汇报提纲（如见张老师准备稿） |

## 机制一览

1. **会前**：议程可写在议题清单 [`../project-management/open-decisions.md`](../project-management/open-decisions.md)（需求澄清范围；默认决策卡，勿逐项 SWOT）或临时 brief。  
2. **会后 24h 内**：按 [`meetings/README.md`](./meetings/README.md) 写纪要（决议、待办、M币影响、原则对齐）。  
3. **每周**：周报用 [`../../templates/weekly-report.md`](../../templates/weekly-report.md) → 写入 `daily/`。  
4. **阶段门禁**：阶段报告用 [`../../templates/phase-report.md`](../../templates/phase-report.md) → 写入 `phase/`。  
5. **评价原则**：汇报叙事优先准确度/效率/成本，见 [`../project-management/evaluation-principles.md`](../project-management/evaluation-principles.md)。

BI：上述关键 md 经 `apps/bi` 的 `npm run sync-data` 进入知识库。

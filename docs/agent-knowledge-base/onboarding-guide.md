# 新队员入门导读（必读路径）

**更新**: 2026-07-12  
**读者**: 刚加入的课题成员  
**目标**: 2 小时内建立共同语言；不要求会训练模型

---

## 你先搞清三件事

1. 我们做的是新能源汽车**电芯压条**拉挤成型表面缺陷视觉检测（不是泛 CV 竞赛）。考核以**申报书**为准：召回≥80%、准确率≥85%、≥3 类、50 件测试；七类缺陷为**裂纹、气泡、缺纱、划伤、异物、发白、脏污**（旧 DR≥95% 等仅为内部冲刺）。  
2. 课题管理者抓 **范围 / 进度 / M币 / 风险**；技术按**五节点**（开题→详设→中期→完成→结题）门禁推进。评价看**准确度 / 效率 / 成本**，不看算法花哨度（见 [`../project-management/evaluation-principles.md`](../project-management/evaluation-principles.md)）。  
3. 有想法先丢 **意见箱**，不要私下改需求。待拍板议题见 [`../project-management/open-decisions.md`](../project-management/open-decisions.md)。

---

## 阅读顺序（建议 90–120 分钟）

| 步 | 文件 | 分钟 | 读完应能回答 |
|----|------|------|--------------|
| 1 | 本文件 | 5 | 我该按什么顺序学 |
| 2 | [`pultrusion-basics.md`](./pultrusion-basics.md) | 10 | 拉挤是什么、缺陷从哪来 |
| 3 | [`industry-background.md`](./industry-background.md) | 15 | 为什么有市场、痛点是什么 |
| 3b | [`industry-challenges.md`](./industry-challenges.md) | 15 | 行业真正难在哪、我们怎么选战场 |
| 4 | [`defect-catalog.md`](./defect-catalog.md) | 15 | 七类缺陷怎么叫、多严重 |
| 4b | [`../project-management/operation-plan-from-proposal.md`](../project-management/operation-plan-from-proposal.md) | 15 | 申报交付、五节点、模块 WBS |
| 5 | [`vision-tech-primer.md`](./vision-tech-primer.md) | 20 | 检测/分割/异常检测在说什么 |
| 6 | [`../03-requirements/requirements.md`](../03-requirements/requirements.md) | 15 | 我们承诺交什么 |
| 7 | [`../project-management/change-control.md`](../project-management/change-control.md) | 10 | 想改范围走哪 |
| 7b | [`../project-management/evaluation-principles.md`](../project-management/evaluation-principles.md) | 5 | 评价看什么、不看什么 |
| 7c | [`../project-management/open-decisions.md`](../project-management/open-decisions.md) | 5 | 当前待沟通议题有哪些 |
| 8 | [`../project-management/m-coin-cost-system.md`](../project-management/m-coin-cost-system.md) | 10 | M币怎么花、怎么报 |
| 8b | [`../project-management/team-capability-profile.md`](../project-management/team-capability-profile.md) | 10 | 能力怎么自评、角色怎么匹配 |
| 8c | [`../project-management/team-workstreams.md`](../project-management/team-workstreams.md) | 10 | 团队有哪些工作流、我可能落在哪 |
| 9 | [`../feedback-inbox/README.md`](../feedback-inbox/README.md) | 5 | 意见往哪丢 |
| 10 | BI：http://localhost:5173 （有环境时） | 10 | 项目现在健不健康 |

**选读（角色相关）**

- 算法向：`../02-tech-research/ADR-001-four-layer-vision-stack.md`（先看结论）  
- 平台能力复用策略见 [`../02-tech-research/ADR-002-reuse-xnoavi-capabilities.md`](../02-tech-research/ADR-002-reuse-xnoavi-capabilities.md)  
- 调研向：`../01-industry-research/2026-07-11-market-and-competitors.md`  
- 管理向：`../project-management/operation-plan-from-proposal.md`、`TODO.md`、`team-workstreams.md`（含 `struct-eng` / `agent-ops`）

---

## 入职后 48 小时 checklist

- [ ] 在 `team-roster.csv` / 名册表填好自己的一行  
- [ ] 在 `team-capability.csv` 完成 0–3 能力自评  
- [ ] 加入意见箱：至少读一遍 README  
- [ ] 读过 `industry-challenges.md`，能说出 2 个行业难点  
- [ ] 知道当前节点是**开题（2026-07-12）**，总预算 70 万 M；考核看申报书不是旧 DR95%  
- [ ] 不擅自承诺「在线产线全面闭环」——本期主交付是**采集方案 + 离线检测模块 + 使用说明**

---

## 常见误区

| 误区 | 纠正 |
|------|------|
| 一上来就调模型 | 管理底座与数据门禁未开时，先对齐术语与分工 |
| 堆复杂算法当成绩 | 先证明准确度/效率/成本收益，见评价原则 |
| 口头改需求 | 走意见箱 + 变更控制 |
| 四层模型全上产线 | 在线轻、离线重，见 ADR-001 |
| 忽略 M币 | 人力/算力都要记账，≥50M 记流水 |

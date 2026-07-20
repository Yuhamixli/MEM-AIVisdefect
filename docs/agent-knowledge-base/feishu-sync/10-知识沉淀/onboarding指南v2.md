# onboarding指南v2

> 同步自飞书 · token=`L74qdpFMQoXOsjx4OgXcpZCvn2d` · type=docx · 2026-07-20
> 链接: https://bcndkrmo7f8n.feishu.cn/docx/L74qdpFMQoXOsjx4OgXcpZCvn2d

onboarding指南v2
新队员入门导读·强化版（48h 上手路径）


项

内容

版本

v2.0（在 v1（2026-07-12）基础上沿用+强化，不推翻）

日期

2026-07-18

状态

已决议沿用+强化

Owner

agent-ops（兼）/ 范汝杰（PM）

关联未决 ID

D-05 / D-07 / ADR-001；OD-COM-12 / 13 / 14
读者：刚加入的课题成员。目标：48 小时内建立共同语言、跑通一个实操入口；不要求会训练模型。

一、先搞清三件事（更新版）
课题与考核口径：新能源汽车电芯压条拉挤制品表面缺陷视觉检测（不是泛 CV 竞赛）。考核以任务书为准：抽 50 件、≥3 类、查全率≥80%、准确率≥85%；七类缺陷=裂纹、气泡、缺纱、划伤、异物、发白、脏污（建议先三类=裂纹/气泡/划伤，待确认）。旧 DR≥95%/FPR≤5% 仅为内部冲刺，标「软」。
当前节点与开题结果：开题（07-12）已完毕，老师评 B，主因创新性不足（D-07）；对策=不堆技术名词，用应用效果证据补强。管理抓范围/进度/M币/风险，按五节点门禁推进；评价铁律=准确度/效率/成本三轴。
发声与决议纪律：想法先丢意见箱，不私下改需求；待拍板议题见未决清单（OD-COM-01~16）。群聊未关单一律 open，禁止伪造决议；状态词只有三种：已决议/建议/未决@范汝杰。

二、48 小时上手路径（按小时分段）
H0–2｜术语与考核口径：读本文件+共享简报 §1–§2，记住任务书硬指标、七类缺陷、五节点（开题 07-12→详设 07-30→中期 08-15→完成 09-15→结题 09-30）、评价铁律。
H2–6｜行业与缺陷：读行业背景、行业难点、缺陷定义卡、拉挤工艺基础。应能说出 2 个行业难点、七类缺陷名称与成因。
H6–12｜架构（ADR-001 修正版）与评价铁律：读视觉技术导读 v2+系统架构+评价原则+需求规格书 v3。应能回答：在线/近线/离线各干什么？为何不能四层串成产线主路径？（召回相乘：两层各 90%→81%，对 80% 门槛无余量。）
H12–24｜按角色选读（只读你那一行）


角色

必读

算法

ADR-001（先看结论）+ 算法线包（环境 SOP/实验模板，../07-P1扩展/algo-line-pack.md）

前端/BI

BI 产品规格 + 程昱涵冲刺板（../03-程昱涵专项-前端BI/ 19 号、25 号）

光学/硬件

图像采集方案（../04-需求架构设计/image-acquisition-plan.md）+ OD-COM-05/16

管理

WBS+M币预算（../05-项目管理/）+ 未决清单（../01-未决事项与沟通/open-decisions-log.md）
H24–48｜实操（三选一并留痕）：① 跑通 BI 本地（仓库 apps/bi：npm run sync-data→dev:api(8788)→dev(5173)，开 localhost:5173）或标注 demo（LabelImg，conda 环境 huaduo，W 标注/D 下一页）；② 名册填好自己一行+0–3 能力自评；③ 意见箱 README 读一遍（BI /feedback 页口令解锁）。

三、阅读顺序表（文档包路径 + 仓库路径双写）
文档包路径=本包内相对路径；仓库路径=GitHub 仓库内路径（★=本轮新文档，随飞书「09-知识库」映射同步后生效；全程约 90–120 分钟）。


步

文档

文档包路径

仓库路径

1

本文件 ★

06-知识库/onboarding-guide-v2.md

docs/knowledge/onboarding-guide-v2.md★

2

共享简报（事实基线）★

00-文档地图/_共享简报-写作前必读.md

docs/knowledge/ 同步★

3

拉挤基础 + 行业背景/难点 ★

06-知识库/pultrusion-basics.md、industry-background.md、industry-challenges.md

docs/knowledge/ 同名

4

七类缺陷定义卡

04-需求架构设计/defect-catalog-cards.md

docs/03-requirements/defect-catalog.md

5

视觉技术导读 v2 ★

06-知识库/vision-tech-primer-v2.md

docs/knowledge/vision-tech-primer-v2.md★

6

系统架构 + 需求规格 v3 ★

04-需求架构设计/system-architecture.md、requirements-spec-v3.md

docs/03-requirements/ 同名

7

评价原则/变更控制/M币/能力自评

05-项目管理/m-coin-budget.md★

docs/project-management/evaluation-principles.md、change-control.md、m-coin-cost-system.md、team-capability-profile.md

8

未决清单 OD-COM-01~16 ★

01-未决事项与沟通/open-decisions-log.md

docs/project-management/open-decisions.md

9

当前进度状态（活文档）★

06-知识库/progress-status.md

docs/knowledge/progress-status.md★

10

意见箱

见仓库

docs/feedback-inbox/README.md
选读：算法向仓库 docs/02-tech-research/ADR-001、ADR-002；调研向 docs/01-industry-research/2026-07-11-market-and-competitors.md；前端向 03-程昱涵专项-前端BI/ 19–26 号全套。

四、入职 48h checklist（更新版）
名册填好自己一行；完成 0–3 能力自评；意见箱 README 读一遍；能说出 2 个行业难点
知道当前节点=开题后·双周报前：开题已完毕（评 B），下一步详设门禁 07-30
知道双周报 2026-07-26 21:00 截止（D-05：我方先成稿、组员修订）
知道总预算 70 万 M（人均 53,846 M，口径待 OD-COM-13）；考核看任务书，不是旧 DR95%
不擅自承诺「在线产线全面闭环」——本期主交付=采集方案+离线检测模块+缺陷定义卡+使用说明；在线/近线是演进方向，不是验收门禁
跑通一个实操入口（BI 本地或标注 demo），群里留痕

五、常见误区（沿用 v1，新增两条）


误区

纠正

一上来就调模型

管理底座与数据门禁未开时，先对齐术语与分工

堆复杂算法当成绩

先证明准确度/效率/成本收益，见评价原则

口头改需求

走意见箱 + 变更控制

四层模型全上产线

在线轻、离线重，见 ADR-001

忽略 M币

人力/算力都要记账，≥50M 记流水

把四层串成产线主路径（新增）

修正版=在线轻量→近线精修→离线飞轮；串行召回相乘（90%×90%=81%）对 80% 门槛无余量

伪造「已决议」（新增）

群聊未拍板一律 open；状态词仅已决议/建议/未决@范汝杰；动笔前先查未决清单

卡住怎么办：查未决清单（疑问可能已是 OD-COM-xx）→ 意见箱留言 → 周六周会（20:00）上会。信息不足写「待补+默认假设」，禁止编造实验数据。

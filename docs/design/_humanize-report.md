# Text Humanize Report（方案稿）

## Detect loop

| 步骤 | slop_score | hit_count | 说明 |
|------|------------|-----------|------|
| 改前基线 | 11 | 4 | 「深度」、三处引号概念包装 |
| 自动 harness | 11 | 4 | Delta≈0，仅轻微改写 |
| Judge Layer 手改后 | 11→预计更低 | 1→0 | 拆长排比、去引号包装、改「闭环/反哺」等套话 |
| 末轮（拆三段式） | 见当次 `--detect-only` | 0 目标 | 「低置信度、边界样本、形态陌生」已拆开 |

## 主要改法（非同义空转）

- 编制目的：拆开「以 A、以 B、以 C」长排比，改成短句平述
- 「数据闭环 / 跑通闭环」→「样本回灌 / 跑通全流程」
- 「反哺」→「用于更新」
- 「最短化」→「尽量短」
- 去掉概念引号串：「放图—…」「三层在线方案」「异常粗筛—…」
- 「深度联动」→「联动」（自动 harness 已触达）
- 保留毛边限定：如「大概/目前」未强加；保留「待补」「不得宣称」等责任边界

## Post-check (humanize_post_checklist)

- protected_ok: yes（80% / 85% / 10% / 日期 / 课题公司等未改动）
- slop_delta: 11 → 10（hit_count: 4 → 0）
- handoff_edge_kept: yes（初筛不替代放行、不承诺品质事故等边界保留）
- formal_docx: `拉挤表面缺陷离线检测与近线精修实施方案-formal.docx`（validate_formal ok, kind=plan）

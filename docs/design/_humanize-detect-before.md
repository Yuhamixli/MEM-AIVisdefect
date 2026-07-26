# Slop Detect Report

- slop_score: 11/100 (low)
- char_count: 4174
- hit_count: 4
- input_sha256: f81eefc1006f9b00466b80c65016ebe22a72ca016f60493f023332fe2b951261
- sentence_length_std: 17.755
- certainty_density: 0.948
- mode: detect-only (input text unchanged)

## High-Signal Hits
- 泛化强化词: `深度` -> 无证据支撑时删除或换成中性表述
- 引号概念密集: `“放图—检测—结构化结果—叠加图”` -> 检查是否真需要概念包装
- 引号概念密集: `“三层在线方案”` -> 检查是否真需要概念包装
- 引号概念密集: `“异常粗筛—监督精检—大模型分析”` -> 检查是否真需要概念包装

## Protected Spans (keep byte-identical when humanizing)
- [amount] `80%`
- [amount] `85%`
- [amount] `10%`
- [date] `2026年7月26日`
- [date] `2026年7月30日`
- [date] `2026年8月15日`
- [date] `2026年9月15日`
- [org] `课题公司`
- [org] `经与训练一致的标准化预处`
- [org] `标注效率等内部`
- [org] `自动化预处`
- [org] `仅允许与训练一致的轻量预处`
- [org] `人工辅助处`
- [org] `阈值与预处`

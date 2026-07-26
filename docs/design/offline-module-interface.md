# 离线检测模块接口设计方案

| 项 | 内容 |
|----|------|
| 版本 | v0.2 |
| 日期 | 2026-07-26 |
| 状态 | 草案（对齐 GATE-D3；字段级冻结目标 2026-07-30） |
| Owner | 算法（黄崇发）+ 集成；前端消费见《22-前后端API契约》 |
| 关联 | FR-D3 / FR-D4；ADR-001；OD-COM-07；缺陷图谱 `defect-catalog.md` |
| 前序 | 飞书同步稿 `docs/agent-knowledge-base/feishu-sync/03-技术方案/离线检测模块接口schema.md`（v0.1） |

> 本文件为仓库内**权威设计稿**。飞书版 schema 为同步镜像；字段语义变更以本文件为准，并升 `schema_version`。

---

## 1. 目标与边界

### 1.1 要解决什么

任务书 P0 硬交付中的软件载体：第三方在无产线联机环境下，完成「放图 → 跑检测 → 看结构化结果 / 叠加图」。

### 1.2 算法落点（与 EfficientAD + YOLO 对齐）

| 角色 | 模型 | 是否进离线模块运行依赖 | 说明 |
|------|------|------------------------|------|
| 验收主检 | YOLO 族（基线 `yolo11s-seg`，OD-COM-07 关单） | **是（必选）** | 缺陷定位 + 类型分类；扛 ≥3 类 / 召回 / 准确率 |
| 异常补漏 | EfficientAD（良品建模） | **可选（增强）** | 只答「异不异常」；不进验收主指标分母相乘 |
| 工具层 | DINO / SAM2 / VLM | **否** | 近线精修 / 标注飞轮，不进本模块打包依赖 |

**推理策略（建议）**

```
图像
  ├─ [必选] YOLO  → defects[]（有类型、有 bbox）
  └─ [可选] EfficientAD → anomaly 摘要（score / heatmap 路径）
         │
         ▼
  合并写 result.json + overlay（YOLO 框为主；异常热力可选叠层）
```

- MVP（GATE-M2）：只跑 YOLO，`anomaly` 字段可省略。
- 增强：开启 `--anomaly-model` 后写入 `anomaly`；**不得**因 EfficientAD 未检出而删掉 YOLO 检出，也**不得**把两层召回相乘作为验收口径。

### 1.3 非目标（本期不做）

- 在线产线节拍闭环 / PLC 联动
- 作为最终放行判定器（输出仅为目检初筛）
- 依赖任何在线 API 或云端推理

---

## 2. 交付形态

```
offline-detect/                    # 交付包根目录（名称可随打包调整）
├── README.md                      # 指向《使用说明》
├── detect.py | detect.exe         # 入口（CLI）
├── detect.yaml                    # 默认配置
├── weights/
│   ├── yolo11s-seg-vX.Y.pt        # 主检权重（必选）
│   └── efficientad-vX.Y/          # 异常模型（可选）
├── samples/                       # ≥5 张样例图（第三方试操）
└── docs/
    └── schema.md                  # 本接口摘要或链接
```

运行环境基线（与架构文档一致）：Python 3.10.11 + ultralytics + torch；CPU 可跑为硬约束（NFR-1）；GPU 为加速可选项。

---

## 3. CLI 接口

### 3.1 命令

```bash
detect --input <图像目录或单图> --output <输出目录> \
       --model <yolo.pt> \
       [--conf 0.25] \
       [--iou 0.45] \
       [--device cpu|0] \
       [--save-overlay] \
       [--config detect.yaml] \
       [--timeout-ms 30000] \
       [--anomaly-model <efficientad路径>] \
       [--anomaly-threshold 0.5] \
       [--class-slugs crack,bubble,scratch]
```

### 3.2 参数表

| 参数 | 类型 | 默认 | 必填 | 说明 |
|------|------|------|------|------|
| `--input` | path | — | 是 | 单图或目录（递归仅一层：目录内 jpg/png） |
| `--output` | path | — | 是 | 输出根目录，见 §5 |
| `--model` | path | yaml | 是* | YOLO 权重；\*可由 yaml 提供 |
| `--conf` | float | 0.25 | 否 | YOLO 置信度阈值 |
| `--iou` | float | 0.45 | 否 | NMS IoU |
| `--device` | str | `cpu` | 否 | `cpu` 或 GPU 序号 |
| `--save-overlay` | flag | 关 | 否 | 生成 `overlay.jpg` |
| `--config` | path | 无 | 否 | yaml；**CLI 优先于 yaml** |
| `--timeout-ms` | int | 30000 | 否 | 单图超时 |
| `--anomaly-model` | path | 无 | 否 | 启用 EfficientAD；省略则不做异常分支 |
| `--anomaly-threshold` | float | 0.5 | 否 | 异常分数阈值（标定前为建议值） |
| `--class-slugs` | list | 七类全量 | 否 | 本期演示可收窄为先三类 |

### 3.3 `detect.yaml` 示例

```yaml
model: weights/yolo11s-seg-v0.3.pt
conf: 0.25
iou: 0.45
device: cpu
save_overlay: true
timeout_ms: 30000
class_slugs:
  - crack
  - bubble
  - scratch
  # 扩展：missing_yarn, foreign_matter, whitening, contamination
anomaly:
  enabled: false
  model: weights/efficientad-v0.1
  threshold: 0.5
naming:
  # 文件名解析：{piece_id}_{surface}.jpg 或 {piece_id}-{surface}.jpg
  pattern: "{piece_id}_{surface}"
  default_surface: top
  default_batch_id: UNKNOWN
```

### 3.4 退出码

| 码 | 含义 |
|----|------|
| 0 | 全部成功 |
| 1 | 部分图像失败（见各 `result.json` + `errors.log`） |
| 2 | 致命错误（模型加载失败、输入不存在、配置非法） |

---

## 4. 结构化输出 Schema

### 4.1 根对象

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `schema_version` | string | 是 | 当前 `"1.0"`；见 §4.7 |
| `status` | enum | 是 | `ok` \| `failed` |
| `piece_id` | string | 是 | 样件 ID（= physical_piece_id；评测按件拆分） |
| `batch_id` | string | 是 | 批次；解析不到时用配置默认值并打警告 |
| `surface` | string | 是 | 检测面；透传字符串，取值集待 OD-1.3 冻结 |
| `image_path` | string | 是 | 相对输出目录的源图副本路径 |
| `image_size` | object | 是 | `{"width": int, "height": int}` |
| `model_version` | string | 是 | YOLO 权重版本标识，如 `yolo11s-seg-v0.3` |
| `pipeline` | object | 是 | 本次实际启用的管线，见下 |
| `inference_time_ms` | number | 是 | 单图总耗时（含可选异常分支） |
| `timestamp` | string | 是 | ISO 8601 + 时区 |
| `defects` | array | 是 | YOLO 检出；无缺陷为 `[]` |
| `anomaly` | object | 否 | EfficientAD 摘要；未启用不出现 |
| `summary` | object | 是 | 汇总与初判 |
| `error` | object | 条件 | 仅 `status=failed` 时出现 |

**`pipeline` 对象**

```json
{
  "detector": "yolo11s-seg",
  "anomaly": null
}
```

启用异常时：`"anomaly": "efficientad"`。

### 4.2 `defects[]` 元素（YOLO）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `defect_id` | string | 是 | 图内唯一，`d-001` 起；供复核引用 |
| `class_slug` | enum | 是 | 见缺陷图谱七类 slug |
| `class_name` | string | 是 | 中文名 |
| `bbox` | object | 是 | `{"x","y","w","h"}`，像素，原点左上 |
| `mask` | object | 否 | seg 权重时可选：`{"polygon":[[x,y],...]}` 或 RLE |
| `confidence` | number | 是 | `[0,1]` |
| `severity` | enum | 否 | `low` \| `medium` \| `high`（映射规则 open） |
| `source` | string | 否 | 默认 `"yolo"`；预留多检融合 |

**slug ↔ 中文（锁定）**

| slug | 中文 |
|------|------|
| `crack` | 裂纹 |
| `bubble` | 气泡 |
| `missing_yarn` | 缺纱 |
| `scratch` | 划伤 |
| `foreign_matter` | 异物 |
| `whitening` | 发白 |
| `contamination` | 脏污 |

### 4.3 `anomaly` 对象（EfficientAD，可选）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `enabled` | bool | 是 | 恒为 `true`（出现即表示跑过） |
| `model_version` | string | 是 | 如 `efficientad-v0.1` |
| `score` | number | 是 | 图像级异常分数 |
| `is_anomaly` | bool | 是 | `score >= threshold` |
| `threshold` | number | 是 | 本次使用阈值 |
| `heatmap_path` | string | 否 | 相对路径，如 `heatmap.png` |
| `inference_time_ms` | number | 否 | 异常分支单独耗时 |

> 语义：`anomaly.is_anomaly=true` 且 `defects=[]` → 建议 `overall_decision=REVIEW`（未知异常，待人标），**不要**假装成某一已知类。

### 4.4 `summary` 对象

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `total_defects` | int | 是 | `len(defects)` |
| `by_class` | object | 是 | 按 slug 计数 |
| `overall_decision` | enum | 是 | `OK` \| `NG` \| `REVIEW`（**系统初判**） |
| `review_status` | enum | 是 | `pending` \| `confirmed` \| `rejected`（**人工流转**） |
| `reviewer` | string | 否 | 复核人 |
| `review_time` | string | 否 | ISO 8601 |

**初判规则（MVP，可配置）**

| 条件 | `overall_decision` |
|------|--------------------|
| `defects` 为空且（无 anomaly 或 `is_anomaly=false`） | `OK` |
| 存在任一 YOLO 缺陷 | `REVIEW`（NG 规则待允收标准冻结后启用） |
| `defects` 为空但 `anomaly.is_anomaly=true` | `REVIEW` |

**硬约束**：人工复核只改 `review_status` / `reviewer` / `review_time`（及逐缺陷复核字段），**不回写** `overall_decision`，以便误报/漏报对照与 50 件盲测。

### 4.5 成功示例（含可选 anomaly）

```json
{
  "schema_version": "1.0",
  "status": "ok",
  "piece_id": "P-20260810-001",
  "batch_id": "B-01",
  "surface": "top",
  "image_path": "image.jpg",
  "image_size": {"width": 3200, "height": 1920},
  "model_version": "yolo11s-seg-v0.3",
  "pipeline": {"detector": "yolo11s-seg", "anomaly": "efficientad"},
  "inference_time_ms": 210.4,
  "timestamp": "2026-08-10T14:02:00+08:00",
  "defects": [
    {
      "defect_id": "d-001",
      "class_slug": "crack",
      "class_name": "裂纹",
      "bbox": {"x": 812, "y": 340, "w": 96, "h": 41},
      "confidence": 0.87,
      "severity": "high",
      "source": "yolo"
    },
    {
      "defect_id": "d-002",
      "class_slug": "bubble",
      "class_name": "气泡",
      "bbox": {"x": 1450, "y": 980, "w": 52, "h": 48},
      "confidence": 0.76,
      "severity": "medium",
      "source": "yolo"
    }
  ],
  "anomaly": {
    "enabled": true,
    "model_version": "efficientad-v0.1",
    "score": 0.82,
    "is_anomaly": true,
    "threshold": 0.5,
    "heatmap_path": "heatmap.png",
    "inference_time_ms": 28.1
  },
  "summary": {
    "total_defects": 2,
    "by_class": {"crack": 1, "bubble": 1},
    "overall_decision": "REVIEW",
    "review_status": "pending"
  }
}
```

### 4.6 失败示例

```json
{
  "schema_version": "1.0",
  "status": "failed",
  "piece_id": "P-20260810-003",
  "batch_id": "B-01",
  "surface": "top",
  "image_path": "image.jpg",
  "image_size": {"width": 0, "height": 0},
  "model_version": "yolo11s-seg-v0.3",
  "pipeline": {"detector": "yolo11s-seg", "anomaly": null},
  "inference_time_ms": 0,
  "timestamp": "2026-08-10T14:05:00+08:00",
  "defects": [],
  "summary": {
    "total_defects": 0,
    "by_class": {},
    "overall_decision": "REVIEW",
    "review_status": "pending"
  },
  "error": {
    "code": "DECODE_FAIL",
    "message": "cannot decode image"
  }
}
```

### 4.7 版本兼容

| 变更类型 | `schema_version` |
|----------|------------------|
| 新增可选字段（如 `anomaly`） | 不升号（向后兼容） |
| 改语义 / 删必填字段 / 改 enum | 升主版本 `2.0` |
| 旧版文件 | 至少一个迭代周期内前端仍可读 |

### 4.8 错误码

| code | 场景 | 批处理行为 | 进程退出 |
|------|------|------------|----------|
| `READ_FAIL` | 路径/权限 | 写 failed JSON，继续 | 最终 1 |
| `DECODE_FAIL` | 坏图/格式 | 同上 | 最终 1 |
| `TIMEOUT` | 超 `--timeout-ms` | 同上 | 最终 1 |
| `MODEL_LOAD_FAIL` | 权重缺失/不兼容 | 中止 | **2** |
| `ANOMALY_LOAD_FAIL` | 异常模型加载失败 | 若 `anomaly.enabled=true` 则致命；否则忽略 | 2 或继续 |

批级汇总：`{output}/errors.log`（一行一条：`timestamp piece_id code message`）。

---

## 5. 目录约定

```
{output}/
├── errors.log
└── {date}/                          # 检测日期 YYYY-MM-DD
    └── {piece_id}/
        ├── image.jpg                # 单面默认；多面：image-{surface}.jpg
        ├── result.json              # 本 schema
        ├── overlay.jpg              # --save-overlay
        └── heatmap.png              # 仅启用 anomaly 且实现落盘时
```

多面时：同 `piece_id` 下多份 `result-{surface}.json` **或** 单面一目录（本期默认单面，与联调检查单一致）。前端聚合由 `npm run sync-data` / `sync-results` 完成，**算法侧不直接写** `jobs/{piece_id}.json`。

---

## 6. 与前端 / BI 的契约边界

```
算法落盘 result.json  ──sync-results──►  /data/detect/jobs/{piece_id}.json
                                         /data/detect/jobs-index.json
                                         （faces[] 结构，见文档 22）
```

| 侧 | 职责 |
|----|------|
| 离线模块 | 逐面 `result.json` + 图像副本 + overlay |
| sync 脚本 | 唯一转换入口；字段改名/合并多面 |
| detector-ui | 只读 jobs；复核回写走可选 `/api/review`（草稿） |

映射要点：

- `class_slug` → 前端 `slug`
- `bbox: {x,y,w,h}` → `bbox: [x,y,w,h]`
- `surface` → `faces[].face`
- `summary.review_status` → 件级 `review_status`

两侧不得绕过 sync 私改对方格式。

---

## 7. 文件名与 ID 解析规则

输入文件名建议：

```
{piece_id}_{surface}.jpg
{piece_id}-{surface}.jpg
```

| 解析结果 | 规则 |
|----------|------|
| `piece_id` | 去掉扩展名后，按 `_`/`-` 分割的前段；整名亦可 |
| `surface` | 末段命中已知面集合，否则用 `default_surface` |
| `batch_id` | 优先读同目录 `manifest.csv`（`piece_id,batch_id,surface`）；否则默认值 |

`manifest.csv`（可选，推荐 50 件评测使用）：

```csv
piece_id,batch_id,surface,image_file
P-20260810-001,B-01,top,P-20260810-001_top.jpg
```

---

## 8. 分阶段落地

| 阶段 | 门禁 | 接口范围 |
|------|------|----------|
| A 草案 | GATE-D3（07-30） | 本文件评审；CLI + JSON 字段冻结意向 |
| B MVP | GATE-M2（08-15） | 仅 YOLO；样例图 → `result.json` + overlay；无 `anomaly` |
| C 封装 | GATE-C3（09-15） | 打包 + 使用说明；CPU 路径跑通 |
| D 增强 | 任务书外 | 开启 EfficientAD；补 `anomaly`；阈值标定 |

验收指标（查全率/准确率）**只基于 YOLO `defects[]` 与金标准对比**；EfficientAD 单独报 AUROC / 补漏率，不进 P0 分母。

---

## 9. 未决（open）

| ID | 事项 | 影响字段 |
|----|------|----------|
| OD-COM-07 | YOLO 定版（seg vs detect） | `model_version` / `mask` 是否必出 |
| OD-1.3 | 检测面取值集合 | `surface` enum |
| OD-COM-11 | 允收标准 → NG 规则、severity 映射 | `overall_decision` / `severity` |
| — | EfficientAD 阈值标定方法 | `anomaly.threshold` 默认值 |
| — | GPU/CUDA/实测耗时 | 使用说明性能表 |

---

## 10. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2026-07-18 | 飞书初稿：CLI、字段、目录、错误码 |
| v0.2 | 2026-07-26 | 仓库权威稿：对齐 EfficientAD+YOLO；增加 `pipeline`/`anomaly`/`status`；明确 MVP/增强与验收口径；补 manifest 与前端 sync 边界 |

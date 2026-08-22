# offline-module-interface

> 同步自飞书 · token=`EOh7dxswjo2cU7xVXd6c42YmncB` · type=docx · 2026-08-22
> 链接: https://bcndkrmo7f8n.feishu.cn/docx/EOh7dxswjo2cU7xVXd6c42YmncB

offline-module-interface
离线检测模块接口设计方案


项

内容

版本

v0.3

日期

2026-08-20

状态

建议（待黄崇发联审后冻结；程昱涵会签）

Owner

算法（黄崇发）落盘；前端（程昱涵）消费；范汝杰关单

关联

FR-D3 / FR-D4；ADR-001；OD-COM-07；缺陷图谱 defect-catalog.md；《26-联调检查单》；《22-前后端API契约》

前序

v0.2（2026-07-26）；v0.1 飞书稿 离线检测模块接口schema.md
本文件为仓库内权威设计稿。飞书版为同步镜像；字段语义变更以本文件为准。
文版 v0.3 ≠ JSON schema_version。 JSON 仍为 "1.0"，与联调单一致——本轮是把设计稿收到已在用的 1.0 形状，不是另开一套。

0. 相对 v0.2 必须对齐的 6 点（请黄崇发确认）
问题：v0.2、联调单、detector-ui jobs / sync-results 对同一字段写法不一致。算法若按 v0.2 落盘，叠加框、时间、复核都会错。本轮只锁这 6 项；EfficientAD / NG 规则 / 检测面枚举仍 open。


#

字段

v0.2（不要按这个写）

v0.3 冻结（跟联调单 / 前端）

不锁会怎样

1

bbox

{"x","y","w","h"} 对象

[x, y, w, h] 数组，像素，原点左上，float 可

sync 原样透传；对象叠框会错

2

image_size

{"width","height"} 对象

[宽, 高] 数组，与 jpg 实际像素一致

前端按此换算叠加，对象会对不上

3

图像文件名

image_path（相对输出根）

image_file：同目录文件名，单面默认 image.jpg

sync 找的是 image_file，找不到就落 placeholder

4

时间

timestamp（时刻）+ inference_time_ms（耗时）

detected_at：ISO 8601+时区；infer_ms：int 毫秒

禁止再用 inference_time 一个名字。sync 曾把耗时写进 detected_at

5

件级 review_status

pending / confirmed / rejected

补 relabelled；算法落盘一律 pending

前端已在用 relabelled，少这个值回流标进不了 schema

6

缺陷级复核

只写「及逐缺陷复核字段」，未定义

defects[].review_status 必填，默认 pending；算法禁止预写 confirmed / rejected / relabelled

件级与缺陷级对不齐；盲测无法逐框对照
请确认：按上表落 result.json。有异议 48h 内回复，否则按此冻结，再改须升接口文版。
OK--黄崇发  2026年8月21日13:39

1. 目标与边界
1.1 要解决什么
任务书 P0 硬交付中的软件载体：第三方在无产线联机环境下，完成「放图 → 跑检测 → 看结构化结果 / 叠加图」。
1.2 算法落点（与 EfficientAD + YOLO 对齐）


角色

模型

是否进离线模块运行依赖

说明

验收主检

YOLO 族（基线 yolo11s-seg，OD-COM-07 关单）

是（必选）

缺陷定位 + 类型分类；扛 ≥3 类 / 召回 / 准确率

异常补漏

EfficientAD（良品建模）

可选（增强）

只答「异不异常」；不进验收主指标分母相乘

工具层

DINO / SAM2 / VLM

否

近线精修 / 标注飞轮，不进本模块打包依赖
推理策略（建议）
图像
  ├─ [必选] YOLO  → defects[]（有类型、有 bbox）
  └─ [可选] EfficientAD → anomaly 摘要（score / heatmap 路径）
         │
         ▼
  合并写 result.json + overlay（YOLO 框为主；异常热力可选叠层）
MVP（GATE-M2）：只跑 YOLO，anomaly 字段可省略。
增强：开启 --anomaly-model 后写入 anomaly；不得因 EfficientAD 未检出而删掉 YOLO 检出，也不得把两层召回相乘作为验收口径。
1.3 非目标（本期不做）
在线产线节拍闭环 / PLC 联动
作为最终放行判定器（输出仅为目检初筛）
依赖任何在线 API 或云端推理

2. 交付形态
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
运行环境基线（与架构文档一致）：Python 3.10.11 + ultralytics + torch；CPU 可跑为硬约束（NFR-1）；GPU 为加速可选项。

3. CLI 接口
3.1 命令
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
3.2 参数表


参数

类型

默认

必填

说明

--input

path

—

是

单图或目录（递归仅一层：目录内 jpg/png）

--output

path

—

是

输出根目录，见 §5

--model

path

yaml

是*

YOLO 权重；*可由 yaml 提供

--conf

float

0.25

否

YOLO 置信度阈值

--iou

float

0.45

否

NMS IoU

--device

str

cpu

否

cpu 或 GPU 序号

--save-overlay

flag

关

否

生成 overlay.jpg

--config

path

无

否

yaml；CLI 优先于 yaml

--timeout-ms

int

30000

否

单图超时

--anomaly-model

path

无

否

启用 EfficientAD；省略则不做异常分支

--anomaly-threshold

float

0.5

否

异常分数阈值（标定前为建议值）

--class-slugs

list

七类全量

否

本期演示可收窄为先三类
3.3 detect.yaml 示例
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
  # 文件名解析：{piece_id}_{surface}.jpg（piece_id 可含连字符，只按最后一个 _ 分 surface）
  pattern: "{piece_id}_{surface}"
  default_surface: top
  default_batch_id: UNKNOWN
3.4 退出码


码

含义

0

全部成功

1

部分图像失败（见各 result.json + errors.log）

2

致命错误（模型加载失败、输入不存在、配置非法）

4. 结构化输出 Schema
4.1 根对象


字段

类型

必填

说明

schema_version

string

是

当前 "1.0"

status

enum

是

ok | failed

piece_id

string

是

样件 ID（= physical_piece_id；评测按件拆分）

batch_id

string

是

批次；解析不到时用配置默认值并打警告

surface

string

是

检测面；透传字符串，取值集待 OD-1.3 冻结

image_file

string

是

同目录图像文件名，单面默认 image.jpg（v0.3：取代 image_path）

image_size

[int, int]

是

[宽, 高]，与 jpg 实际像素一致（v0.3）

model_version

string

是

YOLO 权重版本标识，如 yolo11s-seg-v0.3

pipeline

object

是

本次实际启用的管线，见下

detected_at

string

是

推理完成时刻，ISO 8601 + 时区（v0.3：取代 timestamp）

infer_ms

int

是

单图总耗时毫秒（v0.3：取代 inference_time_ms）

defects

array

是

YOLO 检出；无缺陷为 []

review_status

enum

是

件级；算法输出恒为 pending；见 §4.4

anomaly

object

否

EfficientAD 摘要；未启用不出现

summary

object

是

汇总与初判

error

object

条件

仅 status=failed 时出现
已废止（算法禁止再写）：image_path、timestamp、inference_time、inference_time_ms（根对象）。
pipeline 对象
{
  "detector": "yolo11s-seg",
  "anomaly": null
}
启用异常时："anomaly": "efficientad"。
4.2 defects[] 元素（YOLO）


字段

类型

必填

说明

defect_id

string

是

图内唯一，d-001 起；供复核引用

class_slug

enum

是

见缺陷图谱七类 slug

class_name

string

是

中文名

bbox

[x, y, w, h]

是

像素，原点左上；数组不是对象（v0.3）

mask

[[x,y], …]

否

本期若输出，用多边形像素坐标（与联调单一致；RLE 不做）

confidence

number

是

[0,1]

severity

enum

否

low | medium | high（映射规则 open）

source

string

否

默认 "yolo"；预留多检融合

review_status

enum

是

缺陷级；算法输出恒为 pending（v0.3）
slug ↔ 中文（锁定）


slug

中文

crack

裂纹

bubble

气泡

missing_yarn

缺纱

scratch

划伤

foreign_matter

异物

whitening

发白

contamination

脏污
YOLO 原生框是归一化中心点格式，只在算法导出时换算一次成像素 [x,y,w,h]（乘 image_size）；前端不再换算。
4.3 anomaly 对象（EfficientAD，可选）


字段

类型

必填

说明

enabled

bool

是

恒为 true（出现即表示跑过）

model_version

string

是

如 efficientad-v0.1

score

number

是

图像级异常分数

is_anomaly

bool

是

score >= threshold

threshold

number

是

本次使用阈值

heatmap_path

string

否

相对路径，如 heatmap.png

infer_ms

int

否

异常分支单独耗时（毫秒）
语义：anomaly.is_anomaly=true 且 defects=[] → 建议 overall_decision=REVIEW（未知异常，待人标），不要假装成某一已知类。
4.4 summary 与复核


字段

类型

必填

说明

total_defects

int

是

len(defects)

by_class

object

是

按 slug 计数

overall_decision

enum

是

OK | NG | REVIEW（系统初判）

review_status

enum

是

与根对象 review_status 同值；算法恒 pending

reviewer

string

否

复核人（仅人工回写）

review_time

string

否

ISO 8601（仅人工回写）
review_status 取值（件级与缺陷级同一套）


值

谁写

含义

pending

算法默认

待复核

confirmed

仅人工

确认该框/该件

rejected

仅人工

驳回（误报等）

relabelled

仅人工

需改标后回流训练集
初判规则（MVP，可配置）


条件

overall_decision

defects 为空且（无 anomaly 或 is_anomaly=false）

OK

存在任一 YOLO 缺陷

REVIEW（NG 规则待允收标准冻结后启用）

defects 为空但 anomaly.is_anomaly=true

REVIEW
硬约束
人工复核只改 review_status / reviewer / review_time（含 defects[].review_status），不回写 overall_decision。
算法落盘：根对象与每个 defect 的 review_status 都必须是 pending。
件级与缺陷级的聚合（全部 confirmed 才 confirmed 等）只在前端做一处，算法不重复实现。
4.5 成功示例（含可选 anomaly）
{
  "schema_version": "1.0",
  "status": "ok",
  "piece_id": "P-20260810-001",
  "batch_id": "B-01",
  "surface": "top",
  "image_file": "image.jpg",
  "image_size": [3200, 1920],
  "model_version": "yolo11s-seg-v0.3",
  "pipeline": {"detector": "yolo11s-seg", "anomaly": "efficientad"},
  "detected_at": "2026-08-10T14:02:00+08:00",
  "infer_ms": 210,
  "review_status": "pending",
  "defects": [
    {
      "defect_id": "d-001",
      "class_slug": "crack",
      "class_name": "裂纹",
      "bbox": [812.0, 340.0, 96.0, 41.0],
      "confidence": 0.87,
      "severity": "high",
      "source": "yolo",
      "review_status": "pending"
    },
    {
      "defect_id": "d-002",
      "class_slug": "bubble",
      "class_name": "气泡",
      "bbox": [1450.0, 980.0, 52.0, 48.0],
      "confidence": 0.76,
      "severity": "medium",
      "source": "yolo",
      "review_status": "pending"
    }
  ],
  "anomaly": {
    "enabled": true,
    "model_version": "efficientad-v0.1",
    "score": 0.82,
    "is_anomaly": true,
    "threshold": 0.5,
    "heatmap_path": "heatmap.png",
    "infer_ms": 28
  },
  "summary": {
    "total_defects": 2,
    "by_class": {"crack": 1, "bubble": 1},
    "overall_decision": "REVIEW",
    "review_status": "pending"
  }
}
4.6 失败示例
{
  "schema_version": "1.0",
  "status": "failed",
  "piece_id": "P-20260810-003",
  "batch_id": "B-01",
  "surface": "top",
  "image_file": "image.jpg",
  "image_size": [0, 0],
  "model_version": "yolo11s-seg-v0.3",
  "pipeline": {"detector": "yolo11s-seg", "anomaly": null},
  "detected_at": "2026-08-10T14:05:00+08:00",
  "infer_ms": 0,
  "review_status": "pending",
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
4.7 版本兼容


变更类型

schema_version

新增可选字段（如 anomaly）

不升号（向后兼容）

改语义 / 删必填字段 / 改 enum

升主版本 2.0

旧版文件

至少一个迭代周期内前端仍可读
v0.3 这 6 点是把设计稿对齐联调单已写的 "1.0"，不升 JSON 主版本。此后再改这 6 个字段的形态，才升 2.0。
4.8 错误码


code

场景

批处理行为

进程退出

READ_FAIL

路径/权限

写 failed JSON，继续

最终 1

DECODE_FAIL

坏图/格式

同上

最终 1

TIMEOUT

超 --timeout-ms

同上

最终 1

MODEL_LOAD_FAIL

权重缺失/不兼容

中止

2

ANOMALY_LOAD_FAIL

异常模型加载失败

若 anomaly.enabled=true 则致命；否则忽略

2 或继续
批级汇总：{output}/errors.log（一行一条：detected_at piece_id code message）。

5. 目录约定
{output}/
├── errors.log
└── {date}/                          # 检测日期 YYYYMMDD（与联调单一致）
    └── {piece_id}/
        ├── image.jpg                # 单面默认
        ├── result.json              # 本 schema
        ├── overlay.jpg              # --save-overlay
        └── heatmap.png              # 仅启用 anomaly 且实现落盘时
单面（本期默认）：image.jpg + result.json。
多面（OD-1.3 冻结后）：同目录 {surface}.jpg + {surface}.json（如 top.jpg / top.json）。
算法侧只新增目录与文件，不改写历史目录；复检产生新 {date} 目录。
前端聚合由 npm run sync-results 完成，算法侧不直接写 jobs/{piece_id}.json。

6. 与前端 / BI 的契约边界
算法落盘 result.json  ──sync-results──►  /data/detect/jobs/{piece_id}.json
                                         /data/detect/jobs-index.json
                                         （faces[] 结构，见文档 22）


侧

职责

离线模块

逐面 result.json + 图像副本 + overlay

sync 脚本

唯一转换入口；字段改名/合并多面

detector-ui

只读 jobs；复核回写走可选 /api/review（草稿）
映射要点（v0.3：bbox / image_size 两侧已同形，sync 不再改结构）：
class_slug → 前端 slug
bbox: [x,y,w,h] → 原样
image_size: [w,h] → 原样（jobs 里可仍写在 faces[].image_size）
surface → faces[].face
detected_at → 件级 detected_at
review_status（件级）→ 件级 review_status
defects[].review_status → 框级 review_status
两侧不得绕过 sync 私改对方格式。

7. 文件名与 ID 解析规则
输入文件名建议：
{piece_id}_{surface}.jpg
现用样件号含连字符（P-20260810-001）。禁止按所有 _/- 取前段（会把 piece_id 拆成 P）。


解析结果

规则

piece_id

优先读 manifest.csv；否则去掉扩展名后，只按最后一个 _ 切开，前段整段作为 piece_id

surface

最后一个 _ 之后的末段；命中已知面集合则用，否则 default_surface

batch_id

优先读同目录 manifest.csv；否则默认值
manifest.csv（可选，推荐 50 件评测使用）：
piece_id,batch_id,surface,image_file
P-20260810-001,B-01,top,P-20260810-001_top.jpg

8. 分阶段落地


阶段

门禁

接口范围

A 草案

GATE-D3（07-30）

v0.1/v0.2 评审意向

A' 字段对齐

2026-08-20

v0.3：§0 六字段与联调单对齐（本文件）

B MVP

GATE-M2（原 08-15，已逾期）

仅 YOLO；样例图 → result.json + overlay；无 anomaly

C 封装

GATE-C3（09-15）

打包 + 使用说明；CPU 路径跑通

D 增强

任务书外

开启 EfficientAD；补 anomaly；阈值标定
验收指标（查全率/准确率）只基于 YOLO defects[] 与金标准对比；EfficientAD 单独报 AUROC / 补漏率，不进 P0 分母。

9. 未决（open）


ID

事项

影响字段

是否挡 v0.3 冻结

OD-COM-07

YOLO 定版（seg vs detect）

model_version / mask 是否必出

否

OD-1.3

检测面取值集合

surface enum

否；先字符串透传

OD-COM-11

允收标准 → NG 规则、severity 映射

overall_decision / severity

否

—

EfficientAD 阈值标定方法

anomaly.threshold 默认值

否

—

GPU/CUDA/实测耗时

使用说明性能表

否

—

件级 piece_summary / run_id / 金标准对照

50 件按件统计

否；下一轮

10. 变更记录


版本

日期

说明

v0.1

2026-07-18

飞书初稿：CLI、字段、目录、错误码

v0.2

2026-07-26

仓库权威稿：对齐 EfficientAD+YOLO；增加 pipeline/anomaly/status；明确 MVP/增强与验收口径；补 manifest 与前端 sync 边界

v0.3

2026-08-20

与联调单/前端对齐 6 点：bbox 数组、image_size 数组、image_file、detected_at+infer_ms、relabelled、缺陷级 review_status；JSON schema_version 仍为 1.0；piece_id 改为按最后一个 _ 切

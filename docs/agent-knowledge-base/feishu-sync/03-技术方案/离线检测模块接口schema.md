# 离线检测模块接口schema

> 同步自飞书 · token=`AiX5de564oz0OwxKeG2cA5Crnmg` · type=docx · 2026-07-20
> 链接: https://bcndkrmo7f8n.feishu.cn/docx/AiX5de564oz0OwxKeG2cA5Crnmg

离线检测模块接口schema
离线检测模块接口与结构化输出 Schema


项

内容

版本

v0.1

日期

2026-07-18

状态

草案，字段级冻结待详设门禁（2026-07-30）

Owner

黄崇发（AI工程师·主算法）

关联

FR-D3（检测模型）/ FR-D4（离线检测模块·结构化输出）；OD-COM-07（检测器选型）；OD-COM-16（分辨率二选一）；前端契约见《22-api-contract》§3
写作约定：字段未冻结前一律视为「建议」；示例中的字段值均为演示用虚构值，非实测数据；未决项显式标注 open，禁止伪造决议与指标。

1. 模块定位
本模块是任务书 P0 硬交付「缺陷定义卡 + 检测模型 + 离线检测模块（结构化输出）」中的软件载体，定位为可独立运行的离线检测模块：
模型：yolo11s-seg（实例分割权重，可退化输出纯检测框；最终选型待 OD-COM-07 关单，open）。
运行环境：Python 3.10.11 + ultralytics 8.4.90 + torch 2.4.1 + torchvision 0.19.1（conda 环境名 huaduo）；CPU/GPU 均可运行，GPU 型号与 CUDA 版本「待补@黄崇发」。
输入：图像目录或单张图像（jpg/png，分辨率以采集方案为准，3200×1920 或 3072×2084，待 OD-COM-16 确认）。
输出：每张图一份结构化 JSON（result.json）+ 一张可视化叠加图（overlay.jpg）。
边界：输出为表面外观初步判断，替代人工目检的初筛环节，不替代最终放行；在线产线闭环非本期验收要求（ADR-001）。
与四层能力栈的关系：按 ADR-001，本模块承载「受控成像 + 轻量监督检测器（YOLO 族）」这条验收主线；PatchCore/EfficientAD 并联补漏、Grounding DINO / SAM2 / VLM 只作工具层，均不进本模块的运行依赖。即：本模块独立交付、独立可跑，不依赖任何在线服务与其他模型。
消费者：质检员（经《使用说明》直接操作）、detector-ui 前端（读取结构化输出，见 §4）、SPC/质量台账（按批次聚合，见 §3.5）。
2. CLI 接口（建议，待冻结）
detect --input <图像目录或单图路径> --output <输出目录> \
       --model <weights.pt> --conf 0.25 \
       [--save-overlay] [--device cpu|0] [--config detect.yaml] [--timeout-ms 30000]


参数

类型

默认

说明

--input

path

必填

图像目录（逐张处理）或单图路径

--output

path

必填

输出根目录，按 §4 目录约定落盘

--model

path

必填

模型权重文件（.pt）

--conf

float

0.25

置信度阈值，低于阈值的检出丢弃

--save-overlay

flag

关

生成可视化叠加图 overlay.jpg

--device

str

cpu

cpu 或 GPU 序号（如 0）

--config

path

无

指定 yaml 配置；命令行参数优先级高于 yaml

--timeout-ms

int

30000

单图推理超时上限，超时按错误输出处理
配置 detect.yaml 字段（与 CLI 一一对应）：
model: weights/yolo11s-seg-v0.3.pt
conf: 0.25
device: cpu
save_overlay: true
timeout_ms: 30000
class_slugs: [crack, bubble, missing_yarn, scratch, foreign_matter, whitening, contamination]
退出码约定：0 全部成功；1 部分图像失败（详见 result.json 与 errors 日志）；2 致命错误（模型加载失败、输入不存在等）。
3. 输出 Schema（JSON Schema 字段级）
3.1 根对象


字段

类型

必填

说明

schema_version

string

是

schema 版本号，如 "1.0"，演进规则见 §3.6

piece_id

string

是

样件唯一标识（对应 physical_piece_id，评测按件拆分）

batch_id

string

是

批次标识，支撑 SPC/批次追溯

surface

string

是

检测面；取值集合（top/bottom/left/right 或现场四方位编号）待 OD-1.3 冻结，当前字符串透传

image_path

string

是

源图像相对路径

image_size

object

是

{"width": int, "height": int}，像素

model_version

string

是

模型版本标识，如 "yolo11s-seg-v0.3"

inference_time_ms

number

是

单图推理耗时（毫秒），供效率三轴评估

timestamp

string

是

检测时间，ISO 8601 带时区，如 2026-08-10T14:02:00+08:00

defects

array

是

缺陷列表，无缺陷为空数组 []

summary

object

是

汇总与判定，见 §3.3
3.2 defects[] 元素


字段

类型

必填

说明

defect_id

string

是

图内唯一，如 "d-001"，供复核回写引用

class_slug

enum

是

七类锁定 slug：crack / bubble / missing_yarn / scratch / foreign_matter / whitening / contamination

class_name

string

是

中文名（裂纹/气泡/缺纱/划伤/异物/发白/脏污）

bbox

object

是

{"x","y","w","h"}，像素坐标、原点左上，与 LabelImg/YOLO 导出口径一致

mask

object

否

实例分割掩膜：多边形 {"polygon":[[x1,y1],...]} 或 RLE {"rle":{"counts":...,"size":[h,w]}}，二选一

confidence

number

是

置信度，取值 [0,1]

severity

enum

否

建议字段：low / medium / high；映射规则待 struct-eng 与 quality 依据定义卡允收标准共签（关联 OD-COM-11，open）
3.3 summary 对象


字段

类型

必填

说明

total_defects

int

是

缺陷总数

by_class

object

是

按类计数，如 {"crack":1,"bubble":2}，未检出类可省略或为 0

overall_decision

enum

是

OK（无缺陷）/ NG（有缺陷且达拒收规则）/ REVIEW（有缺陷待人工复核）；判定规则初版默认：有任一缺陷即 REVIEW，NG 规则随允收标准冻结后启用（open）

review_status

enum

是

pending / confirmed / rejected；与前端契约对齐，逐缺陷级复核另有 relabelled 状态

reviewer

string

否

复核人标识

review_time

string

否

复核时间，ISO 8601
语义补充：overall_decision 是系统初判，review_status 是人工复核流转，两者不可混用——REVIEW 件经人工确认后只改 review_status 与 reviewer/review_time，不回写 overall_decision，保留机器初判与人判的对照证据，供误报/漏报分析与 50 件盲测指标计算（查全率≥80%、准确率≥85%，考核口径以任务书为准）。
3.4 完整示例（字段值为演示用虚构值，非实测数据）
示例一：1 件含裂纹 + 气泡（REVIEW 件）
{
  "schema_version": "1.0",
  "piece_id": "P-20260810-001",
  "batch_id": "B-01",
  "surface": "top",
  "image_path": "images/P-20260810-001-top.jpg",
  "image_size": {"width": 3200, "height": 1920},
  "model_version": "yolo11s-seg-v0.3",
  "inference_time_ms": 182.5,
  "timestamp": "2026-08-10T14:02:00+08:00",
  "defects": [
    {
      "defect_id": "d-001",
      "class_slug": "crack",
      "class_name": "裂纹",
      "bbox": {"x": 812, "y": 340, "w": 96, "h": 41},
      "mask": {"polygon": [[812, 360], [850, 345], [908, 372], [870, 381]]},
      "confidence": 0.87,
      "severity": "high"
    },
    {
      "defect_id": "d-002",
      "class_slug": "bubble",
      "class_name": "气泡",
      "bbox": {"x": 1450, "y": 980, "w": 52, "h": 48},
      "confidence": 0.76,
      "severity": "medium"
    }
  ],
  "summary": {
    "total_defects": 2,
    "by_class": {"crack": 1, "bubble": 1},
    "overall_decision": "REVIEW",
    "review_status": "pending"
  }
}
示例二：OK 件
{
  "schema_version": "1.0",
  "piece_id": "P-20260810-002",
  "batch_id": "B-01",
  "surface": "top",
  "image_path": "images/P-20260810-002-top.jpg",
  "image_size": {"width": 3200, "height": 1920},
  "model_version": "yolo11s-seg-v0.3",
  "inference_time_ms": 165.3,
  "timestamp": "2026-08-10T14:02:03+08:00",
  "defects": [],
  "summary": {
    "total_defects": 0,
    "by_class": {},
    "overall_decision": "OK",
    "review_status": "confirmed",
    "reviewer": "qc-zhang",
    "review_time": "2026-08-10T15:10:00+08:00"
  }
}
3.5 SPC / 批次追溯字段说明
piece_id + batch_id + timestamp 构成最小追溯链：任意检出可定位到「哪一批、哪一件、哪一面、何时、用哪个模型版本」。
by_class 计数可按 batch_id 聚合为批次级缺陷率与分类分布，直接喂给 SPC 控制图与 BI 看板；model_version 保证模型迭代前后数据可比（换版须重跑基线批）。
评测口径要求按 physical_piece_id / 批次拆分（防数据泄漏），故 piece_id 禁止复用与随机化，命名规则随采集规范冻结。
3.6 版本兼容与错误输出
版本兼容：schema_version 字段承载演进——新增可选字段向后兼容不升号；改字段语义或删字段才升主版本，旧版本文件须保留至少一个迭代周期可读（对齐《22-api-contract》§5）。
错误输出：单图失败不中断批处理，在该图对应目录写 result.json 并在根对象置 "status": "failed" + error 对象；同时汇总到输出根的 errors.log。


错误码

场景

error.code

处置

E001

图像读取失败（路径不存在/权限）

READ_FAIL

跳过该图，记录并继续

E002

图像解码失败（损坏/格式不支持）

DECODE_FAIL

同上，提示重拍

E003

单图推理超时（超 --timeout-ms）

TIMEOUT

标记 failed，可降分辨率重试

E004

模型加载失败（权重缺失/版本不符）

MODEL_LOAD_FAIL

致命错误，退出码 2
4. 目录约定
detect-output/
└── {date}/                  # YYYY-MM-DD，检测日期
    └── {piece_id}/          # 样件 ID
        ├── image.jpg        # 输入图像副本（按 surface 命名后缀，如 image-top.jpg）
        ├── result.json      # 结构化结果（本 schema）
        └── overlay.jpg      # 可视化叠加图（--save-overlay 时生成）
目录说明：{date} 为检测日期而非拍摄日期，避免补检旧图时目录错乱；image.jpg 保留输入副本是为了复核对照与追溯（原图目录可能被清理），多面检测时按 image-{surface}.jpg 命名，与 result.json/overlay 一一对应；overlay.jpg 供人工复核快速定位，框色与类别对应关系在使用说明第 6 章给出。
前端衔接一句：detector-ui 经 npm run sync-data 将 result.json 同步为 /data/detect/jobs/{piece_id}.json 后按《22-api-contract》组三读取，字段映射与联调步骤详见《联调检查单》（文档26，待建）。
5. 未决与待办（open）
OD-COM-07：检测器最终选型（yolo11s-seg 定版 vs YOLO 族对比），08-15 前关单。
surface 取值集合：待 360° 布置（OD-1.3/OD-COM-04）冻结。
severity 映射与 overall_decision 的 NG 规则：随定义卡允收标准共签（OD-COM-11）。
GPU 型号 / CUDA 版本 / 推理实测速度：待补@黄崇发，禁止预填。
6. 变更记录


版本

日期

说明

v0.1

2026-07-18

初稿：模块定位、CLI、字段级 schema、双示例、目录约定与错误输出

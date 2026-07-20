# 22-前后端API契约

> 同步自飞书 · token=`JWcndhT0YoX0QLx9JJkc2Wl5nsh` · type=docx · 2026-07-20
> 链接: https://bcndkrmo7f8n.feishu.cn/docx/JWcndhT0YoX0QLx9JJkc2Wl5nsh

22-前后端API契约
22 · 前后端 API 契约


版本

日期

状态

Owner

关联

v0.1 草稿

2026-07-18

建议（未与后端/算法联调确认）

程昱涵

FR-U1~U4
本文定义 apps/bi（管理看板）与 apps/detector-ui（检测结果展示，待建）两组前端所依赖的全部接口。共三组：① BI 只读静态 JSON；② 意见箱写 API（Cloudflare Pages Functions，现状延续）；③ detector-ui 检测数据（文件直读 + 可选轻 API）。表格按 OpenAPI 风格组织：路径 | 方法 | 说明 | 请求参数/体 | 响应 200 示例 | 错误码。目标读者：程昱涵（前端）、刘振宇/湛佳谕（联调）、黄崇发（算法输出对接）。
0. 总体约定
环境与基础 URL：本地 npm run dev（5173）通过 vite 代理把 /api 转发到 dev:api（127.0.0.1:8788，默认口令 dev-password，仅本地）；生产为 Cloudflare Pages 同域部署，Pages Functions 目录为仓库内 apps/bi/functions，无跨域问题。
数据格式：一律 JSON，UTF-8；时间用 ISO 8601（2026-07-18T20:00:00+08:00）；缺陷类别用锁定 slug：crack / bubble / missing_yarn / scratch / foreign_matter / whitening / contamination（对齐 FR-D1 缺陷定义卡，锁定后勿改）。
鉴权：只读接口（组一、组三 GET）免登录；写接口（组二、组三 POST）走口令，生产口令仅存 Cloudflare secret WRITE_PASSWORD，不入 git。
静态 JSON 来源：.project-spec/*.json 经 npm run sync-data 同步到 public/data/；构建后即纯静态资源，无服务端渲染、无数据库。
请求头：写接口要求 Content-Type: application/json；口令放 X-Write-Password 头（不放 URL/日志）。
1. 组一：BI 只读数据（静态 JSON，无服务端）
用途：L0 总览、预算、团队、知识库等页面（FR-U2/U4）。全部为 GET，同源静态文件，失败仅可能是 404（未跑 sync-data 或文件缺失），无 5xx。


路径

方法

说明

请求参数

响应 200 示例（节选）

错误码

/data/charter.json

GET

项目章程（题目、对象、硬指标 G1~G7）

无

{"project":"基于机器视觉的复合材料拉挤制品表面缺陷检测","goals":[{"id":"G2","target":"查全率≥80%"}]}

404

/data/risks.json

GET

风险登记册（FR-P2）

无

{"risks":[{"id":"R-01","level":"high","title":"样本到位延迟","owner":"范汝杰","status":"open"}]}

404

/data/milestones.json

GET

五节点里程碑（FR-P1）

无

{"milestones":[{"id":"M-详设","date":"2026-07-30","status":"in_progress"}]}

404

/data/m-coin-budget.json

GET

M币五账户预算与流水（FR-U4）

无

{"total":700000,"per_capita":53846,"accounts":[{"name":"人力","spent":0}]}

404

/data/workstreams.json

GET

15 条团队工作流（FR-P3）

无

{"workstreams":[{"id":"fe-bi","members":["程昱涵"],"critical":true}]}

404

/data/open-decisions.json

GET

未决决策清单（OD 系列）

无

{"decisions":[{"id":"OD-1.1","topic":"卷帘vs全局快门","status":"open"}]}

404

/data/knowledge-index.json

GET

知识库索引（sync-data 生成）

无

{"docs":[{"slug":"pultrusion-basics","title":"拉挤工艺基础","path":"/knowledge/pultrusion-basics.md","updated":"2026-07-15"}]}

404
前端缓存建议：静态 JSON 带构建指纹（vite 默认对 public/ 不做 hash），建议 fetch 时加 ?v=<buildTime> 或依赖 Pages 的 ETag；knowledge-index.json 体积可能随知识库增长，超 500KB 时再考虑分页（当前规模远未触及）。
2. 组二：意见箱写 API（Cloudflare Pages Functions，现状延续）
用途：/feedback 页面口令解锁后提交意见，服务端校验口令 → 调 GitHub contents API 把意见以 md 写回 docs/feedback-inbox/inbox/（流程细节见文档 23）。


路径

方法

说明

请求参数/体

响应 200 示例

错误码

/api/feedback

POST

提交一条意见，落盘为 inbox/YYYY-MM-DD-<slug>.md

头 X-Write-Password；body：{"category":"risk\|idea\|question\|data\|other","title":"≤80字","content":"≤4000字","contact?":"可空=匿名","ts":"ISO8601"}

{"ok":true,"file":"docs/feedback-inbox/inbox/2026-07-18-risk-sample-delay.md","commit":"a1b2c3d"}

400 JSON 解析失败；401 口令错误；422 字段缺失/超限；429 触发限流；502 GitHub 上游失败

/api/feedback/health

GET

存活与配置自检（不泄露 secret 值）

无

{"ok":true,"repo_configured":true,"branch":"main","ts":"..."}

503 缺少任一 secret（WRITE_PASSWORD/GITHUB_TOKEN/GITHUB_REPO）
服务端行为约定（建议，与现状实现对齐）：
口令用常量时间比较，失败统一返回 401，不区分「无口令/口令错」，防探测；
title 经 slug 化（小写、非字母数字转 -、截 50 字符）拼入文件名，避免路径注入；同秒重名追加 4 位随机后缀；
md 正文由服务端模板生成（含 front-matter：category/ts/contact?），客户端不直接传文件路径；
GitHub 侧用 fine-grained PAT（仅本仓 contents:write），失败时把上游状态码映射为 502 并返回 upstream_status 供排查；
限流建议：按 IP + 口令维度，每 IP 10 次/小时、每口令 30 次/小时（Pages Functions 可用 Cloudflare 绑定 KV/Rate Limiting API；最低成本方案是函数内存计数 + 超阈值 429）。意见箱是低频场景，限流只为防误刷与爆破，不应影响正常填报。
3. 组三：detector-ui 检测数据（文件直读 + 可选轻 API）
用途：FR-U3 检测结果展示（框叠加、列表回放、结构化结果）。原则与 BI 一致：先文件直读（静态 JSON），复核回写确有需要再开轻 API，不提前架服务端。结构化字段与 FR-D4 / 0711 共识对齐：样件/批次 ID、检测面、缺陷类别 slug、位置框、置信度、时间、模型版本、复核状态。


路径

方法

说明

请求参数/体

响应 200 示例

错误码

/data/detect/jobs-index.json

GET

检测任务/样件索引（列表页数据源）

无

{"jobs":[{"piece_id":"P-20260810-001","batch":"B-01","faces":2,"defects":3,"model_version":"yolo11s-seg-v0.3","ts":"2026-08-10T14:02:00+08:00","review_status":"pending"}]}

404

/data/detect/jobs/{piece_id}.json

GET

单样件检测明细（叠加框数据源）

路径参数 piece_id（样件 ID）

见下方 schema

404 piece_id 不存在

/api/review

POST

复核结论回写（草稿，待评审：是否本期实现取决于 8 月复核工作量）

头 X-Write-Password；body：{"piece_id":"P-...","defect_id":"d-003","action":"confirm\|reject\|relabel","new_slug?":"scratch","note?":"...","reviewer?":"昵称或空","ts":"..."}

{"ok":true,"file":"docs/feedback-inbox/inbox/2026-08-12-review-P-001.md"}

401/422/502 同组二
jobs/{piece_id}.json schema（建议稿，与黄崇发算法输出在文档 26 联调检查单中对齐）：
{
  "piece_id": "P-20260810-001",
  "batch_id": "B-01",
  "faces": [
    {
      "face": "top",
      "image": "/data/detect/images/P-20260810-001-top.jpg",
      "image_size": [3200, 1920],
      "defects": [
        {
          "defect_id": "d-001",
          "slug": "crack",
          "bbox": [812, 340, 96, 41],
          "confidence": 0.87,
          "severity_hint": "medium",
          "review_status": "pending"
        }
      ]
    }
  ],
  "detected_at": "2026-08-10T14:02:00+08:00",
  "model_version": "yolo11s-seg-v0.3",
  "review_status": "pending"
}
字段口径：bbox=[x,y,w,h]，像素坐标，原点左上（与 LabelImg/YOLO 导出换算一致，标注侧导出时统一）；confidence∈[0,1]；review_status∈{pending,confirmed,rejected,relabelled}；face 取值集合（top/bottom/left/right 或现场四方位编号）待采集方案（OD-1.3 360° 布置）冻结后锁定，当前以字符串透传。
4. 统一错误码表


码

含义

适用组

前端建议行为

400

请求体不是合法 JSON

二/三

视为前端 bug，上报 console

401

口令缺失或错误

二/三

退回口令输入态，不清空已填表单

404

静态文件/资源不存在

一/三

提示「数据未同步，请跑 sync-data」并灰显

422

字段缺失/超长/枚举非法

二/三

逐字段红标，附服务端返回的 field_errors

429

触发限流

二/三

显示剩余冷却秒数，禁用提交按钮

502

GitHub 等上游失败

二/三

提示重试；保留草稿到 localStorage

503

服务端配置缺失

二

仅管理员可见的健康页展示缺失项
错误响应统一信封：{"ok":false,"error":{"code":422,"message":"title is required","field_errors":{"title":"required"}}}；成功响应统一 {"ok":true,...}。所有写接口响应里禁止回显口令、token 等敏感值。
5. 版本约定
现状（已决议沿用到中期）：无版本前缀，/api/feedback 直接挂在 Pages 同域。理由：消费者只有本项目两个前端，与函数同仓部署、同 commit 演进，版本协调成本为零。
建议（中期后任一条件成立即启用）：当出现第三方消费者（如 V公司侧系统、算法脚本直连）或一次不兼容变更时，切 /api/v1 前缀；旧路径保留一个迭代周期（≥2 周）并返回 Deprecation 头，之后 410 下线。静态 JSON 不做 URL 版本，靠 schema 内 schema_version 字段演进（新增字段向后兼容，改语义才升号）。
每次契约变更：先改本文档表格 → 组二/组三对应函数与 sync-data 脚本 → 前端调用点，顺序不可逆；PR 标题带 [api-contract] 便于追溯。
6. 变更记录


版本

日期

说明

v0.1

2026-07-18

初稿：三组接口、统一错误码、版本约定；/api/review 与 detect schema 标注为建议稿，待与算法侧联调确认

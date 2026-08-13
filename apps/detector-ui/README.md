# detector-ui（检测结果展示）

离线检测模块结构化输出的检索、框/掩码叠加、人工复核与导出。只读 `public/data/detect/` 快照，不硬编码算法目录。

本地：

```bash
cd apps/detector-ui
npm install
npm run sync-results   # 若仓库根 detect-output/ 有黄崇发样例则转换；否则保留 mock
npm run dev
```

打开 http://127.0.0.1:5174 — 与 BI（5173）端口错开。复核写接口复用 BI 的 `npm run dev:api`（8788，口令 `dev-password`）。

| 路由 | 内容 |
|------|------|
| `/` | 任务列表（样件/批次/复核状态） |
| `/jobs/:id` | 详情：框+掩码叠加、置信度、复核 |
| `/review` | 复核队列（低置信置顶） |
| `/export` | CSV（UTF-8 BOM）/ JSON |

契约：飞书《22-前后端API契约》《20-检测结果展示UI规格》《26-联调检查单》。

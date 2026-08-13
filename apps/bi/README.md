# MEM-AIVisdefect BI

管理看板：进度 / 风险 / M币 / 团队 / **检测分析** / 项目知识库。质量 KPI 无金标准时灰显。

**队员用法**：打开已发布网站，重点看「检测」。

## 本地启动

```bash
cd apps/bi
npm install
npm run sync-data   # 从仓库根 .project-spec 同步 JSON 到 public/data
```

两个终端：

```bash
npm run dev:api     # http://127.0.0.1:8788  detector-ui 复核写入（默认口令 dev-password）
npm run dev         # http://localhost:5173   /api 代理到上面
```

改章程、预算、风险后，重新 `npm run sync-data` 再刷新页面。

## 页面

| 路由 | 内容 |
|------|------|
| `/` | L0 总览：健康灯、五节点+课程双时间轴、风险、KPI 占位、detector-ui 入口 |
| `/detect` | 检测分析：门禁 / KPI / 帕累托 / 空间 / 分区 / 热力 / 件号表（mock） |
| `/budget` | M币五账户 + 按人头均分（口径待确认） |
| `/team` | 工作流表 + 关键路径缺口告警 |
| `/open-decisions` | 未决事项四列泳道（逾期标红） |
| `/biweekly` | 双周报归档 |
| `/knowledge` | 项目知识库浏览 |

检测结果展示见 [`apps/detector-ui`](../detector-ui/)（本地 5174）。薄后端：`POST /api/review`、`GET /api/feedback/health`（意见箱页已下线，API 仍保留）。

## 同步

```bash
npm run sync-data
```

会同步：

- `.project-spec/*.json` → `public/data/`
- 策展文档 + **飞书镜像** `docs/agent-knowledge-base/feishu-sync/` + 意见箱 inbox/digests → `public/knowledge/`
- 生成 `public/data/knowledge-index.json`

## 部署（群晖 NAS · 国内免翻墙）

局域网已开 **Web Station**（`http://192.168.1.82/`）。静态站与 GitHub Pages 共用路径 `/MEM-AIVisdefect/`：

```bash
cd apps/bi
npm run build:nas
```

把 `nas/html/MEM-AIVisdefect/` 整目录拷到 NAS 共享文件夹 **web**：

- File Station：`/web/MEM-AIVisdefect/`
- 或 Container Manager：把 `nas/`（含 `html/`）放到 `/docker/mem-aivisdefect-bi`，用其中的 `docker-compose.yml` 映射 **8088**

队员打开：

- 局域网：http://192.168.1.82/MEM-AIVisdefect/#/detect
- 校外（Cloudflare 快速隧道，NAS 容器 `mem-aivisdefect-tunnel` 24h）：  
  https://subscription-phones-own-kansas.trycloudflare.com/MEM-AIVisdefect/index.html#/detect  
  （目录 URL 会被 Web Station 301 到 http，请带 `index.html`。容器重启后主机名会变，日志在 Container Manager → 该项目。）

QuickConnect ID 是 `zoologist`，但 **不能** 直接挂自定义 Web Station；本机公网 IP 走了代理，DDNS/端口转发进不来。校园网若打不开 `trycloudflare.com`，改用国内穿透（cpolar）或 Cloudflare 命名隧道固定域名。

NAS 这份是只读看板。复核写入仍走 Cloudflare Functions / 本地 `dev:api`。

## 部署（Cloudflare Pages）

1. 在 Cloudflare 创建 Pages 项目（建议名 `mem-aivisdefect-bi`），构建输出目录 `dist`，Functions 目录为仓库内 `apps/bi/functions`。
2. 配置 Pages 环境变量 / secrets：
   - `WRITE_PASSWORD`：队入口令（勿写入 git）
   - `GITHUB_TOKEN`：fine-grained PAT，权限含本仓 `contents:write`
   - `GITHUB_REPO`：如 `owner/MEM-AIVisdefect`
   - `GITHUB_BRANCH`：可选，默认 `main`
3. GitHub 仓库 secrets（供 Actions）：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. 推送后由 [`.github/workflows/deploy-bi.yml`](../../.github/workflows/deploy-bi.yml) 执行：`sync-data` → `build` → `pages deploy`。
5. 公开 URL 确定后写回根 `README.md` 与本文件。

本地默认口令：`dev-password`（仅 `dev:api`）。生产口令只放 Cloudflare，不要提交仓库。

## 设计

工业纸感底 + 松绿强调 + Newsreader/IBM Plex；非紫白渐变模板。

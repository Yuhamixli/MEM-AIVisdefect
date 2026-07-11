# MEM-AIVisdefect BI

管理看板：进度 / 风险 / M币 / 团队 / **项目知识库** / **意见箱（网页填写）**。质量 KPI 无数据时灰显。

**队员用法**：打开已发布网站 → 读知识免登录 → 「意见箱」用队入口令解锁后填写。

## 本地启动

```bash
cd apps/bi
npm install
npm run sync-data   # 从仓库根 .project-spec 同步 JSON 到 public/data
```

两个终端：

```bash
npm run dev:api     # http://127.0.0.1:8788  默认口令 dev-password，写本地 inbox/
npm run dev         # http://localhost:5173   /api 代理到上面
```

改章程、预算、风险后，重新 `npm run sync-data` 再刷新页面。

## 页面

| 路由 | 内容 |
|------|------|
| `/` | L0 总览：健康灯、里程碑、风险、KPI 占位 |
| `/budget` | M币五账户 |
| `/team` | 名册完整率 / 角色缺口占位 |
| `/knowledge` | 项目知识库浏览 |
| `/feedback` | 意见箱：口令解锁 → 表单 → 写回 `docs/feedback-inbox/inbox/` |

## 同步

```bash
npm run sync-data
```

会同步：

- `.project-spec/*.json` → `public/data/`
- 策展文档 + 意见箱 inbox/digests → `public/knowledge/`
- 生成 `public/data/knowledge-index.json`

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

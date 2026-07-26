# 飞书文档双向同步

| 方向 | 命令 | 触发 | 说明 |
|------|------|------|------|
| **飞书 → 仓库** | `npm run sync-docs` | 人工 / 需要时 | 拉取共享盘 docx 正文为 Markdown，供检索 |
| **仓库 → 飞书** | `npm run push-docs` | **GitHub Action 自动** | 按清单把仓库文档导入为飞书云文档 |

约定不变：**仓库是文档之源**；飞书是协作阅读面。批注定稿后仍应回写仓库（或只在仓库改、靠 push 刷新飞书）。

## 零手工推送（推荐）

1. 仓库 Settings → Secrets and variables → Actions 配置：
   - `FEISHU_APP_ID`
   - `FEISHU_APP_SECRET`
   - （可选）`FEISHU_PUSH_FOLDER_TOKEN`：推送目标文件夹；不配则用 pull 同源 folder
2. 飞书开放平台应用开通并**发布**至少：
   - 云空间文件读写 / 上传
   - 云文档导入（drive import_task）
   - 目标文件夹对应用「可管理」或可写入
3. 合并到 `main` 且变更命中 `docs/feishu-push-manifest.json` 的 `include` 路径时，workflow `Push docs to Feishu` 自动：
   - 按内容哈希跳过未改文件
   - 上传并导入为新版云文档
   - 删除同路径旧版 token（换链刷新）
   - 回写 `PUSH_STATE.json` 并 bot commit

手动全量重推：Actions → Push docs to Feishu → Run workflow → force=true。

## 本地命令

```bash
cd apps/feishu-cursor-bridge
cp .env.example .env   # 填入 FEISHU_APP_* 

# 只看将推送哪些（不调飞书）
npm run push-docs -- --dry-run

# 推送变更文件
npm run push-docs

# 强制重推全部匹配文件
npm run push-docs -- --force

# 只推一个路径
npm run push-docs -- --only=docs/design/offline-module-interface.md
```

清单：[`docs/feishu-push-manifest.json`](../../feishu-push-manifest.json)  
状态：[`PUSH_STATE.json`](./PUSH_STATE.json)

## 飞书 → 仓库（原能力）

```bash
cd apps/feishu-cursor-bridge
npm run sync-docs
git add docs/agent-knowledge-base/feishu-sync
git commit -m "Sync Feishu docs into knowledge base"
git push
```

- 源文件夹默认：`JviVfMA56lMkzhdVoZdcEVk9nBd`
- 索引：同步后生成的 [`INDEX.md`](./INDEX.md)
- 表格/多维表格/附件暂不同步（仅 docx/doc）

## 权限（飞书开放平台）

| 能力 | sync-docs（读） | push-docs（写） |
|------|-----------------|-----------------|
| 查看云空间文件 | 需要 | 需要 |
| 获取云文档正文 | 需要 | — |
| 上传素材 / 导入文档 | — | **需要** |
| 删除云空间文件（替换旧版） | — | 建议开通 |

未开通时命令会报权限错误；CI 在 Secrets 缺失时会 **warning 跳过**（不红掉无关流水线）。

## 设计取舍

- **不**在本地保存时实时推送（避免半成品刷屏）；以 **merge 到 main** 为准。
- 飞书「导入」每次生成新 doc_token，脚本用 `PUSH_STATE` 记映射并删旧版；协作链接会变——重要入口请钉「文件夹」而非单文档永久 URL，或在飞书侧做快捷方式指向最新版。
- Word **修订痕迹**导入后通常会合并为正文；需要留痕请同时保留仓库中的 `.docx`。
- `feishu-sync/**` 拉下来的镜像 **不会**再 push 回去，避免回环。

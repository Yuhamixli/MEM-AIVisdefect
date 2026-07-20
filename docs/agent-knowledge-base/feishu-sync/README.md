# 飞书文档同步落点

本目录由桥接应用脚本从飞书共享盘拉取 **docx** 正文生成，供 Cloud Agent / 仓库检索使用。

## 怎么同步

```bash
cd apps/feishu-cursor-bridge
npm run sync-docs
git add docs/agent-knowledge-base/feishu-sync
git commit -m "Sync Feishu docs into knowledge base"
git push
```

- 源文件夹默认：`JviVfMA56lMkzhdVoZdcEVk9nBd`（可用环境变量 `FEISHU_SYNC_FOLDER_TOKEN` 覆盖）
- 索引见同步后生成的 [`INDEX.md`](./INDEX.md)
- 表格/多维表格/附件暂不同步（仅 docx/doc）

## 权限（飞书开放平台）

应用需开通并发布，例如：

- 查看、评论和下载云空间中所有文件（或至少共享文件夹可读）
- 获取云文档内容 / `docx:document:readonly`

未开通时 `npm run sync-docs` 会报权限错误。

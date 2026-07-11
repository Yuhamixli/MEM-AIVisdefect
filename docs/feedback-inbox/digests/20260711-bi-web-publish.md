# Digest

```yaml
digest_id: DIGEST-20260711-bi-web
period: 2026-07-11 ~ 2026-07-11
inbox_scanned: 1
new_items: 1
author: Agent
```

## 1. 本轮收到什么

| 文件 | 类型 | 作者 | 一句话 | 建议处置 |
|------|------|------|--------|----------|
| `20260711-管理者-网站读写替代改Git.md` | opinion | 课题管理者 | 信息化低 → 网站读/填，勿靠改 Git | **采纳为仓库建设**（R-D08/D10/D11）；不改 `requirements.md` |

## 2. 综合思考

与现有 BI 只读看板、意见箱 Git 提交流程一致：网页是队员入口，仓库仍是 Agent 消化源。第一期不做每人账号、不做名册/周报网页填，避免范围膨胀。

## 3. 建议纳入下周计划的事项

- [x] 实现 BI 部署流水线 + `/feedback` 口令表单 + 写回 inbox
- [ ] 配置 Cloudflare / GitHub secrets 并公布公开 URL
- [ ] 向队员宣导：读知识免登、填意见用队入口令

## 4. 需课题管理者拍板

- 队入口令具体值（写入 Cloudflare `WRITE_PASSWORD`，勿提交仓库）
- 公开 URL 确认后写入根 README

## 5. 已移入 processed 的文件

- （本条在实现落地后由管理者移入 `processed/`；实现期间保留在 `inbox/` 作追溯）

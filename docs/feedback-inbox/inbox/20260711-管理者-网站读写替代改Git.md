# 意见反馈

```yaml
id: FB-20260711-01
type: opinion
author: 课题管理者
date: 2026-07-11
status: open
priority_hint: high
related_area: 团队
```

## 一句话

团队信息化水平低，知识与意见收集应发布为网站，浏览器登录后读取或填写，而不是改 Git。

## 详细说明

当前意见箱依赖在仓库 `inbox/` 新建 Markdown，对多数队员门槛过高。管理看板（BI）若只本地 `npm run dev`，也无法成为日常入口。需要公开可访问的网站：读知识免登录；填写意见需队入口令。

## 你希望发生什么

- 发布 BI 网站，知识库浏览器可读
- 网页意见箱表单，口令解锁后提交
- 提交写回 `docs/feedback-inbox/inbox/`，仍由 Agent/管理者按原流程消化

## 若不处理会怎样

意见散落在聊天、名册与反馈回收率低，知识库形同虚设。

## 附件 / 链接

- 决策：读免登 / 写口令；第一期仅意见箱表单
- 方案：Cloudflare Pages + Pages Function + GitHub Contents API

# 意见与需求收集箱（Feedback Inbox）

**用途**: 收集 13 人团队及指导老师相关的**意见、诉求、范围建议、阻塞吐槽**。  
**原则**: 先收进盒子，再定期消化；不在聊天里散落、不默认立刻改范围。

---

## 目录

```
feedback-inbox/
  inbox/          ← 新意见丢这里（未处理）
  processed/      ← Agent/管理者消化后移入
  digests/        ← 定期检索后的思考纪要
  _template-*.md  ← 提交模板
  README.md       ← 本说明
```

## 怎么提交（给队员）

### 推荐：网站意见箱

打开 BI 网站 → **意见箱** → 输入队入口令 → 填表提交。  
提交后自动写入本目录 `inbox/`，无需改 Git。

### 备选：直接丢 Markdown

1. 复制 `_template-opinion.md` 或 `_template-requirement.md`
2. 改名为：`YYYYMMDD-姓名或ID-简短主题.md`  
   例：`20260711-T03-希望先做标注规范.md`
3. 放到 **`inbox/`**
4. 状态保持 `open`，不要自己改需求文档

一句话也可以：在 `inbox/` 新建文件，至少写清 **谁 / 想要什么 / 为什么**。

## Agent / 管理者怎么用（定时检索）

| 节奏 | 动作 |
|------|------|
| **每次会话开始**（若本会话管项目） | 扫一眼 `inbox/` 是否有新文件 |
| **每周至少 1 次**（建议周五写周报前） | 全量检索 `inbox/`，输出一篇 digest 到 `digests/` |
| **会前**（见张老师 / 里程碑评审） | 再扫一次，把高优先级意见带进议程 |

### 消化时必须做的思考（写入 digest）

1. **归类**: 意见 / 需求 / 风险信号 / 纯情绪（也要记）  
2. **影响**: 范围 · 进度 · 成本(M币) · 质量 · 团队  
3. **建议处置**: 采纳进需求 / 记入风险 / 本周不做 / 需课题管理者拍板  
4. **不自动改章程**: 变更走变更控制；digest 只给建议  
5. 处理后把原文件从 `inbox/` **移到** `processed/`，并在文首加 `processed_at` / `decision`

### Digest 命名

`digests/YYYYMMDD-weekly.md` 或 `digests/YYYYMMDD-pre-meeting-zhang.md`

---

## 与其它目录的边界

| 这里 | 不是这里 |
|------|----------|
| 尚未决策的声音 | 已确认需求 → `docs/03-requirements/` |
| 临时吐槽与点子 | 已采纳风险 → `docs/risk-management/` |
| 待消化输入 | 技术 ADR → `docs/02-tech-research/` |

---

## 当前状态

- 盒子已建，等待首条意见。  
- 仓库建设项：见 `docs/project-management/REPO-TODO.md` → R-B07。

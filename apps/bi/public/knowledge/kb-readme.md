# Agent 知识库

本目录是 Agent 与课题管理者共享的**结构化知识**，也是新队员入门资料区。

## 新队员从这开始

→ **[`onboarding-guide.md`](./onboarding-guide.md)**（阅读顺序与 48h checklist）

## 目录约定

| 路径 | 用途 | 更新节奏 |
|------|------|----------|
| `onboarding-guide.md` | 入门总路径 | 流程变时 |
| `pultrusion-basics.md` | 拉挤工艺基础 | 永久骨架 |
| `industry-background.md` | 行业背景入门 | 阶段性 |
| `industry-challenges.md` | **行业难点**（选战场） | 阶段性 |
| `vision-tech-primer.md` | 视觉技术入门（非实现） | 阶段性 |
| `defect-catalog.md` | 缺陷图谱 | 随样本扩充 |
| `../project-management/team-capability-profile.md` | 团队能力画像 | 名册回收后更新 |
| `progress-status.md` | 当前进度单一入口 | 每周 / 重大变更 |
| `team/` | 成员补充材料（可选） | 人员变动时 |
| `raw-data/` | 原始训练数据约定目录 | 管理者决定上传时 |
| `../feedback-inbox/` | **意见与需求收集箱**（定时检索） | 有新文件即扫；每周 digest |
| `../project-management/` | 名册、M币、WBS、变更控制、双 TODO | 运营节奏 |

## 知识分层

```yaml
永久: 工艺基础、PMBOK 映射（见 PROMPT.md）
入门包: onboarding + 行业 + 技术导读 + 缺陷图谱
每周: progress-status、风险、M币快照
每次评审后: 会议纪要、待办关闭
有数据后: 缺陷图谱配图、数据集版本
```

## 飞书 ↔ GitHub 知识同步（必守）

Cloud Agent / 飞书机器人**只读 GitHub `main`**；飞书云文档是人读写入口。两边必须定期对齐，避免边界与版本漂移。

| 规则 | 说明 |
|------|------|
| **真相源** | 已定稿知识进 Git：`docs/agent-knowledge-base/`（及必要的 `docs/`）；飞书放协作草稿与会议材料 |
| **飞书 → Git** | 定稿后：`cd apps/feishu-cursor-bridge && npm run sync-docs` → 落入 `feishu-sync/`，再 `git commit && git push`；也可手写进对应 md |
| **Git → 飞书** | 重要变更（ADR、缺陷定义、进度）同步到共享文件夹对应分类，或群内公告链接 |
| **节奏** | 至少**每周一次**对账；重大评审前后各做一次；改 ADR / 缺陷目录当日同步 |
| **共享盘** | https://bcndkrmo7f8n.feishu.cn/drive/folder/JviVfMA56lMkzhdVoZdcEVk9nBd |
| **待办** | [`REPO-TODO` R-B09](../project-management/REPO-TODO.md) |

镜像到 BI：改完知识 md 后执行 `cd apps/bi && npm run sync-data`。

## 与仓库建设

知识库完善项见 [`../project-management/REPO-TODO.md`](../project-management/REPO-TODO.md) 轨道 B。

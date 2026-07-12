import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../../..')
const publicDir = join(__dirname, '../public')
const dataDir = join(publicDir, 'data')
const knowledgeDir = join(publicDir, 'knowledge')

mkdirSync(dataDir, { recursive: true })
mkdirSync(knowledgeDir, { recursive: true })

/** @type {{ id: string, title: string, category: string, source: string, description?: string }[]} */
const CATALOG = [
  {
    id: 'progress-status',
    title: '当前进度状态',
    category: '项目管理',
    source: 'docs/agent-knowledge-base/progress-status.md',
    description: '每周更新的项目状态入口',
  },
  {
    id: 'todo',
    title: '课题运营 TODO',
    category: '项目管理',
    source: 'docs/project-management/TODO.md',
    description: '按技术模块拆分的运营待办（对齐申报书）',
  },
  {
    id: 'operation-plan',
    title: '课题运营计划（申报书）',
    category: '项目管理',
    source: 'docs/project-management/operation-plan-from-proposal.md',
    description: '五节点、考核指标、模块 WBS 主口径',
  },
  {
    id: 'repo-todo',
    title: '仓库建设 TODO',
    category: '项目管理',
    source: 'docs/project-management/REPO-TODO.md',
  },
  {
    id: 'wbs',
    title: 'WBS 与 13 周节奏（旧）',
    category: '项目管理',
    source: 'docs/project-management/wbs-and-schedule.md',
    description: '旧 13 周表；节点与考核以 operation-plan 为准',
  },
  {
    id: 'm-coin-system',
    title: 'M币成本管理体系',
    category: '财务',
    source: 'docs/project-management/m-coin-cost-system.md',
  },
  {
    id: 'm-coin-ledger',
    title: 'M币流水账',
    category: '财务',
    source: 'docs/project-management/m-coin-ledger.md',
  },
  {
    id: 'team-roster',
    title: '团队名册',
    category: '团队',
    source: 'docs/project-management/team-roster.md',
  },
  {
    id: 'bi-metrics',
    title: 'BI 管理指标一页纸',
    category: '项目管理',
    source: 'docs/project-management/bi-metrics-onepager.md',
  },
  {
    id: 'requirements',
    title: '需求文档（初稿）',
    category: '范围与需求',
    source: 'docs/03-requirements/requirements.md',
  },
  {
    id: 'risk-register',
    title: '风险登记册',
    category: '风险',
    source: 'docs/risk-management/risk-register.md',
  },
  {
    id: 'industry-research',
    title: '行业调研：市场与竞品',
    category: '调研',
    source: 'docs/01-industry-research/2026-07-11-market-and-competitors.md',
  },
  {
    id: 'adr-001',
    title: 'ADR-001 四层视觉架构',
    category: '技术决策',
    source: 'docs/02-tech-research/ADR-001-four-layer-vision-stack.md',
  },
  {
    id: 'adr-002',
    title: 'ADR-002 复用 XnoAvi 平台能力',
    category: '技术决策',
    source: 'docs/02-tech-research/ADR-002-reuse-xnoavi-capabilities.md',
    description: '不整包 xnobot；优先 skills/handoff/知识分层/inbox→digest',
  },
  {
    id: 'pultrusion-basics',
    title: '拉挤工艺基础',
    category: '领域知识',
    source: 'docs/agent-knowledge-base/pultrusion-basics.md',
  },
  {
    id: 'onboarding-guide',
    title: '新队员入门导读',
    category: '领域知识',
    source: 'docs/agent-knowledge-base/onboarding-guide.md',
    description: '入门阅读顺序与 48h checklist',
  },
  {
    id: 'industry-background',
    title: '行业背景导读（入门）',
    category: '领域知识',
    source: 'docs/agent-knowledge-base/industry-background.md',
  },
  {
    id: 'industry-challenges',
    title: '项目行业难点',
    category: '领域知识',
    source: 'docs/agent-knowledge-base/industry-challenges.md',
    description: '工艺/数据/产线/组织难点与选战场',
  },
  {
    id: 'vision-tech-primer',
    title: '视觉检测技术导读（入门）',
    category: '领域知识',
    source: 'docs/agent-knowledge-base/vision-tech-primer.md',
  },
  {
    id: 'defect-catalog',
    title: '缺陷图谱 v0.2（申报书七类）',
    category: '领域知识',
    source: 'docs/agent-knowledge-base/defect-catalog.md',
  },
  {
    id: 'team-capability',
    title: '团队能力画像',
    category: '团队',
    source: 'docs/project-management/team-capability-profile.md',
  },
  {
    id: 'team-workstreams',
    title: '团队工作流 / 职能分工',
    category: '团队',
    source: 'docs/project-management/team-workstreams.md',
    description: '职能工作流、建议人数与关键路径；BI 源见 workstreams.json',
  },
  {
    id: 'change-control',
    title: '变更控制一页纸',
    category: '项目管理',
    source: 'docs/project-management/change-control.md',
  },
  {
    id: 'evaluation-principles',
    title: '评价原则（张老师：目的>手段）',
    category: '项目管理',
    source: 'docs/project-management/evaluation-principles.md',
    description: '准确度/效率/成本优先；算法复杂度非 KPI',
  },
  {
    id: 'open-decisions',
    title: '待沟通 / 待决议清单',
    category: '项目管理',
    source: 'docs/project-management/open-decisions.md',
    description: '采集/处理/推理/机械/交付物/节点 — 开放议题',
  },
  {
    id: 'reporting-readme',
    title: '汇报与沟通机制说明',
    category: '沟通',
    source: 'docs/05-reporting/README.md',
    description: '会议纪要 + 周报 + 阶段报告落盘约定',
  },
  {
    id: 'meetings-readme',
    title: '会议纪要目录约定',
    category: '沟通',
    source: 'docs/05-reporting/meetings/README.md',
  },
  {
    id: 'meeting-zhang-20260711',
    title: '纪要：张老师首次沟通（2026-07-11）',
    category: '沟通',
    source: 'docs/05-reporting/meetings/2026-07-11-zhang-first-meeting.md',
    description: '确立评价原则；待沟通议题落库',
  },
  {
    id: 'kb-readme',
    title: 'Agent 知识库说明',
    category: '领域知识',
    source: 'docs/agent-knowledge-base/README.md',
  },
  {
    id: 'data-mgmt',
    title: '数据集管理计划',
    category: '数据',
    source: 'docs/data-management/data-management-plan.md',
  },
  {
    id: 'quality-metrics',
    title: '质量度量标准',
    category: '质量',
    source: 'docs/quality/metrics-standard.md',
  },
  {
    id: 'ip-strategy',
    title: '知识产权与专利布局',
    category: '附录',
    source: 'docs/annex/ip-strategy.md',
  },
  {
    id: 'meeting-brief-zhang',
    title: '见张老师汇报提纲',
    category: '沟通',
    source: 'docs/05-reporting/2026-07-11-meeting-brief-zhang.md',
  },
  {
    id: 'feedback-inbox',
    title: '意见与需求收集箱说明',
    category: '意见箱',
    source: 'docs/feedback-inbox/README.md',
  },
  {
    id: 'prompt',
    title: 'PROMPT 控制面（全文）',
    category: '控制面',
    source: 'PROMPT.md',
    description: 'Agent 项目管理核心提示词',
  },
  {
    id: 'readme',
    title: '仓库 README',
    category: '控制面',
    source: 'README.md',
  },
]

// 1) sync .project-spec JSON
for (const name of readdirSync(join(root, '.project-spec'))) {
  if (!name.endsWith('.json')) continue
  copyFileSync(join(root, '.project-spec', name), join(dataDir, name))
  console.log(`data  ${name}`)
}

// 2) sync curated knowledge markdown
const index = []
for (const item of CATALOG) {
  const abs = join(root, item.source)
  if (!existsSync(abs)) {
    console.warn(`skip  missing ${item.source}`)
    continue
  }
  const outName = `${item.id}.md`
  copyFileSync(abs, join(knowledgeDir, outName))
  index.push({
    id: item.id,
    title: item.title,
    category: item.category,
    description: item.description ?? '',
    source: item.source,
    path: `/knowledge/${outName}`,
  })
  console.log(`know  ${item.id}`)
}

// 3) auto-include feedback inbox items (except templates)
const inboxDir = join(root, 'docs/feedback-inbox/inbox')
if (existsSync(inboxDir)) {
  for (const name of readdirSync(inboxDir)) {
    if (!name.endsWith('.md')) continue
    const id = `feedback-${name.replace(/\.md$/i, '')}`
    copyFileSync(join(inboxDir, name), join(knowledgeDir, `${id}.md`))
    index.push({
      id,
      title: `意见箱 · ${name.replace(/\.md$/i, '')}`,
      category: '意见箱',
      description: 'inbox 未处理/示例条目',
      source: `docs/feedback-inbox/inbox/${name}`,
      path: `/knowledge/${id}.md`,
    })
    console.log(`know  ${id}`)
  }
}

const digestsDir = join(root, 'docs/feedback-inbox/digests')
if (existsSync(digestsDir)) {
  for (const name of readdirSync(digestsDir)) {
    if (!name.endsWith('.md') || name === 'README.md') continue
    const id = `digest-${name.replace(/\.md$/i, '')}`
    copyFileSync(join(digestsDir, name), join(knowledgeDir, `${id}.md`))
    index.push({
      id,
      title: `Digest · ${name.replace(/\.md$/i, '')}`,
      category: '意见箱',
      description: '定期消化纪要',
      source: `docs/feedback-inbox/digests/${name}`,
      path: `/knowledge/${id}.md`,
    })
    console.log(`know  ${id}`)
  }
}

writeFileSync(
  join(dataDir, 'knowledge-index.json'),
  JSON.stringify(
    {
      updated_at: new Date().toISOString().slice(0, 10),
      count: index.length,
      items: index,
    },
    null,
    2,
  ),
)

console.log(`\nindex ${index.length} knowledge items → public/data/knowledge-index.json`)
console.log(`root  ${relative(process.cwd(), root)}`)

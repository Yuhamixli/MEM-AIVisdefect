export type MilestoneStatus = 'pending' | 'in_progress' | 'done' | 'blocked'

export interface Milestone {
  id: string
  name: string
  criteria: string
  review: string
  status: MilestoneStatus | string
  target_week: number
  date?: string
  completed_at: string | null
}

export interface MilestoneTracking {
  updated_at: string
  current_milestone: string
  acceptance_source?: string
  operation_plan?: string
  notes?: string
  internal_stretch_note?: string
  milestones: Milestone[]
}

export interface Account {
  budget: number
  spent: number
  ratio: number
  requires_pm_approval?: boolean
}

export interface MCoinBudget {
  currency: string
  total_budget: number
  updated_at: string
  status: string
  accounts: Record<string, Account>
  rules?: {
    ledger_threshold_m?: number
    reserve_approval?: string
    weekly_report_required?: boolean
  }
}

export interface Risk {
  id: string
  description: string
  probability: string
  impact: string
  level: string
  response: string
  trigger: string
  status: string
  owner: string | null
}

export interface RiskRegister {
  updated_at: string
  risks: Risk[]
}

export interface DefectType {
  id: string
  name: string
  slug?: string
  severity?: string
}

export interface ObjectiveMetric {
  metric: string
  name?: string
  target: number
  unit: string
  note?: string
  direction?: string
}

export interface EvaluationPrinciples {
  source?: string
  summary?: string
  value_dimensions?: string[]
  operational_checks?: string[]
  doc_path?: string
  minutes_path?: string
  open_decisions_path?: string
  note?: string
}

export interface ProjectCharter {
  project_id: string
  project_name: string
  status: string
  pmbok_process_group: string
  current_phase: string
  academic_context?: {
    advisor?: string
    program?: string
    cost_currency?: string
  }
  evaluation_principles?: EvaluationPrinciples
  management_priority?: string[]
  team?: {
    size?: number
    roles_assigned?: boolean
  }
  background?: {
    domain?: string
    product?: string
    applications?: string[]
    defect_types?: DefectType[]
    priority_defect_strategy?: string
  }
  objectives?: {
    acceptance_source?: string
    primary?: ObjectiveMetric[]
    deliverables?: string[]
    engineering?: string[]
    internal_stretch?: {
      note?: string
      metrics?: ObjectiveMetric[]
    }
  }
  timeline?: {
    planned_start?: string
    planned_end?: string
    duration_weeks?: number
    operation_plan?: string
    gates?: { id: string; name: string; date: string }[]
  }
  constraints?: {
    budget_total_m_coin?: number
    data_status?: string
    deployment?: string
  }
  success_criteria?: string[]
}

export interface Workstream {
  id: string
  name: string
  suggested_headcount: string
  critical_path: boolean
  responsibility: string
}

export interface WorkstreamsCatalog {
  updated_at: string
  source_of_truth?: string
  doc_path?: string
  knowledge_id?: string
  notes?: string
  workstreams: Workstream[]
}

export interface BiSnapshot {
  charter: ProjectCharter
  milestones: MilestoneTracking
  budget: MCoinBudget
  risks: RiskRegister
  workstreams: WorkstreamsCatalog
}

/** TODO 模块占位（对齐 docs/project-management/TODO.md §1–§11） */
export const OPS_MODULES: { id: string; name: string; owners: string }[] = [
  { id: 'pm', name: '项目管理', owners: 'pm / req / reporting / m-coin' },
  { id: 'market', name: '市场分析 / 情报', owners: 'market / intel' },
  { id: 'struct-eng', name: '结构 / 工艺', owners: 'struct-eng' },
  { id: 'optics', name: '光学与图像采集', owners: 'optics' },
  { id: 'data', name: '缺陷定义卡与标注', owners: 'data' },
  { id: 'algo', name: '视觉检测算法', owners: 'algo-detect / algo-seg' },
  { id: 'integration', name: '离线检测模块', owners: 'integration' },
  { id: 'fe-bi', name: '前后端 / BI', owners: 'fe-bi' },
  { id: 'agent-ops', name: 'AI Agent 工程', owners: 'agent-ops / feedback' },
  { id: 'docs', name: '使用说明与验收', owners: 'reporting / integration' },
  { id: 'quality', name: '质量与测试（50 件）', owners: 'quality / data' },
]

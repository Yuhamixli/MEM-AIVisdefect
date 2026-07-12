import type { BiSnapshot } from './types'
import type { KnowledgeIndex } from './knowledge'

/** Resolve public asset under Vite `base` (e.g. `/MEM-AIVisdefect/` on GitHub Pages). */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL
  const cleaned = path.startsWith('/') ? path.slice(1) : path
  return `${base}${cleaned}`
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = publicUrl(path)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status}`)
  }
  return res.json() as Promise<T>
}

/** Loads synced copies under /public/data (run `npm run sync-data` first). */
export async function loadBiSnapshot(): Promise<BiSnapshot> {
  const [charter, milestones, budget, risks, workstreams] = await Promise.all([
    fetchJson<BiSnapshot['charter']>('/data/project-charter.json'),
    fetchJson<BiSnapshot['milestones']>('/data/milestone-tracking.json'),
    fetchJson<BiSnapshot['budget']>('/data/m-coin-budget.json'),
    fetchJson<BiSnapshot['risks']>('/data/risk-register.json'),
    fetchJson<BiSnapshot['workstreams']>('/data/workstreams.json'),
  ])
  return { charter, milestones, budget, risks, workstreams }
}

export async function loadKnowledgeIndex(): Promise<KnowledgeIndex> {
  return fetchJson<KnowledgeIndex>('/data/knowledge-index.json')
}

export async function loadKnowledgeMarkdown(path: string): Promise<string> {
  const url = publicUrl(path)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status}`)
  }
  return res.text()
}

export function budgetExecutionRate(budget: BiSnapshot['budget']): number {
  const spent = Object.values(budget.accounts).reduce((s, a) => s + a.spent, 0)
  return budget.total_budget === 0 ? 0 : spent / budget.total_budget
}

export function openRiskCounts(risks: BiSnapshot['risks']) {
  const open = risks.risks.filter((r) => r.status === 'open')
  return {
    total: open.length,
    critical: open.filter((r) => r.level === 'critical').length,
    high: open.filter((r) => r.level === 'high').length,
    medium: open.filter((r) => r.level === 'medium').length,
  }
}

export const ACCOUNT_LABELS: Record<string, string> = {
  labor: '人力 labor',
  compute: '算力 compute',
  data: '数据 data',
  hardware: '硬件 hardware',
  reserve: '风险金 reserve',
}

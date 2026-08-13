/** 七类缺陷固定色板（文档 20 §7）与中文名映射。 */

export const CLASS_CATALOG: Record<
  string,
  { zh: string; color: string; severity: '关键' | '重要' | '一般'; stroke: 'double' | 'single' }
> = {
  crack: { zh: '裂纹', color: '#C0392B', severity: '关键', stroke: 'double' },
  bubble: { zh: '气泡', color: '#E67E22', severity: '关键', stroke: 'double' },
  missing_yarn: { zh: '缺纱', color: '#B7950B', severity: '重要', stroke: 'single' },
  scratch: { zh: '划伤', color: '#2471A3', severity: '重要', stroke: 'single' },
  foreign_matter: { zh: '异物', color: '#7D3C98', severity: '重要', stroke: 'single' },
  whitening: { zh: '发白', color: '#17A589', severity: '重要', stroke: 'single' },
  contamination: { zh: '脏污', color: '#6E2C00', severity: '一般', stroke: 'single' },
}

export const REVIEW_LABEL: Record<string, string> = {
  pending: '待复核',
  confirmed: '确认',
  rejected: '驳回',
  relabelled: '改判',
}

export const SEVERITY_LABEL: Record<string, string> = {
  关键: '关键',
  重要: '重要',
  一般: '一般',
  high: '关键',
  medium: '重要',
  low: '一般',
}

export function classColor(slug: string): string {
  return CLASS_CATALOG[slug]?.color ?? '#94a3b8'
}

export function classNameZh(slug: string, fallback?: string): string {
  return CLASS_CATALOG[slug]?.zh ?? fallback ?? slug
}

export function classSeverity(slug: string, hint?: string): string {
  if (hint && SEVERITY_LABEL[hint]) return SEVERITY_LABEL[hint]
  return CLASS_CATALOG[slug]?.severity ?? '—'
}

export function isKnownSlug(slug: string): boolean {
  return Boolean(CLASS_CATALOG[slug])
}

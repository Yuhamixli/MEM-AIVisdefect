export const DETECT_CLASS: Record<string, { zh: string; color: string; severity: string }> = {
  crack: { zh: '裂纹', color: '#C0392B', severity: '关键' },
  bubble: { zh: '气泡', color: '#E67E22', severity: '关键' },
  missing_yarn: { zh: '缺纱', color: '#B7950B', severity: '重要' },
  scratch: { zh: '划伤', color: '#2471A3', severity: '重要' },
  foreign_matter: { zh: '异物', color: '#7D3C98', severity: '重要' },
  whitening: { zh: '发白', color: '#17A589', severity: '重要' },
  contamination: { zh: '脏污', color: '#6E2C00', severity: '一般' },
}

export type ConfusionKey = 'tp' | 'tn' | 'fp' | 'fn'

export interface DetectJobRow {
  piece_id: string
  batch_id: string
  ts: string
  faces: number
  defects: number
  review_status: string
  max_confidence: number
  classes: string[]
  ng: boolean
  gold_ng?: boolean
  pred_ng?: boolean
  outcome?: ConfusionKey
}

export interface DetectDefectRow {
  piece_id: string
  batch_id: string
  face: string
  ts: string
  model_version: string
  piece_review: string
  ok: boolean
  defect_id?: string
  slug?: string
  class_name?: string
  bbox?: [number, number, number, number]
  cx?: number
  cy?: number
  confidence?: number
  severity?: string
  review_status?: string
  match?: 'tp' | 'fp'
}

export interface FnCase {
  piece_id: string
  batch_id: string
  face: string
  slug: string
  class_name: string
  cx: number
  cy: number
  severity?: string
  note?: string
}

export interface DetectAnalytics {
  schema_version: string
  source: string
  updated_at: string
  note: string
  inspiration?: string[]
  image_size: [number, number]
  jobs: DetectJobRow[]
  defects: DetectDefectRow[]
  fn_cases?: FnCase[]
  protocol?: {
    piece_target: number
    class_target: number
    taskbook_recall: number
    taskbook_accuracy: number
    internal_recall: number
    threshold: number
    ci: string
  }
}

export interface WilsonInterval {
  k: number
  n: number
  p: number
  lo: number
  hi: number
}

export function wilson(k: number, n: number, z = 1.95996398454): WilsonInterval {
  if (n <= 0) return { k, n, p: 0, lo: 0, hi: 0 }
  const p = k / n
  const z2 = z * z
  const den = 1 + z2 / n
  const centre = (p + z2 / (2 * n)) / den
  const half = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / den
  return { k, n, p, lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) }
}

export function confusionMetrics(tp: number, tn: number, fp: number, fn: number) {
  const n = tp + tn + fp + fn
  const pos = tp + fn
  const neg = tn + fp
  const predPos = tp + fp
  const predNeg = tn + fn
  const recall = pos ? tp / pos : 0
  const specificity = neg ? tn / neg : 0
  const precision = predPos ? tp / predPos : 0
  const npv = predNeg ? tn / predNeg : 0
  const accuracy = n ? (tp + tn) / n : 0
  const fpr = neg ? fp / neg : 0
  const far = pos ? fn / pos : 0
  const frr = neg ? fp / neg : 0
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0
  const mccDen = Math.sqrt(predPos * pos * predNeg * neg)
  const mcc = mccDen ? (tp * tn - fp * fn) / mccDen : 0
  const youden = recall + specificity - 1
  return {
    tp,
    tn,
    fp,
    fn,
    n,
    recall,
    specificity,
    precision,
    npv,
    accuracy,
    fpr,
    far,
    frr,
    f1,
    mcc,
    youden,
    ci: {
      recall: wilson(tp, pos),
      accuracy: wilson(tp + tn, n),
      precision: wilson(tp, predPos),
      specificity: wilson(tn, neg),
      far: wilson(fn, pos),
      frr: wilson(fp, neg),
    },
  }
}

export interface ClassStat {
  slug: string
  zh: string
  color: string
  count: number
  share: number
  cumulative: number
  avgConf: number
}

export function summarize(doc: DetectAnalytics) {
  const pieces = doc.jobs.length
  const ng = doc.jobs.filter((j) => j.ng).length
  const ok = pieces - ng
  const yieldRate = pieces === 0 ? 0 : ok / pieces
  const defs = doc.defects
  const avgConf =
    defs.length === 0 ? 0 : defs.reduce((s, d) => s + (d.confidence ?? 0), 0) / defs.length
  const pending = doc.jobs.filter((j) => j.review_status === 'pending').length
  const primary3 = new Set(['crack', 'bubble', 'scratch'])
  const primaryPieces = doc.jobs.filter((j) => j.classes.some((c) => primary3.has(c))).length
  const lowConf = defs.filter((d) => (d.confidence ?? 1) < 0.5).length

  const classMap = new Map<string, { count: number; conf: number }>()
  for (const d of defs) {
    const slug = d.slug || 'unknown'
    const prev = classMap.get(slug) || { count: 0, conf: 0 }
    prev.count += 1
    prev.conf += d.confidence ?? 0
    classMap.set(slug, prev)
  }
  const byClassUnsorted: ClassStat[] = [...classMap.entries()].map(([slug, v]) => ({
    slug,
    zh: DETECT_CLASS[slug]?.zh ?? slug,
    color: DETECT_CLASS[slug]?.color ?? '#6b7a86',
    count: v.count,
    share: defs.length ? v.count / defs.length : 0,
    cumulative: 0,
    avgConf: v.count ? v.conf / v.count : 0,
  }))
  byClassUnsorted.sort((a, b) => b.count - a.count)
  let run = 0
  for (const row of byClassUnsorted) {
    run += row.share
    row.cumulative = run
  }

  const dayMap = new Map<string, { pieces: number; ng: number; defects: number }>()
  for (const j of doc.jobs) {
    const day = j.ts.slice(0, 10)
    const prev = dayMap.get(day) || { pieces: 0, ng: 0, defects: 0 }
    prev.pieces += 1
    prev.ng += j.ng ? 1 : 0
    prev.defects += j.defects
    dayMap.set(day, prev)
  }
  const byDay = [...dayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, ...v, yield: v.pieces ? (v.pieces - v.ng) / v.pieces : 0 }))

  const batchMap = new Map<string, { pieces: number; ng: number; defects: number }>()
  for (const j of doc.jobs) {
    const prev = batchMap.get(j.batch_id) || { pieces: 0, ng: 0, defects: 0 }
    prev.pieces += 1
    prev.ng += j.ng ? 1 : 0
    prev.defects += j.defects
    batchMap.set(j.batch_id, prev)
  }
  const byBatch = [...batchMap.entries()].map(([batch, v]) => ({
    batch,
    ...v,
    yield: v.pieces ? (v.pieces - v.ng) / v.pieces : 0,
  }))

  const bins = Array.from({ length: 10 }, (_, i) => ({ lo: i / 10, hi: (i + 1) / 10, n: 0 }))
  for (const d of defs) {
    const c = d.confidence ?? 0
    const idx = Math.min(9, Math.max(0, Math.floor(c * 10)))
    bins[idx].n += 1
  }

  const reviews: Record<string, number> = { pending: 0, confirmed: 0, rejected: 0, relabelled: 0 }
  for (const j of doc.jobs) {
    reviews[j.review_status] = (reviews[j.review_status] ?? 0) + 1
  }

  const FACE_ZH: Record<string, string> = {
    top: '顶面',
    bottom: '底面',
    left: '左侧面',
    right: '右侧面',
  }
  const faceMap = new Map<string, number>()
  for (const d of defs) {
    const f = d.face || 'unknown'
    faceMap.set(f, (faceMap.get(f) ?? 0) + 1)
  }
  const byFace = [...faceMap.entries()].map(([face, count]) => ({
    face,
    zh: FACE_ZH[face] ?? face,
    count,
  }))

  const width = doc.image_size[0] || 3200
  const zoneMap = { left: 0, mid: 0, right: 0 }
  for (const d of defs) {
    const t = (d.cx ?? 0) / width
    if (t < 1 / 3) zoneMap.left += 1
    else if (t < 2 / 3) zoneMap.mid += 1
    else zoneMap.right += 1
  }
  const byZone = [
    { zone: 'left', zh: '端部·左', count: zoneMap.left },
    { zone: 'mid', zh: '中段', count: zoneMap.mid },
    { zone: 'right', zh: '端部·右', count: zoneMap.right },
  ]

  const SEV_ZH: Record<string, string> = { high: '关键', medium: '重要', low: '一般' }
  const sevMap = new Map<string, number>()
  for (const d of defs) {
    const s = d.severity || 'unknown'
    sevMap.set(s, (sevMap.get(s) ?? 0) + 1)
  }
  const bySeverity = [...sevMap.entries()].map(([severity, count]) => ({
    severity,
    zh: SEV_ZH[severity] ?? severity,
    count,
  }))

  const classBatch = byClassUnsorted.map((c) => {
    const cells = byBatch.map((b) => ({
      batch: b.batch,
      count: defs.filter((d) => d.slug === c.slug && d.batch_id === b.batch).length,
    }))
    return { slug: c.slug, zh: c.zh, color: c.color, cells }
  })

  const dppBins = [0, 0, 0, 0, 0]
  for (const j of doc.jobs) {
    const n = Math.min(4, j.defects)
    dppBins[n] += 1
  }
  const byDpp = dppBins.map((n, i) => ({
    label: i === 4 ? '4+' : String(i),
    n,
  }))

  const topNg = [...doc.jobs]
    .filter((j) => j.ng)
    .sort((a, b) => b.defects - a.defects || b.max_confidence - a.max_confidence)
    .slice(0, 8)

  const slugsHit = new Set(defs.map((d) => d.slug).filter(Boolean))

  const pieceBox = { tp: 0, tn: 0, fp: 0, fn: 0 }
  for (const j of doc.jobs) {
    const key = j.outcome ?? (j.gold_ng ? (j.ng ? 'tp' : 'fn') : j.ng ? 'fp' : 'tn')
    pieceBox[key] += 1
  }
  const ids = new Set(doc.jobs.map((j) => j.piece_id))
  const fnCases = (doc.fn_cases ?? []).filter((c) => ids.has(c.piece_id))
  const instTp = defs.filter((d) => (d.match ?? 'tp') === 'tp').length
  const instFp = defs.filter((d) => d.match === 'fp').length
  const instFn = fnCases.length
  const instTn = doc.jobs
    .filter((j) => j.outcome === 'tn')
    .reduce((s, j) => s + Math.max(1, j.faces), 0)
  const instance = confusionMetrics(instTp, instTn, instFp, instFn)
  const piece = confusionMetrics(pieceBox.tp, pieceBox.tn, pieceBox.fp, pieceBox.fn)

  const byClassEval = byClassUnsorted.map((c) => {
    const tp = defs.filter((d) => d.slug === c.slug && (d.match ?? 'tp') === 'tp').length
    const fp = defs.filter((d) => d.slug === c.slug && d.match === 'fp').length
    const fn = fnCases.filter((x) => x.slug === c.slug).length
    const rec = wilson(tp, tp + fn)
    const prec = wilson(tp, tp + fp)
    return { ...c, tp, fp, fn, recall: rec.p, recallCi: rec, precision: prec.p, precisionCi: prec }
  })

  const calib = Array.from({ length: 5 }, (_, i) => ({
    lo: i / 5,
    hi: (i + 1) / 5,
    n: 0,
    tp: 0,
  }))
  for (const d of defs) {
    const c = d.confidence ?? 0
    const idx = Math.min(4, Math.max(0, Math.floor(c * 5)))
    calib[idx].n += 1
    if ((d.match ?? 'tp') === 'tp') calib[idx].tp += 1
  }
  const reliability = calib.map((b) => ({
    ...b,
    mid: (b.lo + b.hi) / 2,
    empirical: b.n ? b.tp / b.n : 0,
  }))

  const protoSrc = doc.protocol
  const pieceTarget = protoSrc?.piece_target ?? 50
  const classTarget = protoSrc?.class_target ?? 3
  const taskbookRecall = protoSrc?.taskbook_recall ?? 0.8
  const taskbookAccuracy = protoSrc?.taskbook_accuracy ?? 0.85
  const internalRecall = protoSrc?.internal_recall ?? 0.99

  return {
    pieces,
    ng,
    ok,
    yieldRate,
    defects: defs.length,
    avgConf,
    pending,
    primaryPieces,
    lowConf,
    byClass: byClassUnsorted,
    byDay,
    byBatch,
    bins,
    reviews,
    byFace,
    byZone,
    bySeverity,
    classBatch,
    byDpp,
    topNg,
    piece,
    instance,
    byClassEval,
    reliability,
    fnCases,
    protocol: {
      pieceTarget,
      classTarget,
      classesHit: slugsHit.size,
      recall: instance.recall,
      accuracy: piece.accuracy,
      taskbookRecall,
      taskbookAccuracy,
      internalRecall,
    },
  }
}

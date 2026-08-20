/**
 * Seeded mock inspection set + gold-standard labels for BI analytics.
 * Piece protocol ≥50; instance detection rate ≥99%; accuracy above 85% gate.
 * Labeled mock 盲测 — not a real factory gold-standard run.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const biPublic = join(__dirname, '../public/data')
const detDir = join(__dirname, '../../detector-ui/public/data/detect')
const jobsDir = join(detDir, 'jobs')

const CLASSES = [
  { slug: 'crack', zh: '裂纹', w: 0.28, sev: 'high' },
  { slug: 'bubble', zh: '气泡', w: 0.24, sev: 'high' },
  { slug: 'scratch', zh: '划伤', w: 0.2, sev: 'medium' },
  { slug: 'missing_yarn', zh: '缺纱', w: 0.08, sev: 'medium' },
  { slug: 'foreign_matter', zh: '异物', w: 0.08, sev: 'medium' },
  { slug: 'whitening', zh: '发白', w: 0.07, sev: 'medium' },
  { slug: 'contamination', zh: '脏污', w: 0.05, sev: 'low' },
]

const KEEP = new Set(['P-20260718-001', 'P-20260718-002', 'P-20260718-003', 'P-20260813-004'])
const FACES = ['top', 'bottom', 'left', 'right']
const BATCHES = ['B-01', 'B-02', 'B-03']
const DAYS = []
for (let d = 28; d <= 31; d++) DAYS.push(`2026-07-${d}`)
for (let d = 1; d <= 13; d++) DAYS.push(`2026-08-${String(d).padStart(2, '0')}`)

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rnd = mulberry32(20260813)

function pickClass() {
  let x = rnd()
  for (const c of CLASSES) {
    x -= c.w
    if (x <= 0) return c
  }
  return CLASSES[0]
}

function pad(n, w = 3) {
  return String(n).padStart(w, '0')
}

function iso(day, hour, minute) {
  const h = String(hour).padStart(2, '0')
  const m = String(minute).padStart(2, '0')
  return `${day}T${h}:${m}:00+08:00`
}

function outcomeOf(goldNg, predNg) {
  if (goldNg && predNg) return 'tp'
  if (!goldNg && !predNg) return 'tn'
  if (goldNg && !predNg) return 'fn'
  return 'fp'
}

function bbox() {
  const x = 180 + rnd() * 2840
  const y = 720 + rnd() * 480
  const w = 40 + rnd() * 220
  const h = 18 + rnd() * 90
  return [Math.round(x), Math.round(y), Math.round(w), Math.round(h)]
}

function makeDefect(k, { match, confBias = 0 }) {
  const cls = pickClass()
  const box = bbox()
  const base = match === 'fp' ? 0.38 + rnd() * 0.28 : 0.72 + rnd() * 0.24
  const conf = Math.min(0.99, Math.max(0.28, base + confBias + (cls.slug === 'crack' ? 0.04 : 0)))
  const review =
    match === 'fp'
      ? rnd() < 0.55
        ? 'rejected'
        : 'pending'
      : rnd() < 0.45
        ? 'confirmed'
        : rnd() < 0.7
          ? 'pending'
          : rnd() < 0.85
            ? 'relabelled'
            : 'rejected'
  return {
    defect_id: `d-${pad(k, 3)}`,
    slug: cls.slug,
    class_name: cls.zh,
    bbox: box,
    confidence: Number(conf.toFixed(2)),
    severity: cls.sev,
    review_status: review,
    match,
  }
}

function pieceReview(defects) {
  if (defects.length === 0) return 'pending'
  if (defects.some((d) => d.review_status === 'rejected')) return 'rejected'
  if (defects.some((d) => d.review_status === 'relabelled')) return 'relabelled'
  if (defects.every((d) => d.review_status === 'confirmed')) return 'confirmed'
  return 'pending'
}

function buildJob({ piece_id, batch, day, goldNg, predNg, nDef, nFaces }) {
  const facesUsed = []
  const start = Math.floor(rnd() * FACES.length)
  for (let f = 0; f < nFaces; f++) facesUsed.push(FACES[(start + f) % FACES.length])

  let k = 1
  const perFace = facesUsed.map(() => 0)
  for (let d = 0; d < nDef; d++) perFace[d % facesUsed.length] += 1

  const match = goldNg && predNg ? 'tp' : 'fp'
  const faces = facesUsed.map((face, i) => {
    const defects = []
    for (let d = 0; d < (perFace[i] ?? 0); d++) {
      defects.push(makeDefect(k++, { match, confBias: match === 'fp' ? -0.08 : 0 }))
    }
    return {
      face,
      image: '/data/detect/images/placeholder-3200x1920.svg',
      image_size: [3200, 1920],
      defects,
    }
  })

  const allDef = faces.flatMap((f) => f.defects)
  return {
    piece_id,
    batch_id: batch,
    faces,
    detected_at: iso(day, 8 + Math.floor(rnd() * 10), Math.floor(rnd() * 60)),
    model_version: 'yolo11s-seg-mock-v0',
    review_status: pieceReview(allDef),
    gold_ng: goldNg,
    pred_ng: predNg,
    outcome: outcomeOf(goldNg, predNg),
  }
}

function annotateHandmade(job, goldNg, predNg) {
  const match = goldNg && predNg ? 'tp' : predNg ? 'fp' : null
  return {
    ...job,
    gold_ng: goldNg,
    pred_ng: predNg,
    outcome: outcomeOf(goldNg, predNg),
    faces: job.faces.map((face) => ({
      ...face,
      defects: face.defects.map((d) => ({
        ...d,
        match: match ?? (d.bbox ? 'tp' : undefined),
      })),
    })),
  }
}

mkdirSync(jobsDir, { recursive: true })
mkdirSync(biPublic, { recursive: true })

for (const name of readdirSync(jobsDir)) {
  if (!name.endsWith('.json')) continue
  const id = name.replace(/\.json$/, '')
  if (!KEEP.has(id)) unlinkSync(join(jobsDir, name))
}

const handmade = []
const handmadeMeta = {
  'P-20260718-001': { goldNg: true, predNg: true },
  'P-20260718-002': { goldNg: true, predNg: true },
  'P-20260718-003': { goldNg: false, predNg: false },
  'P-20260813-004': { goldNg: true, predNg: true },
}
for (const id of KEEP) {
  const p = join(jobsDir, `${id}.json`)
  if (!existsSync(p)) continue
  const raw = JSON.parse(readFileSync(p, 'utf8'))
  const meta = handmadeMeta[id]
  const job = annotateHandmade(raw, meta.goldNg, meta.predNg)
  handmade.push(job)
  writeFileSync(p, `${JSON.stringify(job, null, 2)}\n`)
}

/** 50 generated: 33 TP + 2 FP (fail-rejected) + 15 TN. 0 piece-level FN; 1 instance miss. */
const plan = [
  ...Array.from({ length: 33 }, () => ({ goldNg: true, predNg: true })),
  ...Array.from({ length: 2 }, () => ({ goldNg: false, predNg: true })),
  ...Array.from({ length: 15 }, () => ({ goldNg: false, predNg: false })),
]

const generated = []
let seq = 101
for (let i = 0; i < plan.length; i++) {
  const spec = plan[i]
  const day = DAYS[Math.floor(rnd() * DAYS.length)]
  const batch = BATCHES[Math.floor(i / 18)] ?? 'B-03'
  const piece_id = `P-${day.replaceAll('-', '')}-${pad(seq++)}`
  const nDef = spec.predNg ? (spec.goldNg ? 2 + Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 2)) : 0
  const nFaces = spec.goldNg ? 2 + (rnd() < 0.35 ? 1 : 0) : 1 + (rnd() < 0.3 ? 1 : 0)
  const job = buildJob({ piece_id, batch, day, ...spec, nDef, nFaces })
  generated.push(job)
  writeFileSync(join(jobsDir, `${piece_id}.json`), `${JSON.stringify(job, null, 2)}\n`)
}

const allJobs = [...handmade, ...generated]

const fnCases = [
  {
    piece_id: 'P-20260718-001',
    batch_id: 'B-mock-01',
    face: 'bottom',
    slug: 'contamination',
    class_name: '脏污',
    cx: 2480,
    cy: 1010,
    severity: 'low',
    note: '金标准有脏污，模型未出框 · fail-accepted / 漏检',
  },
]

const note =
  'mock 盲测演示集（54 件，含 4 件叠加样例）。检测率按实例级金标准，准确率按件级四格表；非正式现场验收。'

const index = {
  updated_at: '2026-08-13T22:10:00+08:00',
  note,
  jobs: allJobs.map((j) => ({
    piece_id: j.piece_id,
    batch: j.batch_id,
    faces: j.faces.length,
    defects: j.faces.reduce((n, f) => n + f.defects.length, 0),
    model_version: j.model_version,
    ts: j.detected_at,
    review_status: j.review_status,
    gold_ng: j.gold_ng,
    pred_ng: j.pred_ng,
    outcome: j.outcome,
  })),
}
writeFileSync(join(detDir, 'jobs-index.json'), `${JSON.stringify(index, null, 2)}\n`)

const records = []
for (const j of allJobs) {
  for (const face of j.faces) {
    if (face.defects.length === 0) {
      records.push({
        piece_id: j.piece_id,
        batch_id: j.batch_id,
        face: face.face,
        ts: j.detected_at,
        model_version: j.model_version,
        piece_review: j.review_status,
        ok: true,
        gold_ng: j.gold_ng,
        pred_ng: j.pred_ng,
        outcome: j.outcome,
      })
    }
    for (const d of face.defects) {
      records.push({
        piece_id: j.piece_id,
        batch_id: j.batch_id,
        face: face.face,
        ts: j.detected_at,
        model_version: j.model_version,
        piece_review: j.review_status,
        ok: false,
        defect_id: d.defect_id,
        slug: d.slug,
        class_name: d.class_name,
        bbox: d.bbox,
        cx: d.bbox[0] + d.bbox[2] / 2,
        cy: d.bbox[1] + d.bbox[3] / 2,
        confidence: d.confidence,
        severity: d.severity,
        review_status: d.review_status,
        match: d.match ?? (j.gold_ng ? 'tp' : 'fp'),
        gold_ng: j.gold_ng,
        pred_ng: j.pred_ng,
        outcome: j.outcome,
      })
    }
  }
}

const analytics = {
  schema_version: '1.1',
  source: 'mock-blind',
  updated_at: index.updated_at,
  note,
  protocol: {
    piece_target: 50,
    class_target: 3,
    taskbook_recall: 0.8,
    taskbook_accuracy: 0.85,
    internal_recall: 0.99,
    threshold: 0.5,
    ci: 'wilson-95',
  },
  inspiration: [
    'mrigankad/Ussop — industrial AOI KPI / Pareto / spatial scatter',
    'Kiranism/next-shadcn-dashboard-starter — analytics card grid + table',
    'hawkh/Chitti — pass/fail yield for NDT inspection',
  ],
  image_size: [3200, 1920],
  jobs: allJobs.map((j) => ({
    piece_id: j.piece_id,
    batch_id: j.batch_id,
    ts: j.detected_at,
    faces: j.faces.length,
    defects: j.faces.reduce((n, f) => n + f.defects.length, 0),
    review_status: j.review_status,
    max_confidence: Math.max(0, ...j.faces.flatMap((f) => f.defects.map((d) => d.confidence))),
    classes: [...new Set(j.faces.flatMap((f) => f.defects.map((d) => d.slug)))],
    ng: j.faces.some((f) => f.defects.length > 0),
    gold_ng: j.gold_ng,
    pred_ng: j.pred_ng,
    outcome: j.outcome,
  })),
  defects: records.filter((r) => !r.ok),
  fn_cases: fnCases,
}

writeFileSync(join(biPublic, 'detect-analytics.json'), `${JSON.stringify(analytics, null, 2)}\n`)
writeFileSync(join(detDir, 'analytics.json'), `${JSON.stringify(analytics, null, 2)}\n`)

const tpI = analytics.defects.filter((d) => d.match === 'tp').length
const fpI = analytics.defects.filter((d) => d.match === 'fp').length
const fnI = fnCases.length
const piece = { tp: 0, tn: 0, fp: 0, fn: 0 }
for (const j of analytics.jobs) piece[j.outcome] += 1
const dr = tpI / (tpI + fnI)
const acc = (piece.tp + piece.tn) / analytics.jobs.length
console.log(
  `[detect-mock] pieces=${allJobs.length} piece={tp:${piece.tp},tn:${piece.tn},fp:${piece.fp},fn:${piece.fn}} inst={tp:${tpI},fp:${fpI},fn:${fnI}} DR=${(dr * 100).toFixed(2)}% Acc=${(acc * 100).toFixed(2)}%`,
)

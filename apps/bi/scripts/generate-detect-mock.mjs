/**
 * Seeded mock of 50-piece inspection runs for BI analytics + detector-ui.
 * Inspired by industrial AOI dashboards (Pareto / yield / spatial scatter).
 * Does not pretend to be gold-standard 50-piece evaluation (recall/accuracy stay 待测).
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
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

const DAYS = []
for (let d = 28; d <= 31; d++) DAYS.push(`2026-07-${d}`)
for (let d = 1; d <= 13; d++) DAYS.push(`2026-08-${String(d).padStart(2, '0')}`)

const BATCHES = ['B-01', 'B-02', 'B-03']
const FACES = ['top', 'bottom']
const REVIEWS = ['pending', 'pending', 'pending', 'confirmed', 'confirmed', 'rejected', 'relabelled']

mkdirSync(jobsDir, { recursive: true })
mkdirSync(biPublic, { recursive: true })

const generated = []

for (let i = 1; i <= 50; i++) {
  const day = DAYS[Math.floor(rnd() * DAYS.length)]
  const batch = BATCHES[Math.floor(i / 18)] ?? 'B-03'
  const piece_id = `P-${day.replaceAll('-', '')}-${pad(i)}`
  const isOk = rnd() < 0.36
  const nDef = isOk ? 0 : 1 + Math.floor(rnd() * 3)
  const face = FACES[Math.floor(rnd() * FACES.length)]
  const defects = []
  for (let k = 0; k < nDef; k++) {
    const cls = pickClass()
    const x = 180 + rnd() * 2840
    const y = 720 + rnd() * 480
    const w = 40 + rnd() * 220
    const h = 18 + rnd() * 90
    const conf = Math.min(0.99, Math.max(0.28, 0.52 + rnd() * 0.42 + (cls.slug === 'crack' ? 0.06 : 0)))
    defects.push({
      defect_id: `d-${pad(k + 1, 3)}`,
      slug: cls.slug,
      class_name: cls.zh,
      bbox: [Math.round(x), Math.round(y), Math.round(w), Math.round(h)],
      confidence: Number(conf.toFixed(2)),
      severity: cls.sev,
      review_status: REVIEWS[Math.floor(rnd() * REVIEWS.length)],
    })
  }
  const pieceReview = defects.length === 0
    ? 'pending'
    : defects.some((d) => d.review_status === 'rejected')
      ? 'rejected'
      : defects.some((d) => d.review_status === 'relabelled')
        ? 'relabelled'
        : defects.every((d) => d.review_status === 'confirmed')
          ? 'confirmed'
          : 'pending'
  const job = {
    piece_id,
    batch_id: batch,
    faces: [
      {
        face,
        image: '/data/detect/images/placeholder-3200x1920.svg',
        image_size: [3200, 1920],
        defects,
      },
    ],
    detected_at: iso(day, 8 + Math.floor(rnd() * 10), Math.floor(rnd() * 60)),
    model_version: 'yolo11s-seg-mock-v0',
    review_status: pieceReview,
  }
  generated.push(job)
  writeFileSync(join(jobsDir, `${piece_id}.json`), `${JSON.stringify(job, null, 2)}\n`)
}

const handmade = []
for (const id of ['P-20260718-001', 'P-20260718-002', 'P-20260718-003', 'P-20260813-004']) {
  const p = join(jobsDir, `${id}.json`)
  if (existsSync(p)) handmade.push(JSON.parse(readFileSync(p, 'utf8')))
}

const allJobs = [...handmade, ...generated]
const index = {
  updated_at: '2026-08-13T20:20:00+08:00',
  note: 'mock 50 件演示集（含 4 件手搓叠加样例）；黄崇发真实样例到位后 npm run sync-results 替换',
  jobs: allJobs.map((j) => ({
    piece_id: j.piece_id,
    batch: j.batch_id,
    faces: j.faces.length,
    defects: j.faces.reduce((n, f) => n + f.defects.length, 0),
    model_version: j.model_version,
    ts: j.detected_at,
    review_status: j.review_status,
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
      })
    }
  }
}

const analytics = {
  schema_version: '1.0',
  source: 'mock',
  updated_at: index.updated_at,
  note: index.note,
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
  })),
  defects: records.filter((r) => !r.ok),
}

writeFileSync(join(biPublic, 'detect-analytics.json'), `${JSON.stringify(analytics, null, 2)}\n`)
writeFileSync(join(detDir, 'analytics.json'), `${JSON.stringify(analytics, null, 2)}\n`)

const ng = analytics.jobs.filter((j) => j.ng).length
const defs = analytics.defects.length
console.log(
  `[detect-mock] pieces=${allJobs.length} ng=${ng} defects=${defs} → bi/public/data/detect-analytics.json`,
)

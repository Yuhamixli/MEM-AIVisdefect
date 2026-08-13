/**
 * Convert detect-output/{date}/{piece_id}/result.json → detector-ui public snapshot.
 *
 * Usage (from apps/detector-ui):
 *   npm run sync-results
 *
 * Source default: <repo>/detect-output
 * Output: public/data/detect/{jobs-index.json, jobs/*.json, images/*}
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = join(__dirname, '..')
const repoRoot = join(appDir, '../..')
const srcRoot = process.env.DETECT_OUTPUT_DIR
  ? join(process.cwd(), process.env.DETECT_OUTPUT_DIR)
  : join(repoRoot, 'detect-output')
const outDir = join(appDir, 'public/data/detect')
const jobsDir = join(outDir, 'jobs')
const imagesDir = join(outDir, 'images')

const SLUG_ZH = {
  crack: '裂纹',
  bubble: '气泡',
  missing_yarn: '缺纱',
  scratch: '划伤',
  foreign_matter: '异物',
  whitening: '发白',
  contamination: '脏污',
}

mkdirSync(jobsDir, { recursive: true })
mkdirSync(imagesDir, { recursive: true })

if (!existsSync(srcRoot)) {
  console.log(`[sync-results] no source at ${srcRoot} — keep existing public/data/detect snapshot`)
  process.exit(0)
}

/** @type {Map<string, { piece_id: string, batch_id: string, faces: object[], detected_at: string, model_version: string, review_status: string }>} */
const byPiece = new Map()

function walkDates() {
  const dates = readdirSync(srcRoot, { withFileTypes: true }).filter((d) => d.isDirectory())
  for (const dateDir of dates) {
    const datePath = join(srcRoot, dateDir.name)
    const pieces = readdirSync(datePath, { withFileTypes: true }).filter((d) => d.isDirectory())
    for (const pieceDir of pieces) {
      ingestPiece(join(datePath, pieceDir.name), pieceDir.name)
    }
  }
}

function ingestPiece(dir, fallbackId) {
  const files = readdirSync(dir)
  const jsonFiles = files.filter((f) => f.endsWith('.json'))
  if (jsonFiles.length === 0) {
    console.warn(`[sync-results] skip ${dir}: no json`)
    return
  }
  for (const name of jsonFiles) {
    const raw = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    const pieceId = String(raw.piece_id || fallbackId)
    const surface = String(raw.surface || (name === 'result.json' ? 'top' : name.replace(/\.json$/, '')))
    const imageFile = String(raw.image_file || 'image.jpg')
    const srcImage = join(dir, imageFile)
    let publicImage = `/data/detect/images/placeholder-3200x1920.svg`
    if (existsSync(srcImage)) {
      const ext = extname(imageFile) || '.jpg'
      const destName = `${pieceId}-${surface}${ext}`
      copyFileSync(srcImage, join(imagesDir, destName))
      publicImage = `/data/detect/images/${destName}`
    }
    const face = {
      face: surface,
      image: publicImage,
      image_size: raw.image_size || [3200, 1920],
      defects: (raw.defects || []).map((d) => ({
        defect_id: d.defect_id,
        slug: d.class_slug || d.slug,
        class_name: d.class_name || SLUG_ZH[d.class_slug || d.slug] || d.class_slug,
        bbox: d.bbox,
        confidence: d.confidence,
        severity: d.severity,
        mask: d.mask,
        review_status: d.review_status || 'pending',
      })),
    }
    const prev = byPiece.get(pieceId) || {
      piece_id: pieceId,
      batch_id: raw.batch_id || '',
      faces: [],
      detected_at: raw.inference_time || raw.detected_at || '',
      model_version: raw.model_version || '',
      review_status: 'pending',
    }
    prev.faces.push(face)
    prev.batch_id = prev.batch_id || raw.batch_id || ''
    prev.detected_at = prev.detected_at || raw.inference_time || ''
    prev.model_version = prev.model_version || raw.model_version || ''
    byPiece.set(pieceId, prev)
  }
}

walkDates()

const jobs = [...byPiece.values()]
for (const job of jobs) {
  writeFileSync(join(jobsDir, `${job.piece_id}.json`), `${JSON.stringify(job, null, 2)}\n`, 'utf8')
}

const index = {
  updated_at: new Date().toISOString(),
  note: `synced from detect-output (${jobs.length} pieces)`,
  jobs: jobs.map((j) => ({
    piece_id: j.piece_id,
    batch: j.batch_id,
    faces: j.faces.length,
    defects: j.faces.reduce((n, f) => n + f.defects.length, 0),
    model_version: j.model_version,
    ts: j.detected_at,
    review_status: j.review_status,
  })),
}
writeFileSync(join(outDir, 'jobs-index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8')
console.log(`[sync-results] wrote ${jobs.length} jobs → public/data/detect`)

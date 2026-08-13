import { classNameZh, classSeverity } from './catalog'
import type { JobDetail } from './types'

const CSV_HEADER = [
  'job_id',
  'sample_id',
  'batch_id',
  'face',
  'class_slug',
  'class_zh',
  'severity',
  'x',
  'y',
  'w',
  'h',
  'confidence',
  'model_version',
  'inference_time',
  'review_status',
  'reviewer',
  'review_note',
] as const

function cell(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function jobsToCsv(
  jobs: JobDetail[],
  extras?: Record<string, { reviewer?: string; note?: string }>,
): string {
  const rows: string[] = [CSV_HEADER.join(',')]
  for (const job of jobs) {
    for (const face of job.faces) {
      if (face.defects.length === 0) {
        rows.push(
          [
            `${job.piece_id}__${face.face}`,
            job.piece_id,
            job.batch_id,
            face.face,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            job.model_version,
            job.detected_at,
            job.review_status || '未复核',
            '',
            '',
          ].map(cell).join(','),
        )
        continue
      }
      for (const d of face.defects) {
        const key = `${job.piece_id}:${d.defect_id}`
        const extra = extras?.[key]
        const [x, y, w, h] = d.bbox
        rows.push(
          [
            `${job.piece_id}__${face.face}`,
            job.piece_id,
            job.batch_id,
            face.face,
            d.slug,
            classNameZh(d.slug, d.class_name),
            classSeverity(d.slug, d.severity ?? d.severity_hint),
            x,
            y,
            w,
            h,
            Number.isFinite(d.confidence) ? d.confidence.toFixed(2) : '',
            job.model_version,
            job.detected_at,
            d.review_status || '未复核',
            extra?.reviewer ?? '',
            extra?.note ?? '',
          ].map(cell).join(','),
        )
      }
    }
  }
  return `\uFEFF${rows.join('\r\n')}\r\n`
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

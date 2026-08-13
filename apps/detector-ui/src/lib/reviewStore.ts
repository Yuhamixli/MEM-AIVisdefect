import type { Defect, JobDetail, ReviewOverride, ReviewStatus } from './types'

const KEY = 'detector-ui.review-overrides.v1'

function readAll(): ReviewOverride[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ReviewOverride[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(items: ReviewOverride[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function listOverrides(): ReviewOverride[] {
  return readAll()
}

export function upsertOverride(item: ReviewOverride) {
  const next = readAll().filter(
    (x) => !(x.piece_id === item.piece_id && x.defect_id === item.defect_id),
  )
  next.push(item)
  writeAll(next)
}

export function clearOverride(pieceId: string, defectId: string) {
  writeAll(readAll().filter((x) => !(x.piece_id === pieceId && x.defect_id === defectId)))
}

function applyAction(d: Defect, ov: ReviewOverride): Defect {
  const status: ReviewStatus =
    ov.action === 'confirm' ? 'confirmed' : ov.action === 'reject' ? 'rejected' : 'relabelled'
  return {
    ...d,
    review_status: status,
    slug: ov.action === 'relabel' && ov.new_slug ? ov.new_slug : d.slug,
  }
}

export function mergeJob(job: JobDetail): JobDetail {
  const ovs = readAll().filter((x) => x.piece_id === job.piece_id)
  if (ovs.length === 0) return job
  const faces = job.faces.map((face) => ({
    ...face,
    defects: face.defects.map((d) => {
      const ov = ovs.find((x) => x.defect_id === d.defect_id)
      return ov ? applyAction(d, ov) : d
    }),
  }))
  return { ...job, faces, review_status: aggregateReview(faces.flatMap((f) => f.defects)) }
}

export function aggregateReview(defects: Defect[]): ReviewStatus {
  if (defects.length === 0) return 'pending'
  if (defects.some((d) => d.review_status === 'rejected')) return 'rejected'
  if (defects.some((d) => d.review_status === 'relabelled')) return 'relabelled'
  if (defects.every((d) => d.review_status === 'confirmed')) return 'confirmed'
  return 'pending'
}

export function overrideMap(): Record<string, { reviewer?: string; note?: string }> {
  const map: Record<string, { reviewer?: string; note?: string }> = {}
  for (const ov of readAll()) {
    map[`${ov.piece_id}:${ov.defect_id}`] = { reviewer: ov.reviewer, note: ov.note }
  }
  return map
}

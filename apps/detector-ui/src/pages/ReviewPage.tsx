import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { classNameZh, REVIEW_LABEL } from '../lib/catalog'
import { mergeJob } from '../lib/reviewStore'
import type { JobDetail, JobsIndex, UiConfig } from '../lib/types'

interface QueueItem {
  piece_id: string
  defect_id: string
  slug: string
  class_name?: string
  confidence: number
  review_status: string
  batch_id: string
}

export function ReviewPage({ config }: { config: UiConfig }) {
  const [items, setItems] = useState<QueueItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hideDone, setHideDone] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const idxRes = await fetch('/data/detect/jobs-index.json')
      if (!idxRes.ok) throw new Error(`HTTP ${idxRes.status}`)
      const idx = (await idxRes.json()) as JobsIndex
      const jobs = await Promise.all(
        idx.jobs.map(async (row) => {
          const r = await fetch(`/data/detect/jobs/${row.piece_id}.json`)
          if (!r.ok) return null
          return r.json() as Promise<JobDetail>
        }),
      )
      const queue: QueueItem[] = []
      for (const raw of jobs) {
        if (!raw) continue
        const job = mergeJob(raw)
        for (const face of job.faces) {
          for (const d of face.defects) {
            queue.push({
              piece_id: job.piece_id,
              defect_id: d.defect_id,
              slug: d.slug,
              class_name: d.class_name,
              confidence: d.confidence,
              review_status: d.review_status,
              batch_id: job.batch_id,
            })
          }
        }
      }
      queue.sort((a, b) => {
        const ap = a.review_status === 'pending' ? 0 : 1
        const bp = b.review_status === 'pending' ? 0 : 1
        if (ap !== bp) return ap - bp
        return a.confidence - b.confidence
      })
      if (!cancelled) setItems(queue)
    }
    load().catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e.message : String(e))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const visible = useMemo(
    () => (hideDone ? items.filter((x) => x.review_status === 'pending') : items),
    [items, hideDone],
  )
  const pending = items.filter((x) => x.review_status === 'pending').length

  if (error) return <p className="err">加载失败：{error}</p>

  return (
    <section className="panel">
      <div className="toolbar">
        <p className="muted" style={{ margin: 0 }}>
          待复核 {pending} · 低置信（&lt; {config.confidence_review_threshold}）置顶
        </p>
        <label>
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
          折叠已复核
        </label>
      </div>
      {visible.length === 0 ? (
        <p className="empty">无数据</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>样件</th>
              <th>缺陷</th>
              <th>类别</th>
              <th>置信度</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((x) => (
              <tr key={`${x.piece_id}-${x.defect_id}`}>
                <td>
                  <Link to={`/jobs/${x.piece_id}`}>{x.piece_id}</Link>
                  <div className="muted">{x.batch_id}</div>
                </td>
                <td className="mono">{x.defect_id}</td>
                <td>{classNameZh(x.slug, x.class_name)}</td>
                <td className={x.confidence < config.confidence_review_threshold ? 'conf-low' : ''}>
                  {Number.isFinite(x.confidence) ? x.confidence.toFixed(2) : '—'}
                  {x.confidence < config.confidence_review_threshold ? ' ⚠' : ''}
                </td>
                <td>
                  <span className={`badge badge-${x.review_status}`}>
                    {REVIEW_LABEL[x.review_status] ?? x.review_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

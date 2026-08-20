import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { REVIEW_LABEL } from '../lib/catalog'
import { publicUrl } from '../lib/paths'
import { mergeJob } from '../lib/reviewStore'
import type { JobRow, JobsIndex, UiConfig } from '../lib/types'

export function JobsPage({ config }: { config: UiConfig }) {
  const [doc, setDoc] = useState<JobsIndex | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    fetch(publicUrl('/data/detect/jobs-index.json'))
      .then((r) => {
        if (!r.ok) throw new Error(`数据未同步（HTTP ${r.status}），请跑 npm run sync-results`)
        return r.json() as Promise<JobsIndex>
      })
      .then(setDoc)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [tick])

  const rows = useMemo(() => {
    const list = doc?.jobs ?? []
    return list.filter((j) => {
      const hitQ =
        !q ||
        j.piece_id.toLowerCase().includes(q.toLowerCase()) ||
        j.batch.toLowerCase().includes(q.toLowerCase())
      const hitS = status === 'all' || j.review_status === status
      return hitQ && hitS
    })
  }, [doc, q, status])

  if (error) return <p className="err">加载失败：{error}</p>
  if (!doc) return <p className="muted">加载任务索引…</p>

  return (
    <section className="panel">
      <div className="toolbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="检索样件号 / 批次"
          aria-label="检索"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="复核状态">
          <option value="all">全部复核状态</option>
          <option value="pending">待复核</option>
          <option value="confirmed">确认</option>
          <option value="rejected">驳回</option>
          <option value="relabelled">改判</option>
        </select>
        <button type="button" className="btn-ghost" onClick={() => setTick((n) => n + 1)}>
          刷新
        </button>
      </div>
      {doc.note ? <p className="muted">{doc.note}</p> : null}
      {doc.jobs.length === 0 ? (
        <p className="empty">无数据</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>样件</th>
              <th>批次</th>
              <th>面数</th>
              <th>缺陷数</th>
              <th>低置信</th>
              <th>模型</th>
              <th>复核</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((j) => (
              <JobIndexRow key={j.piece_id} row={j} threshold={config.confidence_review_threshold} />
            ))}
          </tbody>
        </table>
      )}
      {doc.jobs.length > 0 && rows.length === 0 ? (
        <p className="empty">
          无数据
          <button type="button" className="btn-ghost" onClick={() => { setQ(''); setStatus('all') }}>
            清除筛选
          </button>
        </p>
      ) : null}
    </section>
  )
}

function JobIndexRow({ row, threshold }: { row: JobRow; threshold: number }) {
  const [merged, setMerged] = useState(row)

  useEffect(() => {
    fetch(publicUrl(`/data/detect/jobs/${row.piece_id}.json`))
      .then((r) => (r.ok ? r.json() : null))
      .then((job) => {
        if (!job) return
        const m = mergeJob(job)
        const confs = m.faces.flatMap((f) => f.defects.map((d) => d.confidence))
        setMerged({
          ...row,
          defects: m.faces.reduce((n, f) => n + f.defects.length, 0),
          review_status: m.review_status,
          has_low_conf: confs.some((c) => Number.isFinite(c) && c < threshold),
        })
      })
      .catch(() => undefined)
  }, [row, threshold])

  return (
    <tr>
      <td>
        <Link to={`/jobs/${row.piece_id}`}>{row.piece_id}</Link>
      </td>
      <td>{row.batch}</td>
      <td>{row.faces}</td>
      <td>{merged.defects}</td>
      <td>{merged.has_low_conf ? <span className="warn-mark">⚠</span> : '—'}</td>
      <td className="mono">{row.model_version || '—'}</td>
      <td>
        <span className={`badge badge-${merged.review_status}`}>
          {REVIEW_LABEL[merged.review_status] ?? merged.review_status}
        </span>
      </td>
      <td className="mono">{row.ts}</td>
    </tr>
  )
}

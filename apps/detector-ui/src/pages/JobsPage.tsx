import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

interface JobRow {
  piece_id: string
  batch: string
  faces: number
  defects: number
  model_version: string
  ts: string
  review_status: string
}

interface JobsIndex {
  updated_at?: string
  note?: string
  jobs: JobRow[]
}

export function JobsPage() {
  const [doc, setDoc] = useState<JobsIndex | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')

  useEffect(() => {
    fetch('/data/detect/jobs-index.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<JobsIndex>
      })
      .then(setDoc)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

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
          <option value="pending">pending</option>
          <option value="confirmed">confirmed</option>
          <option value="rejected">rejected</option>
          <option value="relabelled">relabelled</option>
        </select>
      </div>
      {doc.note ? <p className="muted">{doc.note}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>样件</th>
            <th>批次</th>
            <th>缺陷数</th>
            <th>模型</th>
            <th>复核</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((j) => (
            <tr key={j.piece_id}>
              <td>
                <Link to={`/jobs/${j.piece_id}`}>{j.piece_id}</Link>
              </td>
              <td>{j.batch}</td>
              <td>{j.defects}</td>
              <td className="mono">{j.model_version}</td>
              <td>
                <span className={`badge badge-${j.review_status}`}>{j.review_status}</span>
              </td>
              <td className="mono">{j.ts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="muted">无匹配任务</p> : null}
    </section>
  )
}

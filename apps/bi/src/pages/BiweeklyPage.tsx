import { useEffect, useState } from 'react'
import { publicUrl } from '../data/load'

interface BiweeklyReport {
  id: string
  title: string
  period: string
  status: string
  due: string
  draft_owner: string
  feishu_hint?: string
  summary: string
}

interface BiweeklyDoc {
  updated_at: string
  deadline_note: string
  division_note: string
  reports: BiweeklyReport[]
}

export function BiweeklyPage() {
  const [doc, setDoc] = useState<BiweeklyDoc | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(publicUrl('/data/biweekly.json'))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<BiweeklyDoc>
      })
      .then((d) => {
        if (!cancelled) setDoc(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <section className="card">
        <h2>双周报</h2>
        <p className="muted">加载失败：{error}</p>
      </section>
    )
  }

  if (!doc) {
    return (
      <section className="card">
        <p className="muted">正在加载双周报…</p>
      </section>
    )
  }

  return (
    <>
      <section className="card" style={{ marginBottom: 14 }}>
        <div className="section-head">
          <h2>双周报归档</h2>
          <span className="pill">数据截至 {doc.updated_at}</span>
        </div>
        <p className="muted" style={{ margin: '8px 0 0' }}>
          {doc.deadline_note}
        </p>
        <p className="muted" style={{ margin: '6px 0 0' }}>
          {doc.division_note}
        </p>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>本期与归档</h3>
        {doc.reports.length === 0 ? (
          <p className="muted">无数据</p>
        ) : (
          <ul className="bw-list">
            {doc.reports.map((r) => (
              <li key={r.id} className="bw-item">
                <div>
                  <p className="bw-title">
                    {r.title}{' '}
                    <span className={`status-badge status-${r.status}`}>{r.status}</span>
                  </p>
                  <p className="muted">
                    区间 {r.period} · 截止 {r.due} · 起草 {r.draft_owner}
                  </p>
                  <p className="muted">{r.summary}</p>
                  {r.feishu_hint ? <p className="muted">归档：{r.feishu_hint}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

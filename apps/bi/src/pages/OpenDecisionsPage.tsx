import { useEffect, useMemo, useState } from 'react'
import { publicUrl } from '../data/load'

type DecisionStatus = 'open' | 'discussing' | 'closed' | 'deferred'

interface Decision {
  id: string
  topic: string
  status: DecisionStatus | string
  owner: string
  due: string
  summary: string
}

interface OpenDecisionsDoc {
  updated_at: string
  last_reviewed_at?: string
  synced_note?: string
  decisions: Decision[]
}

const COLUMNS: { key: DecisionStatus; label: string }[] = [
  { key: 'open', label: 'open 待沟通' },
  { key: 'discussing', label: 'discussing 讨论中' },
  { key: 'closed', label: 'closed 已决议' },
  { key: 'deferred', label: 'deferred 延期' },
]

const TODAY = '2026-08-13'

function isOverdue(d: Decision) {
  if (d.status === 'closed' || d.status === 'deferred') return false
  return Boolean(d.due) && d.due < TODAY
}

export function OpenDecisionsPage() {
  const [doc, setDoc] = useState<OpenDecisionsDoc | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(publicUrl('/data/open-decisions.json'))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<OpenDecisionsDoc>
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

  const byStatus = useMemo(() => {
    const map: Record<string, Decision[]> = {
      open: [],
      discussing: [],
      closed: [],
      deferred: [],
    }
    for (const d of doc?.decisions ?? []) {
      const key = map[d.status] ? d.status : 'open'
      map[key].push(d)
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || a.due.localeCompare(b.due))
    }
    return map
  }, [doc])

  const counts = useMemo(() => {
    const all = doc?.decisions ?? []
    return {
      total: all.length,
      open: all.filter((d) => d.status === 'open' || d.status === 'discussing').length,
      closed: all.filter((d) => d.status === 'closed').length,
      overdue: all.filter(isOverdue).length,
    }
  }, [doc])

  if (error) {
    return (
      <section className="card">
        <h2>未决事项</h2>
        <p className="muted">加载失败：{error}。请在 apps/bi 运行 npm run sync-data。</p>
      </section>
    )
  }

  if (!doc) {
    return (
      <section className="card">
        <p className="muted">正在加载未决事项…</p>
      </section>
    )
  }

  return (
    <>
      <section className="card" style={{ marginBottom: 14 }}>
        <div className="section-head">
          <h2>未决事项泳道 · OD-COM</h2>
          <span className="pill">台账 {doc.updated_at}</span>
        </div>
        <p className="muted" style={{ margin: '8px 0 0' }}>
          {doc.last_reviewed_at ? `最近复核 ${doc.last_reviewed_at}。` : ''}
          Owner 默认范汝杰催办关单。状态只读；改状态请改 `.project-spec/open-decisions.json` 后 sync-data。
          {doc.synced_note ? ` ${doc.synced_note}` : ''}
        </p>
      </section>

      <section className="od-kpis">
        <article className="card kpi">
          <div className="label">台账条目</div>
          <div className="value">{counts.total}</div>
          <div className="hint">OD-COM-01～16</div>
        </article>
        <article className="card kpi">
          <div className="label">仍开放</div>
          <div className="value health-warn">{counts.open}</div>
          <div className="hint">open + discussing</div>
        </article>
        <article className="card kpi">
          <div className="label">已决议</div>
          <div className="value">{counts.closed}</div>
          <div className="hint">closed · 未伪造关单</div>
        </article>
        <article className="card kpi">
          <div className="label">逾期未关</div>
          <div className={`value${counts.overdue ? ' health-bad' : ''}`}>{counts.overdue}</div>
          <div className="hint">目标日早于 {TODAY}</div>
        </article>
      </section>

      <div className="od-board">
        {COLUMNS.map((col) => (
          <section key={col.key} className="od-column card">
            <header className="od-column-head">
              <h3>{col.label}</h3>
              <span className="pill">{byStatus[col.key]?.length ?? 0}</span>
            </header>
            <ul className="od-list">
              {(byStatus[col.key] ?? []).map((d) => (
                <li key={d.id} className={`od-card${isOverdue(d) ? ' overdue' : ''}`}>
                  <p className="od-id">
                    {d.id}
                    {isOverdue(d) ? <span className="pill overdue-pill">逾期</span> : null}
                  </p>
                  <p className="od-topic">{d.topic}</p>
                  <p className="muted od-summary">{d.summary}</p>
                  <div className="od-meta">
                    <span>@{d.owner}</span>
                    <span>目标 {d.due}</span>
                  </div>
                </li>
              ))}
            </ul>
            {(byStatus[col.key] ?? []).length === 0 ? (
              <p className="muted" style={{ padding: '0 4px 8px' }}>
                空
              </p>
            ) : null}
          </section>
        ))}
      </div>
    </>
  )
}
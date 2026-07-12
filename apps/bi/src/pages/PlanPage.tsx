import { Link } from 'react-router-dom'
import type { BiSnapshot } from '../data/types'
import { OPS_MODULES } from '../data/types'

function statusLabel(status: string) {
  const map: Record<string, string> = {
    in_progress: '进行中',
    pending: '未开始',
    done: '完成',
    blocked: '阻塞',
  }
  return map[status] ?? status
}

export function PlanPage({ data }: { data: BiSnapshot }) {
  const primary = data.charter.objectives?.primary ?? []
  const deliverables = data.charter.objectives?.deliverables ?? []
  const defects = data.charter.background?.defect_types ?? []
  const current = data.milestones.current_milestone

  return (
    <>
      <section className="scope-banner card" style={{ marginBottom: 14 }}>
        <div>
          <p className="eyebrow">运营 / 计划 · 申报书主口径</p>
          <h2 className="scope-title">五节点与模块进度</h2>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            文档源：
            <Link to="/knowledge/operation-plan" className="text-link">
              运营计划
            </Link>
            {' · '}
            <Link to="/knowledge/todo" className="text-link">
              模块化 TODO
            </Link>
            {' · '}
            <Link to="/knowledge/open-decisions" className="text-link">
              待沟通清单
            </Link>
            。模块状态暂为占位，待 TODO 勾选后同步。
          </p>
          {data.charter.evaluation_principles?.summary ? (
            <p className="will-inline muted" style={{ margin: '10px 0 0', fontSize: '0.85rem' }}>
              选型对照：{data.charter.evaluation_principles.summary}
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid-kpi" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        {primary.map((m) => (
          <article key={m.metric} className="card kpi">
            <div className="label">{m.name ?? m.metric}</div>
            <div className="value muted">
              {m.unit === 'ratio'
                ? `≥${Math.round(m.target * 100)}%`
                : m.unit === 'pieces'
                  ? `${m.target} 件`
                  : `≥${m.target}`}
            </div>
            <div className="hint">考核硬指标 · 待测</div>
          </article>
        ))}
      </section>

      <section className="panel-grid" style={{ marginBottom: 14 }}>
        <article className="card">
          <h2>五节点门禁</h2>
          <div className="milestone-list">
            {data.milestones.milestones.map((m) => (
              <div key={m.id} className={`milestone-row${m.id === current ? ' current' : ''}`}>
                <div className="ms-id">{m.date?.slice(5) ?? m.id}</div>
                <div>
                  <div className="ms-name">{m.name}</div>
                  <div className="ms-meta">{m.criteria}</div>
                </div>
                <span className={`pill ${m.status}`}>{statusLabel(m.status)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>交付物（硬）</h2>
          <ol className="deliverable-list">
            {deliverables.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ol>
          <h2 style={{ marginTop: 20 }}>七类缺陷</h2>
          <div className="defect-chips">
            {defects.map((d) => (
              <span key={d.id} className="defect-chip">
                {d.id} {d.name}
              </span>
            ))}
          </div>
          <p className="muted" style={{ marginBottom: 0, marginTop: 12, fontSize: '0.85rem' }}>
            {data.charter.background?.priority_defect_strategy ??
              '先三类达标，再扩展七类'}
          </p>
          <p className="muted" style={{ marginTop: 8, fontSize: '0.8rem' }}>
            <span className="pill stretch-pill">非考核</span>{' '}
            {data.milestones.internal_stretch_note ??
              'DR≥95%、FPR≤5% 等为内部冲刺，不作为结题硬门禁'}
          </p>
        </article>
      </section>

      <article className="card">
        <div className="section-head">
          <h2 style={{ margin: 0 }}>模块进度看板</h2>
          <Link to="/knowledge/todo" className="text-link">
            打开 TODO →
          </Link>
        </div>
        <div className="module-board">
          {OPS_MODULES.map((mod) => (
            <div key={mod.id} className="module-card">
              <div className="module-card-top">
                <span className="module-name">{mod.name}</span>
                <span className="pill pending">未开始</span>
              </div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                {mod.owners}
              </div>
            </div>
          ))}
        </div>
      </article>
    </>
  )
}

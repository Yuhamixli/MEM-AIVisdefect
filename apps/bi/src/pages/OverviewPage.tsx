import { Link } from 'react-router-dom'
import type { BiSnapshot } from '../data/types'
import { OPS_MODULES } from '../data/types'
import { budgetExecutionRate, openRiskCounts } from '../data/load'

function healthTone(snapshot: BiSnapshot): { label: string; className: string } {
  const risks = openRiskCounts(snapshot.risks)
  const m = snapshot.milestones.milestones.find((x) => x.id === snapshot.milestones.current_milestone)
  if (risks.critical > 0) return { label: '需关注', className: 'health-bad' }
  if (m?.status === 'in_progress') return { label: '推进中', className: 'health-warn' }
  return { label: '平稳', className: 'health-ok' }
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    in_progress: '进行中',
    pending: '未开始',
    done: '完成',
    blocked: '阻塞',
  }
  return map[status] ?? status
}

function formatTarget(metric: { target: number; unit: string; direction?: string; name?: string }) {
  if (metric.unit === 'ratio') {
    const pct = `${Math.round(metric.target * 100)}%`
    return metric.direction === 'lower_is_better' ? `≤${pct}` : `≥${pct}`
  }
  if (metric.unit === 'count') return `≥${metric.target}`
  if (metric.unit === 'pieces') return `${metric.target} 件`
  return String(metric.target)
}

function stretchLabel(metric: string) {
  const map: Record<string, string> = {
    detection_rate: '检出率 DR',
    false_positive_rate: '误报率 FPR',
    classification_accuracy_stretch: '分类准确率',
  }
  return map[metric] ?? metric
}

export function OverviewPage({ data }: { data: BiSnapshot }) {
  const health = healthTone(data)
  const rate = budgetExecutionRate(data.budget)
  const risks = openRiskCounts(data.risks)
  const openCriticalHigh = data.risks.risks
    .filter((r) => r.status === 'open' && (r.level === 'critical' || r.level === 'high'))
    .slice(0, 5)

  const currentMs =
    data.milestones.milestones.find((x) => x.id === data.milestones.current_milestone) ?? null
  const defects = data.charter.background?.defect_types ?? []
  const primary = data.charter.objectives?.primary ?? []
  const stretch = data.charter.objectives?.internal_stretch
  const product = data.charter.background?.product ?? '新能源汽车电芯压条'
  const will = data.charter.evaluation_principles

  return (
    <>
      <section className="scope-banner card">
        <div>
          <p className="eyebrow">申报书口径 · {data.milestones.acceptance_source ?? '申报书'}</p>
          <h2 className="scope-title">{data.charter.project_name}</h2>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            对象：{product} · 复合材料拉挤 · 七类缺陷 · 离线模块交付
          </p>
        </div>
        <div className="defect-chips" aria-label="七类缺陷">
          {defects.map((d) => (
            <span key={d.id} className="defect-chip">
              {d.name}
            </span>
          ))}
        </div>
      </section>

      {will?.summary ? (
        <section className="card will-banner" style={{ marginBottom: 14 }}>
          <div className="section-head" style={{ marginBottom: 8 }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>
                管理意志 · {will.source ?? '指导老师'}
              </p>
              <h2 className="will-title">目的 &gt; 手段复杂度</h2>
            </div>
            <span className="pill will-pill">准确度 · 效率 · 成本</span>
          </div>
          <p style={{ margin: '0 0 10px' }}>{will.summary}</p>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            {will.operational_checks?.[0] ??
              '选型与汇报前先问：提升了准确度/效率/成本中的哪一项？证据是什么？'}
          </p>
          <ul className="will-links">
            <li>
              <Link to="/knowledge/evaluation-principles">评价原则一页纸</Link>
            </li>
            <li>
              <Link to="/knowledge/open-decisions">待沟通清单 OD-1～6</Link>
            </li>
            <li>
              <Link to="/knowledge/meeting-zhang-20260711">张老师首次沟通纪要</Link>
            </li>
            <li>
              <Link to="/knowledge/reporting-readme">会议/周报/阶段报告机制</Link>
            </li>
          </ul>
        </section>
      ) : null}

      <section className="grid-kpi">
        <article className="card kpi" style={{ animationDelay: '0.05s' }}>
          <div className="label">项目健康</div>
          <div className={`value ${health.className}`}>{health.label}</div>
          <div className="hint">{data.charter.pmbok_process_group}</div>
        </article>
        <article className="card kpi" style={{ animationDelay: '0.1s' }}>
          <div className="label">当前里程碑</div>
          <div className="value" style={{ fontSize: '1.25rem' }}>
            {currentMs?.name ?? data.milestones.current_milestone}
          </div>
          <div className="hint">
            {currentMs?.date ? `${currentMs.date} · ` : ''}
            {data.charter.current_phase}
          </div>
        </article>
        <article className="card kpi" style={{ animationDelay: '0.15s' }}>
          <div className="label">预算执行率</div>
          <div className="value">{(rate * 100).toFixed(1)}%</div>
          <div className="hint">
            {Object.values(data.budget.accounts)
              .reduce((s, a) => s + a.spent, 0)
              .toLocaleString()}{' '}
            / {data.budget.total_budget.toLocaleString()} M
          </div>
        </article>
        <article className="card kpi" style={{ animationDelay: '0.2s' }}>
          <div className="label">开放风险</div>
          <div className="value">
            {risks.total}
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              {' '}
              · 严重 {risks.critical} / 高 {risks.high}
            </span>
          </div>
          <div className="hint">团队 {data.charter.team?.size ?? '—'} 人 · 角色未分</div>
        </article>
      </section>

      <section className="card acceptance-kpi" style={{ animationDelay: '0.22s', marginBottom: 14 }}>
        <div className="section-head">
          <h2 style={{ margin: 0 }}>考核 KPI（申报书 · 硬）</h2>
          <span className="pill pending">待测 · 无实验数据</span>
        </div>
        <div className="grid-kpi acceptance-grid" style={{ marginBottom: 0 }}>
          {primary.map((m) => (
            <div key={m.metric} className="kpi">
              <div className="label">{m.name ?? m.metric}</div>
              <div className="value muted">{formatTarget(m)}</div>
              <div className="hint">目标 · 实测 —</div>
            </div>
          ))}
        </div>
        <p className="muted" style={{ margin: '12px 0 0', fontSize: '0.85rem' }}>
          交付：采集方案 + 定义卡/模型/离线模块 + 使用说明。无实验数据前不点亮实测值。
        </p>

        <div className="stretch-block">
          <div className="section-head">
            <h3 className="stretch-title">内部冲刺（非考核）</h3>
            <span className="pill stretch-pill">非考核</span>
          </div>
          <div className="stretch-metrics">
            {(stretch?.metrics ?? []).map((m) => (
              <div key={m.metric} className="stretch-item">
                <span>{stretchLabel(m.metric)}</span>
                <span className="mono">{formatTarget(m)}</span>
              </div>
            ))}
          </div>
          <p className="muted" style={{ margin: '8px 0 0', fontSize: '0.8rem' }}>
            {stretch?.note ??
              data.milestones.internal_stretch_note ??
              '旧 DR≥95% / FPR≤5% 等仅为内部冲刺，不挡结题。'}
          </p>
        </div>
      </section>

      <section className="panel-grid">
        <article className="card" style={{ animationDelay: '0.26s' }}>
          <div className="section-head">
            <h2 style={{ margin: 0 }}>五节点时间线</h2>
            <Link to="/plan" className="text-link">
              运营计划页 →
            </Link>
          </div>
          <div className="gate-rail" aria-hidden="true">
            {data.milestones.milestones.map((m, i) => (
              <div
                key={m.id}
                className={`gate-node${m.id === data.milestones.current_milestone ? ' current' : ''}${m.status === 'done' ? ' done' : ''}`}
              >
                <div className="gate-dot" />
                {i < data.milestones.milestones.length - 1 ? <div className="gate-line" /> : null}
                <div className="gate-label">{m.name.replace(/^项目/, '')}</div>
                <div className="gate-date">{m.date?.slice(5) ?? `W${m.target_week}`}</div>
              </div>
            ))}
          </div>
          <div className="milestone-list" style={{ marginTop: 16 }}>
            {data.milestones.milestones.map((m) => (
              <div
                key={m.id}
                className={`milestone-row${m.id === data.milestones.current_milestone ? ' current' : ''}`}
              >
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <article className="card" style={{ animationDelay: '0.3s' }}>
            <h2>优先风险</h2>
            <div className="risk-list">
              {openCriticalHigh.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  暂无 critical / high 开放风险
                </p>
              ) : (
                openCriticalHigh.map((r) => (
                  <div key={r.id} className={`risk-item ${r.level}`}>
                    <div className="rid">
                      {r.id} · {r.level}
                    </div>
                    <div>{r.description}</div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="card" style={{ animationDelay: '0.34s' }}>
            <div className="section-head">
              <h2 style={{ margin: 0 }}>模块进度（占位）</h2>
              <Link to="/knowledge/todo" className="text-link">
                TODO →
              </Link>
            </div>
            <div className="module-grid">
              {OPS_MODULES.map((mod) => (
                <div key={mod.id} className="module-chip">
                  <span className="module-name">{mod.name}</span>
                  <span className="pill pending">未开始</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card ops-links" style={{ animationDelay: '0.38s' }}>
            <h2>运营入口</h2>
            <ul className="link-list">
              <li>
                <Link to="/plan">运营 / 计划</Link>
                <span className="muted">五节点 + 模块看板</span>
              </li>
              <li>
                <Link to="/knowledge/open-decisions">待沟通 / 待决议</Link>
                <span className="muted">采集·处理·推理·机械·交付·节点</span>
              </li>
              <li>
                <Link to="/knowledge/evaluation-principles">评价原则</Link>
                <span className="muted">目的 &gt; 手段</span>
              </li>
              <li>
                <Link to="/knowledge/operation-plan">运营计划（申报书）</Link>
                <span className="muted">主口径文档</span>
              </li>
              <li>
                <Link to="/knowledge/todo">模块化 TODO</Link>
                <span className="muted">GATE / 模块任务</span>
              </li>
            </ul>
          </article>
        </div>
      </section>
    </>
  )
}

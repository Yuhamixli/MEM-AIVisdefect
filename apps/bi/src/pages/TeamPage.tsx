import { Link } from 'react-router-dom'
import type { BiSnapshot } from '../data/types'

export function TeamPage({ data }: { data: BiSnapshot }) {
  const size = data.charter.team?.size ?? 13
  const assigned = data.charter.team?.roles_assigned ?? false
  const filled = 0
  const rate = size === 0 ? 0 : filled / size
  const catalog = data.workstreams
  const streams = catalog.workstreams ?? []
  const criticalCount = streams.filter((w) => w.critical_path).length
  const knowledgeId = catalog.knowledge_id ?? 'team-workstreams'
  const docPath = catalog.doc_path ?? 'docs/project-management/team-workstreams.md'

  return (
    <>
      <section className="grid-kpi">
        <article className="card kpi">
          <div className="label">编制</div>
          <div className="value">{size}</div>
          <div className="hint">名册见 docs/project-management/team-roster</div>
        </article>
        <article className="card kpi">
          <div className="label">名册完整率</div>
          <div className="value">{(rate * 100).toFixed(0)}%</div>
          <div className="hint">
            {filled} / {size} 已填（CSV/表回收后更新）
          </div>
        </article>
        <article className="card kpi">
          <div className="label">角色分配</div>
          <div className="value">{assigned ? '已分配' : '未分配'}</div>
          <div className="hint">能力表回收后初分角色池</div>
        </article>
        <article className="card kpi">
          <div className="label">指导老师</div>
          <div className="value" style={{ fontSize: '1.25rem' }}>
            {data.charter.academic_context?.advisor ?? '—'}
          </div>
          <div className="hint">{data.charter.academic_context?.program}</div>
        </article>
      </section>

      <article className="card" style={{ marginBottom: 14 }}>
        <div className="workstream-head">
          <div>
            <h2>工作流 / 职能</h2>
            <p className="muted" style={{ margin: '0 0 12px' }}>
              {catalog.notes ??
                '职能建议编制（可兼职）。关键路径缺人会影响里程碑关闭。'}
              {' · '}
              {streams.length} 条 · 关键路径 {criticalCount}
            </p>
          </div>
          <p className="workstream-doc-link muted">
            详解：
            <Link to={`/knowledge/${knowledgeId}`}>知识库 · 团队工作流</Link>
            <span aria-hidden="true"> · </span>
            <span className="mono-path">{docPath}</span>
          </p>
        </div>

        <div className="table-scroll">
          <table className="account-table workstream-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>建议人数</th>
                <th>关键路径</th>
                <th>一句话职责</th>
              </tr>
            </thead>
            <tbody>
              {streams.map((w) => (
                <tr key={w.id} className={w.critical_path ? 'critical-row' : undefined}>
                  <td>
                    <span className="ws-name">{w.name}</span>
                    <span className="ws-id muted">{w.id}</span>
                  </td>
                  <td className="num">{w.suggested_headcount}</td>
                  <td>
                    {w.critical_path ? (
                      <span className="pill critical-path">关键</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{w.responsibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card">
        <h2>角色缺口（占位）</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          待 `team-roster.csv` 与 `team-capability.csv` 回收后，按能力画像做初分。框架见
          docs/project-management/team-capability-profile.md。当前不编造人员数据。
        </p>
        <ul>
          <li>统筹 / PM 支持 · M币 · 需求变更</li>
          <li>结构/工艺（struct-eng）· APQP / 七类映射</li>
          <li>算法检测 · 分割标注 · 质量度量</li>
          <li>数据标注 · 光学硬件 · 离线模块集成</li>
          <li>前端 BI · Agent 运营 · 汇报 / 意见箱（兼）</li>
        </ul>
      </article>
    </>
  )
}

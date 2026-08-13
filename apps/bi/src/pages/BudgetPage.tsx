import type { BiSnapshot } from '../data/types'
import { ACCOUNT_LABELS, budgetExecutionRate } from '../data/load'

export function BudgetPage({ data }: { data: BiSnapshot }) {
  const rate = budgetExecutionRate(data.budget)
  const entries = Object.entries(data.budget.accounts)
  const pc = data.budget.per_capita
  const pending = pc?.status === 'pending_confirmation'

  return (
    <>
      <section className="grid-kpi">
        <article className="card kpi">
          <div className="label">总预算</div>
          <div className="value">{data.budget.total_budget.toLocaleString()} M</div>
          <div className="hint">状态 {data.budget.status} · 更新 {data.budget.updated_at}</div>
        </article>
        <article className="card kpi">
          <div className="label">已执行</div>
          <div className="value">{(rate * 100).toFixed(1)}%</div>
          <div className="hint" style={{ marginTop: 12 }}>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${Math.max(rate * 100, 1.5)}%` }} />
            </div>
          </div>
        </article>
        <article className="card kpi">
          <div className="label">记账阈值</div>
          <div className="value">≥ {data.budget.rules?.ledger_threshold_m ?? 50} M</div>
          <div className="hint">reserve 动用需课题管理者批准</div>
        </article>
        <article className="card kpi">
          <div className="label">货币</div>
          <div className="value">{data.budget.currency}币</div>
          <div className="hint">清华 MEM 导引课同款核算思路</div>
        </article>
      </section>

      <article className="card">
        <h2>五账户明细</h2>
        <table className="account-table">
          <thead>
            <tr>
              <th>账户</th>
              <th>占比</th>
              <th>预算</th>
              <th>已用</th>
              <th>剩余</th>
              <th>执行</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, acc]) => {
              const remain = acc.budget - acc.spent
              const exec = acc.budget === 0 ? 0 : acc.spent / acc.budget
              return (
                <tr key={key}>
                  <td>
                    {ACCOUNT_LABELS[key] ?? key}
                    {acc.requires_pm_approval ? (
                      <span className="muted"> · 需审批</span>
                    ) : null}
                  </td>
                  <td className="num">{(acc.ratio * 100).toFixed(0)}%</td>
                  <td className="num">{acc.budget.toLocaleString()}</td>
                  <td className="num">{acc.spent.toLocaleString()}</td>
                  <td className="num">{remain.toLocaleString()}</td>
                  <td style={{ minWidth: 120 }}>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.max(exec * 100, acc.spent > 0 ? 2 : 0)}%`,
                          background:
                            key === 'reserve'
                              ? 'linear-gradient(90deg, var(--accent-2), #d8894f)'
                              : undefined,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </article>

      <article className="card" style={{ marginTop: 14 }}>
        <div className="section-head">
          <h2 style={{ margin: 0 }}>按人头均分</h2>
          <span className="pill pending">{pending ? '口径待确认' : '已确认'}</span>
        </div>
        {pc ? (
          <>
            <div className="grid-kpi" style={{ marginTop: 12 }}>
              <div className="kpi">
                <div className="label">编制人数</div>
                <div className="value">{pc.headcount}</div>
              </div>
              <div className="kpi">
                <div className="label">人均额度</div>
                <div className="value">{pc.amount.toLocaleString()} M</div>
              </div>
              <div className="kpi">
                <div className="label">尾差入 reserve</div>
                <div className="value">{pc.remainder_to_reserve} M</div>
              </div>
            </div>
            <p className="muted">{pc.note}</p>
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              个人子账户未公开前只显示汇总均值，不点名。课程公式（小组得分 × 完成度 × 难度 × 人数系数）无外部输入，整卡不自动计算。
            </p>
          </>
        ) : (
          <p className="muted">无数据</p>
        )}
      </article>
    </>
  )
}

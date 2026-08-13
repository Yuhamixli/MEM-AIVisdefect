import { useEffect, useMemo, useState } from 'react'
import { Donut, HBar, HeatMatrix, Histogram, ParetoChart, SpatialMap, YieldTrend } from '../charts/DetectCharts'
import { publicUrl } from '../data/load'
import { DETECT_CLASS, summarize, type DetectAnalytics } from '../data/detect'

const REVIEW_ZH: Record<string, string> = {
  pending: '待复核',
  confirmed: '确认',
  rejected: '驳回',
  relabelled: '改判',
}

export function DetectPage() {
  const [doc, setDoc] = useState<DetectAnalytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [batch, setBatch] = useState('all')
  const [classSlug, setClassSlug] = useState<string | null>(null)
  const [review, setReview] = useState('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch(publicUrl('/data/detect-analytics.json'))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<DetectAnalytics>
      })
      .then(setDoc)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const filtered = useMemo(() => {
    if (!doc) return null
    const jobs = doc.jobs.filter((j) => {
      if (batch !== 'all' && j.batch_id !== batch) return false
      if (review !== 'all' && j.review_status !== review) return false
      if (classSlug && !j.classes.includes(classSlug)) return false
      return true
    })
    const ids = new Set(jobs.map((j) => j.piece_id))
    return {
      ...doc,
      jobs,
      defects: doc.defects.filter((d) => ids.has(d.piece_id) && (!classSlug || d.slug === classSlug)),
    }
  }, [doc, batch, classSlug, review])

  const stats = filtered ? summarize(filtered) : null
  const batches = [...new Set(doc?.jobs.map((j) => j.batch_id) ?? [])]
  const tableRows = (filtered?.jobs ?? []).filter(
    (j) =>
      !q ||
      j.piece_id.toLowerCase().includes(q.toLowerCase()) ||
      j.batch_id.toLowerCase().includes(q.toLowerCase()),
  )

  if (error) {
    return (
      <section className="card">
        <h2>检测分析</h2>
        <p className="muted">无数据：{error}。请运行 `npm run gen-detect-mock`。</p>
      </section>
    )
  }
  if (!doc || !stats || !filtered) {
    return (
      <section className="card">
        <p className="muted">正在加载检测快照…</p>
      </section>
    )
  }

  const proto = stats.protocol
  const toggleClass = (slug: string) => setClassSlug((cur) => (cur === slug ? null : slug))

  return (
    <>
      <section className="card detect-hero">
        <div>
          <p className="eyebrow">AOI 分析 · 课题主战场 · mock 演示</p>
          <h2 className="detect-title">检测数据与统计分析</h2>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            {doc.note} 查全率 / 准确率只在 50 件金标准上点亮，本页用运行快照看分布与复核负荷。
          </p>
        </div>
        <div className="detect-filters">
          <select value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="批次">
            <option value="all">全部批次</option>
            {batches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select value={review} onChange={(e) => setReview(e.target.value)} aria-label="复核">
            <option value="all">全部复核</option>
            {Object.entries(REVIEW_ZH).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <a className="text-link" href="http://127.0.0.1:5174">
            打开 detector-ui →
          </a>
        </div>
      </section>

      <section className="protocol-gates">
        <Gate
          label="抽检件数"
          value={`${stats.pieces} / ${proto.pieceTarget}`}
          ok={stats.pieces >= proto.pieceTarget}
          hint="任务书 ≥50 件"
        />
        <Gate
          label="触及类别"
          value={`${proto.classesHit} / ${proto.classTarget}`}
          ok={proto.classesHit >= proto.classTarget}
          hint="考核 ≥3 类 · 定义卡七类"
        />
        <Gate label="查全率 DR" value="待测" pending hint="金标准 50 件盲测后点亮 · 目标 ≥80%" />
        <Gate label="准确率" value="待测" pending hint="金标准 50 件盲测后点亮 · 目标 ≥85%" />
      </section>

      <section className="grid-kpi detect-kpis">
        <Kpi
          label="良率"
          value={`${(stats.yieldRate * 100).toFixed(1)}%`}
          hint={`OK ${stats.ok} · NG ${stats.ng}`}
          tone={stats.yieldRate >= 0.5 ? 'ok' : 'bad'}
        />
        <Kpi label="缺陷实例" value={String(stats.defects)} hint={`低置信 ${stats.lowConf}（<0.5）`} />
        <Kpi label="平均置信度" value={stats.avgConf.toFixed(2)} hint="检测原值，未掺复核" />
        <Kpi label="待复核件" value={String(stats.pending)} hint="件级聚合" />
        <Kpi label="先三类触及" value={String(stats.primaryPieces)} hint="裂纹 / 气泡 / 划伤" />
        <Kpi
          label="件均缺陷"
          value={stats.pieces ? (stats.defects / stats.pieces).toFixed(2) : '0'}
          hint="含 OK 件"
        />
      </section>

      <div className="chip-row" role="group" aria-label="按缺陷类别筛选">
        <button type="button" className={`chip${!classSlug ? ' active' : ''}`} onClick={() => setClassSlug(null)}>
          全部类别
        </button>
        {stats.byClass.map((c) => (
          <button
            key={c.slug}
            type="button"
            className={`chip${classSlug === c.slug ? ' active' : ''}`}
            onClick={() => toggleClass(c.slug)}
          >
            <i style={{ background: c.color }} />
            {c.zh} {c.count}
          </button>
        ))}
      </div>

      <section className="detect-grid">
        <article className="card">
          <div className="section-head">
            <h2>缺陷帕累托</h2>
            <span className="pill">点击柱筛选</span>
          </div>
          <p className="muted chart-cap">按实例数降序；绿线累计占比，虚线 80%。</p>
          <ParetoChart rows={stats.byClass} selected={classSlug} onSelect={toggleClass} />
        </article>
        <article className="card">
          <div className="section-head">
            <h2>逐日产量 / 良率</h2>
            <span className="pill">trend</span>
          </div>
          <p className="muted chart-cap">灰绿柱=当日件数，红柱=NG，折线=良率。</p>
          <YieldTrend days={stats.byDay} />
        </article>
      </section>

      <article className="card" style={{ marginBottom: 14 }}>
        <div className="section-head">
          <h2>空间分布</h2>
          <span className="pill">bbox 中心 · 3200×1920</span>
        </div>
        <p className="muted chart-cap">投影到压条轮廓，看端部 / 中段聚集。点图例或帕累托可只看一类。</p>
        <SpatialMap defects={filtered.defects} size={doc.image_size} selectedSlug={classSlug} />
        <ul className="class-legend">
          {stats.byClass.map((c) => (
            <li key={c.slug}>
              <button type="button" className="legend-btn" onClick={() => toggleClass(c.slug)}>
                <i style={{ background: c.color }} />
                {c.zh} {c.count}
              </button>
            </li>
          ))}
        </ul>
      </article>

      <section className="detect-grid">
        <article className="card">
          <div className="section-head">
            <h2>长度分区</h2>
            <span className="pill">左 / 中 / 右 各 1/3</span>
          </div>
          <p className="muted chart-cap">拉挤件轴向；端部聚集通常对应夹持或入口扰动。</p>
          <HBar
            rows={stats.byZone.map((z, i) => ({
              label: z.zh,
              value: z.count,
              color: i === 1 ? '#0f6b5c' : '#c45c26',
            }))}
          />
        </article>
        <article className="card">
          <div className="section-head">
            <h2>检测面</h2>
            <span className="pill">face</span>
          </div>
          <p className="muted chart-cap">当前 mock 多为顶/底；四方位到位后这里会铺开。</p>
          <HBar rows={stats.byFace.map((f) => ({ label: f.zh, value: f.count }))} />
        </article>
      </section>

      <section className="detect-grid">
        <article className="card">
          <div className="section-head">
            <h2>类别 × 批次</h2>
            <span className="pill">热力</span>
          </div>
          <p className="muted chart-cap">哪一批次把哪一类打出来。深色=实例多。</p>
          <HeatMatrix
            rowLabels={stats.classBatch.map((r) => r.zh)}
            colLabels={stats.byBatch.map((b) => b.batch)}
            cells={stats.classBatch.map((r) => r.cells.map((c) => c.count))}
          />
        </article>
        <article className="card">
          <div className="section-head">
            <h2>件内缺陷个数</h2>
            <span className="pill">负荷</span>
          </div>
          <p className="muted chart-cap">0=OK 件。多缺陷件优先进复核队列。</p>
          <HBar
            rows={stats.byDpp.map((b) => ({
              label: `${b.label} 个`,
              value: b.n,
              color: b.label === '0' ? '#2f6b3a' : '#c45c26',
            }))}
          />
        </article>
      </section>

      <section className="detect-grid detect-grid-3">
        <article className="card">
          <h2>置信度直方图</h2>
          <p className="muted chart-cap">红柱 &lt; 0.5，进复核置顶。</p>
          <Histogram bins={stats.bins} />
        </article>
        <article className="card donut-card">
          <h2>严重度</h2>
          <Donut
            center={String(stats.defects)}
            slices={stats.bySeverity.map((s) => ({
              label: s.zh,
              value: s.count,
              color: s.severity === 'high' ? '#a33b2b' : s.severity === 'medium' ? '#c45c26' : '#6b7a86',
            }))}
          />
          <ul className="mini-legend">
            {stats.bySeverity.map((s) => (
              <li key={s.severity}>
                {s.zh} {s.count}
              </li>
            ))}
          </ul>
        </article>
        <article className="card donut-card">
          <h2>复核漏斗</h2>
          <Donut
            center={String(stats.pieces)}
            slices={[
              { label: 'pending', value: stats.reviews.pending, color: '#b07d12' },
              { label: 'confirmed', value: stats.reviews.confirmed, color: '#2f6b3a' },
              { label: 'rejected', value: stats.reviews.rejected, color: '#a33b2b' },
              { label: 'relabelled', value: stats.reviews.relabelled, color: '#2471A3' },
            ]}
          />
          <ul className="mini-legend">
            {Object.entries(stats.reviews).map(([k, v]) => (
              <li key={k}>
                {REVIEW_ZH[k] ?? k} {v}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="detect-grid">
        <article className="card">
          <div className="section-head">
            <h2>批次对照</h2>
          </div>
          <table className="account-table">
            <thead>
              <tr>
                <th>批次</th>
                <th>件数</th>
                <th>NG</th>
                <th>良率</th>
                <th>缺陷</th>
              </tr>
            </thead>
            <tbody>
              {stats.byBatch.map((b) => (
                <tr key={b.batch}>
                  <td>{b.batch}</td>
                  <td className="num">{b.pieces}</td>
                  <td className="num">{b.ng}</td>
                  <td className="num">{(b.yield * 100).toFixed(1)}%</td>
                  <td className="num">{b.defects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article className="card">
          <div className="section-head">
            <h2>高负荷件</h2>
            <span className="pill">按缺陷数</span>
          </div>
          <table className="account-table">
            <thead>
              <tr>
                <th>样件</th>
                <th>缺陷</th>
                <th>类别</th>
                <th>最高置信</th>
              </tr>
            </thead>
            <tbody>
              {stats.topNg.map((j) => (
                <tr key={j.piece_id}>
                  <td>
                    <a href={`http://127.0.0.1:5174/jobs/${j.piece_id}`}>{j.piece_id}</a>
                  </td>
                  <td className="num">{j.defects}</td>
                  <td>{j.classes.map((s) => DETECT_CLASS[s]?.zh ?? s).join(' / ') || '—'}</td>
                  <td className="num">{j.max_confidence ? j.max_confidence.toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>

      <article className="card" style={{ marginTop: 14 }}>
        <div className="section-head">
          <h2>件号明细</h2>
          <input
            className="detect-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="检索件号 / 批次"
            aria-label="检索"
          />
        </div>
        <div className="table-scroll">
          <table className="account-table detect-table">
            <thead>
              <tr>
                <th>样件</th>
                <th>批次</th>
                <th>缺陷</th>
                <th>类别</th>
                <th>最高置信</th>
                <th>复核</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((j) => (
                <tr key={j.piece_id}>
                  <td>
                    <a href={`http://127.0.0.1:5174/jobs/${j.piece_id}`}>{j.piece_id}</a>
                  </td>
                  <td>{j.batch_id}</td>
                  <td className="num">{j.defects}</td>
                  <td>
                    {j.classes.length === 0
                      ? '—'
                      : j.classes.map((s) => DETECT_CLASS[s]?.zh ?? s).join(' / ')}
                  </td>
                  <td className="num">{j.max_confidence ? j.max_confidence.toFixed(2) : '—'}</td>
                  <td>
                    <span className={`pill ${j.review_status}`}>{REVIEW_ZH[j.review_status] ?? j.review_status}</span>
                  </td>
                  <td className="mono-path">{j.ts.slice(0, 16).replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted chart-cap">
          当前 {tableRows.length} 件
          {classSlug ? ` · 已筛 ${DETECT_CLASS[classSlug]?.zh ?? classSlug}` : ''}
        </p>
      </article>
    </>
  )
}

function Gate({
  label,
  value,
  hint,
  ok,
  pending,
}: {
  label: string
  value: string
  hint: string
  ok?: boolean
  pending?: boolean
}) {
  return (
    <article className={`gate-card${pending ? ' pending' : ok ? ' ok' : ' wait'}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="hint">{hint}</div>
    </article>
  )
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone?: 'ok' | 'bad'
}) {
  return (
    <article className="card kpi">
      <div className="label">{label}</div>
      <div className={`value${tone === 'ok' ? ' health-ok' : tone === 'bad' ? ' health-bad' : ''}`}>{value}</div>
      <div className="hint">{hint}</div>
    </article>
  )
}
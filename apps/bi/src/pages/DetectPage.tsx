import { useEffect, useMemo, useState } from 'react'
import { Donut, HBar, HeatMatrix, Histogram, ParetoChart, SpatialMap, YieldTrend, ConfusionMatrix, CiBars, ReliabilityChart } from '../charts/DetectCharts'
import { publicUrl } from '../data/load'
import { DETECT_CLASS, summarize, type ConfusionKey, type DetectAnalytics } from '../data/detect'
import { detectorUiUrl } from '../lib/urls'

const REVIEW_ZH: Record<string, string> = {
  pending: '待复核',
  confirmed: '确认',
  rejected: '驳回',
  relabelled: '改判',
}

const OUTCOME_ZH: Record<ConfusionKey, string> = {
  tp: 'TP 真检出',
  tn: 'TN 真阴',
  fp: 'FP 过杀',
  fn: 'FN 漏检',
}

function pct(p: number, d = 1) {
  return `${(p * 100).toFixed(d)}%`
}

function ciText(w: { lo: number; hi: number }) {
  return `${(w.lo * 100).toFixed(1)}–${(w.hi * 100).toFixed(1)}%`
}

export function DetectPage() {
  const [doc, setDoc] = useState<DetectAnalytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [batch, setBatch] = useState('all')
  const [classSlug, setClassSlug] = useState<string | null>(null)
  const [review, setReview] = useState('all')
  const [outcome, setOutcome] = useState('all')
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
      if (outcome !== 'all' && j.outcome !== outcome) return false
      if (classSlug && !j.classes.includes(classSlug)) return false
      return true
    })
    const ids = new Set(jobs.map((j) => j.piece_id))
    return {
      ...doc,
      jobs,
      defects: doc.defects.filter((d) => ids.has(d.piece_id) && (!classSlug || d.slug === classSlug)),
    }
  }, [doc, batch, classSlug, review, outcome])

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

  const filters = (
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
      <select value={outcome} onChange={(e) => setOutcome(e.target.value)} aria-label="判定">
        <option value="all">全部判定</option>
        {(Object.keys(OUTCOME_ZH) as ConfusionKey[]).map((k) => (
          <option key={k} value={k}>
            {OUTCOME_ZH[k]}
          </option>
        ))}
      </select>
      <a className="text-link" href={detectorUiUrl('/')}>
        detector-ui →
      </a>
    </div>
  )

  return (
    <div className="detect-page">
      <p className="detect-ppt-hint">
        上两张为 16:9 看板，整卡截图可直接贴进宽屏 PPT。下面件号明细保持可检索表格。
      </p>

      <section className="detect-slide detect-slide-quality" aria-label="质量门禁 16:9">
        <header className="detect-slide-head">
          <div>
            <p className="eyebrow">AOI · mock 盲测 · 1 / 2</p>
            <h2 className="detect-title">检测质量门禁</h2>
          </div>
          {filters}
        </header>

        <div className="detect-metric-strip">
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
            hint="考核 ≥3 类"
          />
          <Gate
            label="查全率 DR"
            value={pct(stats.instance.recall)}
            ok={stats.instance.recall >= proto.internalRecall}
            hint={`CI ${ciText(stats.instance.ci.recall)}`}
          />
          <Gate
            label="准确率"
            value={pct(stats.piece.accuracy)}
            ok={stats.piece.accuracy >= proto.taskbookAccuracy}
            hint={`CI ${ciText(stats.piece.ci.accuracy)}`}
          />
          <Kpi
            label="漏检放行 FAR"
            value={pct(stats.instance.far)}
            hint={`FN ${stats.instance.fn} · ${ciText(stats.instance.ci.far)}`}
            tone={stats.instance.far <= 0.01 ? 'ok' : 'bad'}
          />
          <Kpi
            label="过杀拒收 FRR"
            value={pct(stats.piece.frr)}
            hint={`件级 FP ${stats.piece.fp}`}
          />
          <Kpi
            label="精确率 PPV"
            value={pct(stats.instance.precision)}
            hint={ciText(stats.instance.ci.precision)}
          />
          <Kpi
            label="特异度 TNR"
            value={pct(stats.piece.specificity)}
            hint={ciText(stats.piece.ci.specificity)}
          />
          <Kpi label="F1" value={stats.instance.f1.toFixed(3)} hint="实例级 2PR/(P+R)" />
          <Kpi label="MCC" value={stats.piece.mcc.toFixed(3)} hint="件级 Matthews" />
        </div>

        <div className="detect-slide-mid detect-quality-eval">
          <article className="card">
            <div className="section-head">
              <h2>件级混淆矩阵</h2>
              <span className="pill">gold × pred</span>
            </div>
            <ConfusionMatrix tp={stats.piece.tp} tn={stats.piece.tn} fp={stats.piece.fp} fn={stats.piece.fn} />
          </article>
          <article className="card">
            <div className="section-head">
              <h2>Wilson 95% CI</h2>
              <span className="pill">橙线=门禁</span>
            </div>
            <div className="chart-fill">
              <CiBars
                rows={[
                  {
                    label: '检测率 DR',
                    p: stats.instance.recall,
                    lo: stats.instance.ci.recall.lo,
                    hi: stats.instance.ci.recall.hi,
                    target: proto.internalRecall,
                  },
                  {
                    label: '准确率 Acc',
                    p: stats.piece.accuracy,
                    lo: stats.piece.ci.accuracy.lo,
                    hi: stats.piece.ci.accuracy.hi,
                    target: proto.taskbookAccuracy,
                  },
                  {
                    label: '精确率 PPV',
                    p: stats.instance.precision,
                    lo: stats.instance.ci.precision.lo,
                    hi: stats.instance.ci.precision.hi,
                  },
                  {
                    label: '特异度 TNR',
                    p: stats.piece.specificity,
                    lo: stats.piece.ci.specificity.lo,
                    hi: stats.piece.ci.specificity.hi,
                  },
                ]}
              />
            </div>
          </article>
        </div>

        <div className="detect-slide-mid detect-quality-class">
          <article className="card detect-slide-table">
            <div className="section-head">
              <h2>分类型查全率</h2>
              <span className="pill">点类别下钻</span>
            </div>
            <table className="account-table">
              <thead>
                <tr>
                  <th>类别</th>
                  <th>TP</th>
                  <th>FP</th>
                  <th>FN</th>
                  <th>查全率</th>
                  <th>95% CI</th>
                  <th>精确率</th>
                </tr>
              </thead>
              <tbody>
                {stats.byClassEval.map((c) => (
                  <tr key={c.slug}>
                    <td>
                      <button type="button" className="legend-btn" onClick={() => toggleClass(c.slug)}>
                        <i style={{ background: c.color }} />
                        {c.zh}
                      </button>
                    </td>
                    <td className="num">{c.tp}</td>
                    <td className="num">{c.fp}</td>
                    <td className="num">{c.fn}</td>
                    <td className="num">{pct(c.recall)}</td>
                    <td className="mono-path">{ciText(c.recallCi)}</td>
                    <td className="num">{pct(c.precision)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
          <article className="card">
            <div className="section-head">
              <h2>置信度校准</h2>
              <span className="pill">圆面积∝ n</span>
            </div>
            <ReliabilityChart bins={stats.reliability} />
          </article>
        </div>
      </section>

      <section className="detect-slide detect-slide-ops" aria-label="分布与产线 16:9">
        <header className="detect-slide-head">
          <div>
            <p className="eyebrow">AOI · 空间 / 产线 · 2 / 2</p>
            <h2 className="detect-title">缺陷分布与产线</h2>
          </div>
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
        </header>

        <div className="grid-kpi detect-kpis">
          <Kpi label="产线良率" value={pct(stats.yieldRate)} hint={`OK ${stats.ok} · NG ${stats.ng}`} />
          <Kpi label="缺陷实例" value={String(stats.defects)} hint={`低置信 ${stats.lowConf}`} />
          <Kpi label="平均置信度" value={stats.avgConf.toFixed(2)} hint="未掺复核" />
          <Kpi label="待复核件" value={String(stats.pending)} hint="件级聚合" />
          <Kpi label="Youden J" value={stats.piece.youden.toFixed(3)} hint="TPR+TNR−1" />
          <Kpi label="NPV" value={pct(stats.piece.npv)} hint="OK 中真阴" />
        </div>

        <div className="detect-slide-mid">
          <article className="card">
            <div className="section-head">
              <h2>缺陷帕累托</h2>
              <span className="pill">绿线累计</span>
            </div>
            <div className="chart-fill">
              <ParetoChart rows={stats.byClass} selected={classSlug} onSelect={toggleClass} />
            </div>
          </article>
          <article className="card">
            <div className="section-head">
              <h2>逐日产量 / 良率</h2>
              <span className="pill">红=NG</span>
            </div>
            <div className="chart-fill">
              <YieldTrend days={stats.byDay} />
            </div>
          </article>
        </div>

        <div className="detect-slide-spatial-row">
          <article className="card detect-slide-spatial">
            <div className="section-head">
              <h2>空间分布</h2>
              <span className="pill">bbox 中心 · 虚线圆=FN</span>
            </div>
            <SpatialMap
              defects={filtered.defects}
              misses={stats.fnCases}
              size={doc.image_size}
              selectedSlug={classSlug}
            />
          </article>
          <article className="card donut-card">
            <h2>严重度 / 复核</h2>
            <div className="detect-slide-donuts">
              <Donut
                caption="严重度"
                center={String(stats.defects)}
                slices={stats.bySeverity.map((s) => ({
                  label: s.zh,
                  value: s.count,
                  color: s.severity === 'high' ? '#a33b2b' : s.severity === 'medium' ? '#c45c26' : '#6b7a86',
                }))}
              />
              <Donut
                caption="复核"
                center={String(stats.pieces)}
                slices={[
                  { label: 'pending', value: stats.reviews.pending, color: '#b07d12' },
                  { label: 'confirmed', value: stats.reviews.confirmed, color: '#2f6b3a' },
                  { label: 'rejected', value: stats.reviews.rejected, color: '#a33b2b' },
                  { label: 'relabelled', value: stats.reviews.relabelled, color: '#2471A3' },
                ]}
              />
            </div>
          </article>
        </div>

        <div className="detect-slide-bottom">
          <article className="card">
            <h2>长度分区</h2>
            <HBar
              rows={stats.byZone.map((z, i) => ({
                label: z.zh,
                value: z.count,
                color: i === 1 ? '#0f6b5c' : '#c45c26',
              }))}
            />
          </article>
          <article className="card">
            <h2>检测面</h2>
            <HBar rows={stats.byFace.map((f) => ({ label: f.zh, value: f.count }))} />
          </article>
          <article className="card detect-span-3">
            <h2>类别 × 批次</h2>
            <HeatMatrix
              rowLabels={stats.classBatch.map((r) => r.zh)}
              colLabels={stats.byBatch.map((b) => b.batch.replace(/^B-mock-0?/, 'M').replace(/^B-0?/, 'B'))}
              cells={stats.classBatch.map((r) => r.cells.map((c) => c.count))}
            />
          </article>
          <article className="card">
            <h2>件内缺陷数</h2>
            <HBar
              rows={stats.byDpp.map((b) => ({
                label: `${b.label} 个`,
                value: b.n,
                color: b.label === '0' ? '#2f6b3a' : '#c45c26',
              }))}
            />
          </article>
          <article className="card">
            <h2>置信度</h2>
            <div className="chart-fill">
              <Histogram bins={stats.bins} />
            </div>
          </article>
        </div>
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
                    <a href={detectorUiUrl(`/jobs/${j.piece_id}`)}>{j.piece_id}</a>
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
                <th>判定</th>
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
                    <a href={detectorUiUrl(`/jobs/${j.piece_id}`)}>{j.piece_id}</a>
                  </td>
                  <td>{j.batch_id}</td>
                  <td>
                    <span className={`pill outcome-${j.outcome ?? 'na'}`}>
                      {j.outcome ? OUTCOME_ZH[j.outcome] : '—'}
                    </span>
                  </td>
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
    </div>
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
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicUrl } from '../data/load'
import { summarize, type DetectAnalytics } from '../data/detect'

export function DetectTeaser() {
  const [label, setLabel] = useState('加载 mock 检测集…')

  useEffect(() => {
    fetch(publicUrl('/data/detect-analytics.json'))
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DetectAnalytics | null) => {
        if (!d) {
          setLabel('无数据')
          return
        }
        const s = summarize(d)
        setLabel(
          `${s.pieces} 件 · DR ${((s.instance?.recall ?? 0) * 100).toFixed(1)}% · Acc ${((s.piece?.accuracy ?? 0) * 100).toFixed(1)}%`,
        )
      })
      .catch(() => setLabel('无数据'))
  }, [])

  return (
    <article className="card detect-teaser">
      <div className="section-head">
        <h2 style={{ margin: 0 }}>检测分析</h2>
        <Link to="/detect" className="text-link">
          打开看板 →
        </Link>
      </div>
      <p className="detect-teaser-metric">{label}</p>
      <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
        mock 盲测 · 检测率 ≥99% · 准确率门禁 85% · Wilson 95% CI
      </p>
    </article>
  )
}

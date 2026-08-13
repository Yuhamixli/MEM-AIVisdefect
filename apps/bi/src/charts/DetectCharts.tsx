import { useState } from 'react'
import { DETECT_CLASS } from '../data/detect'
import type { ClassStat, DetectDefectRow } from '../data/detect'

export function ParetoChart({
  rows,
  selected,
  onSelect,
}: {
  rows: ClassStat[]
  selected?: string | null
  onSelect?: (slug: string) => void
}) {
  const W = 560
  const H = 240
  const pl = 42
  const pr = 40
  const pt = 16
  const pb = 36
  const iw = W - pl - pr
  const ih = H - pt - pb
  const max = Math.max(1, ...rows.map((r) => r.count))
  const bw = rows.length ? (iw / rows.length) * 0.62 : 0
  const gap = rows.length ? (iw / rows.length) * 0.38 : 0
  const pts = rows.map((r, i) => {
    const x = pl + i * (bw + gap) + bw / 2
    const y = pt + ih * (1 - r.cumulative)
    return `${x},${y}`
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="缺陷类别帕累托">
      <line x1={pl} y1={pt} x2={pl} y2={pt + ih} stroke="#c9c2b4" />
      <line x1={pl} y1={pt + ih} x2={W - pr} y2={pt + ih} stroke="#c9c2b4" />
      <line
        x1={pl}
        y1={pt + ih * 0.2}
        x2={W - pr}
        y2={pt + ih * 0.2}
        stroke="#0f6b5c"
        strokeDasharray="4 4"
        opacity={0.55}
      />
      <text x={W - pr + 4} y={pt + ih * 0.2 + 4} fontSize="10" fill="#0f6b5c">
        80%
      </text>
      {rows.map((r, i) => {
        const h = (r.count / max) * ih
        const x = pl + i * (bw + gap)
        const y = pt + ih - h
        return (
          <g key={r.slug}>
            <rect
              x={x}
              y={y}
              width={bw}
              height={h}
              fill={r.color}
              rx="3"
              opacity={selected && selected !== r.slug ? 0.35 : 1}
              style={{ cursor: onSelect ? 'pointer' : undefined }}
              onClick={() => onSelect?.(r.slug)}
            />
            <text x={x + bw / 2} y={H - 14} textAnchor="middle" fontSize="11" fill="#3d4f5c">
              {r.zh}
            </text>
            <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="#14212b">
              {r.count}
            </text>
          </g>
        )
      })}
      {pts.length > 1 ? (
        <polyline
          points={pts.join(' ')}
          fill="none"
          stroke="#0f6b5c"
          strokeWidth="2"
        />
      ) : null}
      {rows.map((r, i) => {
        const x = pl + i * (bw + gap) + bw / 2
        const y = pt + ih * (1 - r.cumulative)
        return <circle key={`p-${r.slug}`} cx={x} cy={y} r="3.2" fill="#0f6b5c" />
      })}
    </svg>
  )
}

export function YieldTrend({
  days,
}: {
  days: { date: string; pieces: number; ng: number; yield: number }[]
}) {
  const W = 560
  const H = 240
  const pl = 36
  const pr = 12
  const pt = 16
  const pb = 32
  const iw = W - pl - pr
  const ih = H - pt - pb
  if (days.length === 0) return null
  const maxP = Math.max(1, ...days.map((d) => d.pieces))
  const barW = (iw / days.length) * 0.7
  const yieldPts = days.map((d, i) => {
    const x = pl + ((i + 0.5) / days.length) * iw
    const y = pt + ih * (1 - d.yield)
    return `${x},${y}`
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="逐日件数与良率">
      {days.map((d, i) => {
        const h = (d.pieces / maxP) * ih
        const x = pl + (i / days.length) * iw + ((iw / days.length) - barW) / 2
        return (
          <g key={d.date}>
            <rect x={x} y={pt + ih - h} width={barW} height={h} fill="rgba(15,107,92,0.18)" rx="2" />
            <rect
              x={x}
              y={pt + ih - (d.ng / maxP) * ih}
              width={barW}
              height={(d.ng / maxP) * ih}
              fill="rgba(163,59,43,0.55)"
              rx="2"
            />
          </g>
        )
      })}
      <polyline points={yieldPts.join(' ')} fill="none" stroke="#0f6b5c" strokeWidth="2" />
      {days.filter((_, i) => i === 0 || i === days.length - 1 || i % 4 === 0).map((d, idx) => {
        const i = days.indexOf(d)
        const x = pl + ((i + 0.5) / days.length) * iw
        return (
          <text key={d.date + idx} x={x} y={H - 10} textAnchor="middle" fontSize="10" fill="#6b7a86">
            {d.date.slice(5)}
          </text>
        )
      })}
      <text x={pl} y={12} fontSize="10" fill="#6b7a86">
        柱=件数（红=NG）· 线=良率
      </text>
    </svg>
  )
}

export function Histogram({ bins }: { bins: { lo: number; hi: number; n: number }[] }) {
  const W = 400
  const H = 180
  const pl = 28
  const pb = 24
  const pt = 10
  const pr = 8
  const iw = W - pl - pr
  const ih = H - pt - pb
  const max = Math.max(1, ...bins.map((b) => b.n))
  const bw = iw / bins.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="置信度分布">
      {bins.map((b, i) => {
        const h = (b.n / max) * ih
        const x = pl + i * bw
        const warn = b.hi <= 0.5
        return (
          <g key={b.lo}>
            <rect
              x={x + 2}
              y={pt + ih - h}
              width={bw - 4}
              height={h}
              fill={warn ? '#a33b2b' : '#0f6b5c'}
              opacity={warn ? 0.75 : 0.7}
              rx="2"
            />
            {i % 2 === 0 ? (
              <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#6b7a86">
                {b.lo.toFixed(1)}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

export function Donut({
  slices,
  center,
}: {
  slices: { label: string; value: number; color: string }[]
  center: string
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1
  let acc = 0
  const r = 42
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 160 160" className="chart-svg donut-svg" role="img" aria-label={center}>
      <circle cx="80" cy="80" r={r} fill="none" stroke="#e7e2d6" strokeWidth="16" />
      {slices.map((s) => {
        const frac = s.value / total
        const dash = frac * c
        const offset = acc * c
        acc += frac
        return (
          <circle
            key={s.label}
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="16"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 80 80)"
          />
        )
      })}
      <text x="80" y="84" textAnchor="middle" fontSize="20" fontFamily="Newsreader, Georgia, serif" fill="#14212b">
        {center}
      </text>
    </svg>
  )
}

export function SpatialMap({
  defects,
  size,
  selectedSlug,
}: {
  defects: DetectDefectRow[]
  size: [number, number]
  selectedSlug?: string | null
}) {
  const [hover, setHover] = useState<DetectDefectRow | null>(null)
  const [iw, ih] = size
  return (
    <div className="spatial-wrap">
      <svg viewBox={`0 0 ${iw} ${ih}`} className="spatial-svg" role="img" aria-label="缺陷空间分布">
        <rect width={iw} height={ih} fill="#161d26" />
        <rect x="200" y="700" width="2800" height="520" rx="28" fill="#c8b89a" opacity="0.88" />
        <text x="1600" y="640" textAnchor="middle" fill="#8b9aab" fontSize="48">
          拉挤件 · 检测面投影（原点左上，像素）
        </text>
        {defects.map((d, i) => {
          const color = DETECT_CLASS[d.slug ?? '']?.color ?? '#94a3b8'
          return (
            <circle
              key={`${d.piece_id}-${d.defect_id}-${i}`}
              cx={d.cx ?? 0}
              cy={d.cy ?? 0}
              r={18 + (d.confidence ?? 0.5) * 16}
              fill={color}
              fillOpacity={selectedSlug && selectedSlug !== d.slug ? 0.18 : 0.78}
              stroke="#fff"
              strokeWidth="3"
              onMouseEnter={() => setHover(d)}
              onMouseLeave={() => setHover(null)}
            />
          )
        })}
      </svg>
      {hover ? (
        <div className="spatial-tip">
          {hover.piece_id} · {hover.class_name} · {(hover.confidence ?? 0).toFixed(2)}
        </div>
      ) : (
        <div className="spatial-tip muted">悬停圆点查看件号 · 半径∝置信度</div>
      )}
    </div>
  )
}

export function HBar({
  rows,
}: {
  rows: { label: string; value: number; color?: string }[]
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="hbar-list">
      {rows.map((r) => (
        <li key={r.label} className="hbar-row">
          <span className="hbar-label">{r.label}</span>
          <span className="hbar-track">
            <i style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? '#0f6b5c' }} />
          </span>
          <span className="hbar-n">{r.value}</span>
        </li>
      ))}
    </ul>
  )
}

export function HeatMatrix({
  rowLabels,
  colLabels,
  cells,
}: {
  rowLabels: string[]
  colLabels: string[]
  cells: number[][]
}) {
  const max = Math.max(1, ...cells.flat())
  return (
    <div className="heat-wrap">
      <table className="heat-table">
        <thead>
          <tr>
            <th />
            {colLabels.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowLabels.map((r, i) => (
            <tr key={r}>
              <th>{r}</th>
              {colLabels.map((c, j) => {
                const v = cells[i]?.[j] ?? 0
                const t = v / max
                return (
                  <td
                    key={c}
                    style={{
                      background: `rgba(15, 107, 92, ${0.08 + t * 0.72})`,
                      color: t > 0.55 ? '#f6f3ea' : '#14212b',
                    }}
                  >
                    {v || '·'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

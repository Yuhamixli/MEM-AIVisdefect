import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BoxOverlay } from '../components/BoxOverlay'
import {
  CLASS_CATALOG,
  classNameZh,
  classSeverity,
  isKnownSlug,
  REVIEW_LABEL,
} from '../lib/catalog'
import { confBand } from '../lib/config'
import { downloadCsv, jobsToCsv, stamp } from '../lib/csv'
import { publicUrl } from '../lib/paths'
import { mergeJob, upsertOverride } from '../lib/reviewStore'
import type { Defect, JobDetail, ReviewOverride, UiConfig } from '../lib/types'

export function JobDetailPage({ config }: { config: UiConfig }) {
  const { pieceId } = useParams()
  const [raw, setRaw] = useState<JobDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [faceIdx, setFaceIdx] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showBoxes, setShowBoxes] = useState(true)
  const [showMasks, setShowMasks] = useState(false)
  const [onlyLow, setOnlyLow] = useState(false)
  const [reviewer, setReviewer] = useState('黄崇发')
  const [note, setNote] = useState('')
  const [relabel, setRelabel] = useState('')
  const [apiMsg, setApiMsg] = useState<string | null>(null)
  const [rev, setRev] = useState(0)

  useEffect(() => {
    if (!pieceId) return
    fetch(publicUrl(`/data/detect/jobs/${pieceId}.json`))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<JobDetail>
      })
      .then((j) => {
        setRaw(j)
        setFaceIdx(0)
        setError(null)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [pieceId])

  const job = useMemo(() => (raw ? mergeJob(raw) : null), [raw, rev])
  const face = job?.faces[faceIdx]
  const defects = useMemo(() => {
    const list = face?.defects ?? []
    const sorted = [...list].sort((a, b) => a.confidence - b.confidence)
    if (!onlyLow) return sorted
    return sorted.filter((d) => d.confidence < config.confidence_review_threshold)
  }, [face, onlyLow, config.confidence_review_threshold])

  const hasMask = (face?.defects ?? []).some((d) => (d.mask?.length ?? 0) >= 3)
  const active = defects.find((d) => d.defect_id === activeId) ?? null
  const lowOnFace = (face?.defects ?? []).some((d) => d.confidence < config.confidence_low_threshold)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!job) return
      if (e.key === 'Escape') setActiveId(null)
      if (e.key === 'ArrowLeft') setFaceIdx((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setFaceIdx((i) => Math.min(job.faces.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [job])

  async function applyReview(action: ReviewOverride['action']) {
    if (!job || !active) return
    const ov: ReviewOverride = {
      piece_id: job.piece_id,
      defect_id: active.defect_id,
      action,
      new_slug: action === 'relabel' ? relabel || undefined : undefined,
      note: note || undefined,
      reviewer,
      ts: new Date().toISOString(),
    }
    upsertOverride(ov)
    setRev((n) => n + 1)
    setApiMsg('已写入本地复核层（不改检测原值）')
    const pw = sessionStorage.getItem('bi-feedback-pw') || 'dev-password'
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Write-Password': pw,
        },
        body: JSON.stringify(ov),
      })
      if (res.ok) {
        const data = (await res.json()) as { file?: string }
        setApiMsg(`本地复核层已更新；后端已落盘 ${data.file ?? ''}`)
      }
    } catch {
      /* 本地无 API 时仍可用 CSV / localStorage */
    }
  }

  if (error) {
    return (
      <section className="panel">
        <Link to="/">← 返回列表</Link>
        <p className="err">加载失败：{error}</p>
      </section>
    )
  }
  if (!job || !face) return <p className="muted">加载样件…</p>

  return (
    <section className="panel">
      <div className="detail-head">
        <div>
          <Link to="/">← 返回列表</Link>
          <h2>{job.piece_id}</h2>
          <p className="muted">
            批次 {job.batch_id || '—'} · 模型 {job.model_version || '—'} · {job.detected_at || '—'} ·{' '}
            <span className={`badge badge-${job.review_status}`}>
              {REVIEW_LABEL[job.review_status] ?? job.review_status}
            </span>
          </p>
        </div>
        <div className="face-switch">
          <label>
            检测面
            <select value={faceIdx} onChange={(e) => setFaceIdx(Number(e.target.value))}>
              {job.faces.map((f, i) => (
                <option key={`${f.face}-${i}`} value={i}>
                  {f.face}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {lowOnFace ? (
        <p className="banner-warn">存在置信度 &lt; {config.confidence_low_threshold} 的检出，已在列表置顶。</p>
      ) : null}

      <div className="viewer-tools">
        <label>
          <input type="checkbox" checked={showBoxes} onChange={(e) => setShowBoxes(e.target.checked)} />
          框
        </label>
        <label title={hasMask ? undefined : '本任务无掩码'}>
          <input
            type="checkbox"
            checked={showMasks}
            disabled={!hasMask}
            onChange={(e) => setShowMasks(e.target.checked)}
          />
          掩码{hasMask ? '' : '（无）'}
        </label>
        <label>
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          仅看低置信
        </label>
        <button
          type="button"
          className="btn-ghost"
          onClick={() =>
            downloadCsv(`export_${job.piece_id}_${stamp()}.csv`, jobsToCsv([job]))
          }
        >
          导出本件 CSV
        </button>
      </div>

      <div className="detail-grid">
        <BoxOverlay
          imageSrc={face.image}
          imageSize={face.image_size}
          defects={defects}
          activeId={activeId}
          showBoxes={showBoxes}
          showMasks={showMasks}
          onSelect={setActiveId}
        />
        <div>
          <h3>缺陷列表（{defects.length}）</h3>
          {face.defects.length === 0 ? <p className="empty">无检出</p> : null}
          <ul className="defect-list">
            {defects.map((d) => (
              <DefectRow
                key={d.defect_id}
                d={d}
                active={activeId === d.defect_id}
                low={config.confidence_low_threshold}
                onClick={() => setActiveId(d.defect_id)}
              />
            ))}
          </ul>
        </div>
      </div>

      <div className="review-bar">
        <strong>复核</strong>
        <span className="muted">
          当前：{active ? `${active.defect_id} ${classNameZh(active.slug, active.class_name)}` : '未选中'}
        </span>
        <label>
          操作人
          <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
        </label>
        <label>
          改判类别
          <select value={relabel} onChange={(e) => setRelabel(e.target.value)}>
            <option value="">无</option>
            {Object.entries(CLASS_CATALOG).map(([slug, meta]) => (
              <option key={slug} value={slug}>
                {meta.zh}
              </option>
            ))}
          </select>
        </label>
        <label className="grow">
          备注
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button type="button" className="btn-ok" disabled={!active} onClick={() => applyReview('confirm')}>
          确认
        </button>
        <button type="button" className="btn-bad" disabled={!active} onClick={() => applyReview('reject')}>
          驳回
        </button>
        <button type="button" className="btn-ghost" disabled={!active || !relabel} onClick={() => applyReview('relabel')}>
          改判
        </button>
        {apiMsg ? <p className="muted">{apiMsg}</p> : null}
      </div>
    </section>
  )
}

function DefectRow({
  d,
  active,
  low,
  onClick,
}: {
  d: Defect
  active: boolean
  low: number
  onClick: () => void
}) {
  const conf = Number.isFinite(d.confidence) && d.confidence >= 0 && d.confidence <= 1
  const band = confBand(d.confidence, low)
  return (
    <li>
      <button type="button" className={`defect-row${active ? ' active' : ''}`} onClick={onClick}>
        <span className="mono">{d.defect_id}</span>
        <span>
          {isKnownSlug(d.slug) ? classNameZh(d.slug, d.class_name) : <span className="err">未知 {d.slug}</span>}
          <span className="muted"> · {classSeverity(d.slug, d.severity ?? d.severity_hint)}</span>
        </span>
        <span className={conf ? `conf-${band}` : 'muted'}>
          {conf ? d.confidence.toFixed(2) : '—'}
          {conf && d.confidence < low ? ' ⚠' : ''}
        </span>
        <span className={`badge badge-${d.review_status}`}>
          {REVIEW_LABEL[d.review_status] ?? d.review_status}
        </span>
        <span className="mono muted">
          [{d.bbox.map((n) => Math.round(n)).join(',')}]
        </span>
      </button>
    </li>
  )
}

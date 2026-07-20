import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BoxOverlay, type DefectBox } from '../components/BoxOverlay'

interface Face {
  face: string
  image: string
  image_size: [number, number]
  defects: DefectBox[]
}

interface JobDetail {
  piece_id: string
  batch_id: string
  faces: Face[]
  detected_at: string
  model_version: string
  review_status: string
}

function confClass(c: number) {
  if (c < 0.5) return 'conf-low'
  if (c < 0.75) return 'conf-mid'
  return 'conf-high'
}

export function JobDetailPage() {
  const { pieceId } = useParams()
  const [job, setJob] = useState<JobDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (!pieceId) return
    fetch(`/data/detect/jobs/${pieceId}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<JobDetail>
      })
      .then(setJob)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [pieceId])

  const face = job?.faces[0]
  const defects = useMemo(() => {
    const list = face?.defects ?? []
    return [...list].sort((a, b) => a.confidence - b.confidence)
  }, [face])

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
            批次 {job.batch_id} · {job.model_version} ·{' '}
            <span className={`badge badge-${job.review_status}`}>{job.review_status}</span>
          </p>
        </div>
      </div>

      <div className="detail-grid">
        <BoxOverlay
          imageSrc={face.image}
          imageSize={face.image_size}
          defects={defects}
          activeId={activeId}
          onSelect={setActiveId}
        />
        <div>
          <h3>缺陷列表（低置信优先）</h3>
          <ul className="defect-list">
            {defects.map((d) => (
              <li key={d.defect_id}>
                <button
                  type="button"
                  className={`defect-row${activeId === d.defect_id ? ' active' : ''}`}
                  onClick={() => setActiveId(d.defect_id)}
                >
                  <span className="mono">{d.defect_id}</span>
                  <span>{d.class_name ?? d.slug}</span>
                  <span className={confClass(d.confidence)}>{d.confidence.toFixed(2)}</span>
                  <span className={`badge badge-${d.review_status}`}>{d.review_status}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

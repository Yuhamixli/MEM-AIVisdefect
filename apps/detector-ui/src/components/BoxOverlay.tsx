import { useMemo, useState } from 'react'

export interface DefectBox {
  defect_id: string
  slug: string
  class_name?: string
  bbox: [number, number, number, number]
  confidence: number
  review_status: string
}

const SLUG_COLOR: Record<string, string> = {
  crack: '#e11d48',
  bubble: '#2563eb',
  missing_yarn: '#d97706',
  scratch: '#7c3aed',
  foreign_matter: '#059669',
  whitening: '#0891b2',
  contamination: '#ea580c',
}

export function BoxOverlay({
  imageSrc,
  imageSize,
  defects,
  activeId,
  onSelect,
}: {
  imageSrc: string
  imageSize: [number, number]
  defects: DefectBox[]
  activeId?: string | null
  onSelect?: (id: string) => void
}) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [iw, ih] = imageSize

  const sorted = useMemo(
    () => [...defects].sort((a, b) => a.confidence - b.confidence),
    [defects],
  )

  return (
    <div className="overlay-wrap">
      <img
        src={imageSrc}
        alt="检测原图"
        className="overlay-img"
        onLoad={(e) => {
          const img = e.currentTarget
          setNatural({ w: img.clientWidth, h: img.clientHeight })
        }}
      />
      {natural
        ? sorted.map((d) => {
            const [x, y, w, h] = d.bbox
            const left = (x / iw) * natural.w
            const top = (y / ih) * natural.h
            const width = (w / iw) * natural.w
            const height = (h / ih) * natural.h
            const color = SLUG_COLOR[d.slug] ?? '#f8fafc'
            const active = activeId === d.defect_id
            return (
              <button
                key={d.defect_id}
                type="button"
                className={`bbox${active ? ' bbox-active' : ''}`}
                style={{
                  left,
                  top,
                  width,
                  height,
                  borderColor: color,
                  boxShadow: active ? `0 0 0 2px ${color}` : undefined,
                }}
                title={`${d.class_name ?? d.slug} ${d.confidence.toFixed(2)}`}
                onClick={() => onSelect?.(d.defect_id)}
              />
            )
          })
        : null}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { classColor, isKnownSlug } from '../lib/catalog'
import type { Defect } from '../lib/types'

export function BoxOverlay({
  imageSrc,
  imageSize,
  defects,
  activeId,
  showBoxes,
  showMasks,
  onSelect,
}: {
  imageSrc: string
  imageSize: [number, number]
  defects: Defect[]
  activeId?: string | null
  showBoxes: boolean
  showMasks: boolean
  onSelect?: (id: string) => void
}) {
  const [missing, setMissing] = useState(false)
  const [iw, ih] = imageSize

  useEffect(() => {
    setMissing(false)
  }, [imageSrc])

  const hasAnyMask = defects.some((d) => (d.mask?.length ?? 0) >= 3)

  return (
    <div className="overlay-wrap">
      {missing || !imageSrc ? (
        <div className="img-missing" style={{ aspectRatio: `${iw} / ${ih}` }}>
          图像缺失
        </div>
      ) : (
        <img
          src={imageSrc}
          alt="检测原图"
          className="overlay-img"
          onError={() => setMissing(true)}
        />
      )}
      <svg
        className="overlay-svg"
        viewBox={`0 0 ${iw} ${ih}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {showMasks && hasAnyMask
          ? defects.map((d) => {
              if (!d.mask || d.mask.length < 3) return null
              const color = classColor(d.slug)
              return (
                <polygon
                  key={`m-${d.defect_id}`}
                  points={d.mask.map(([x, y]) => `${x},${y}`).join(' ')}
                  fill={color}
                  fillOpacity={0.35}
                  stroke={color}
                  strokeWidth={activeId === d.defect_id ? 4 : 2}
                  vectorEffect="non-scaling-stroke"
                  onClick={() => onSelect?.(d.defect_id)}
                  style={{ cursor: 'pointer' }}
                />
              )
            })
          : null}
        {showBoxes
          ? defects.map((d) => {
              const [x, y, w, h] = d.bbox
              const color = isKnownSlug(d.slug) ? classColor(d.slug) : '#94a3b8'
              const active = activeId === d.defect_id
              return (
                <g key={`b-${d.defect_id}`} onClick={() => onSelect?.(d.defect_id)} style={{ cursor: 'pointer' }}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={active ? 4 : 2}
                    vectorEffect="non-scaling-stroke"
                  />
                  {active ? (
                    <text
                      x={x}
                      y={Math.max(24, y - 8)}
                      fill={color}
                      fontSize={Math.max(28, ih * 0.018)}
                      fontFamily="IBM Plex Sans, sans-serif"
                    >
                      {d.class_name ?? d.slug}
                    </text>
                  ) : null}
                </g>
              )
            })
          : null}
      </svg>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { downloadCsv, jobsToCsv, stamp } from '../lib/csv'
import { publicUrl } from '../lib/paths'
import { mergeJob, overrideMap } from '../lib/reviewStore'
import type { JobDetail, JobsIndex } from '../lib/types'

export function ExportPage() {
  const [jobs, setJobs] = useState<JobDetail[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      const idxRes = await fetch(publicUrl('/data/detect/jobs-index.json'))
      if (!idxRes.ok) throw new Error(`HTTP ${idxRes.status}`)
      const idx = (await idxRes.json()) as JobsIndex
      const loaded = (
        await Promise.all(
          idx.jobs.map(async (row) => {
            const r = await fetch(publicUrl(`/data/detect/jobs/${row.piece_id}.json`))
            if (!r.ok) return null
            return mergeJob(await r.json())
          }),
        )
      ).filter((x): x is JobDetail => Boolean(x))
      if (!cancelled) {
        setJobs(loaded)
        setSelected(Object.fromEntries(loaded.map((j) => [j.piece_id, true])))
      }
    }
    load().catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e.message : String(e))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const picked = jobs.filter((j) => selected[j.piece_id])

  function exportCsv() {
    downloadCsv(`export_selected_${stamp()}.csv`, jobsToCsv(picked, overrideMap()))
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(picked, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `export_selected_${stamp()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error) return <p className="err">加载失败：{error}</p>
  if (jobs.length === 0 && !error) return <p className="muted">加载导出范围…</p>

  return (
    <section className="panel">
      <h2>导出</h2>
      <p className="muted">CSV 带 UTF-8 BOM，Excel 可直接打开。复核结论来自 override 层，检测原值不变。</p>
      {jobs.length === 0 ? (
        <p className="empty">无数据</p>
      ) : (
        <ul className="export-list">
          {jobs.map((j) => (
            <li key={j.piece_id}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(selected[j.piece_id])}
                  onChange={(e) => setSelected((s) => ({ ...s, [j.piece_id]: e.target.checked }))}
                />
                {j.piece_id} · {j.batch_id} · {j.faces.reduce((n, f) => n + f.defects.length, 0)} 个缺陷
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="toolbar">
        <button type="button" className="btn-ok" disabled={picked.length === 0} onClick={exportCsv}>
          导出 CSV（{picked.length}）
        </button>
        <button type="button" className="btn-ghost" disabled={picked.length === 0} onClick={exportJson}>
          导出 JSON
        </button>
      </div>
    </section>
  )
}

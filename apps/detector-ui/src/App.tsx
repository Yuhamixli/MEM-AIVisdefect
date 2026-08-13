import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { loadUiConfig } from './lib/config'
import type { JobsIndex, UiConfig } from './lib/types'
import { ExportPage } from './pages/ExportPage'
import { JobDetailPage } from './pages/JobDetailPage'
import { JobsPage } from './pages/JobsPage'
import { ReviewPage } from './pages/ReviewPage'

export default function App() {
  const [config, setConfig] = useState<UiConfig | null>(null)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    loadUiConfig().then(setConfig)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function countPending() {
      try {
        const res = await fetch('/data/detect/jobs-index.json')
        if (!res.ok) return
        const idx = (await res.json()) as JobsIndex
        const n = idx.jobs.filter((j) => j.review_status === 'pending').length
        if (!cancelled) setPending(n)
      } catch {
        /* ignore */
      }
    }
    countPending()
    return () => {
      cancelled = true
    }
  }, [])

  if (!config) return <p className="muted">加载配置…</p>

  return (
    <Shell pendingCount={pending} config={config}>
      <Routes>
        <Route index element={<JobsPage config={config} />} />
        <Route path="jobs/:pieceId" element={<JobDetailPage config={config} />} />
        <Route path="review" element={<ReviewPage config={config} />} />
        <Route path="export" element={<ExportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}

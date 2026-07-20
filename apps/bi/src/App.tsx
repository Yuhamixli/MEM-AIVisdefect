import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { loadBiSnapshot } from './data/load'
import type { BiSnapshot } from './data/types'
import { BiweeklyPage } from './pages/BiweeklyPage'
import { BudgetPage } from './pages/BudgetPage'
import { FeedbackPage } from './pages/FeedbackPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { OpenDecisionsPage } from './pages/OpenDecisionsPage'
import { OverviewPage } from './pages/OverviewPage'
import { PlanPage } from './pages/PlanPage'
import { TeamPage } from './pages/TeamPage'

export default function App() {
  const [data, setData] = useState<BiSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadBiSnapshot()
      .then((snap) => {
        if (!cancelled) setData(snap)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div className="app-shell">
        <div className="error-box">
          <strong>数据加载失败</strong>
          <p>{error}</p>
          <p className="muted">请在 `apps/bi` 运行：`npm run sync-data` 后刷新。</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="app-shell">
        <div className="loading">正在读取 `.project-spec` 快照…</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<OverviewPage data={data} />} />
        <Route path="plan" element={<PlanPage data={data} />} />
        <Route path="budget" element={<BudgetPage data={data} />} />
        <Route path="team" element={<TeamPage data={data} />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="knowledge/:docId" element={<KnowledgePage />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="open-decisions" element={<OpenDecisionsPage />} />
        <Route path="biweekly" element={<BiweeklyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

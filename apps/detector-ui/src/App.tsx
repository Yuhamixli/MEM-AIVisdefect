import { Navigate, Route, Routes } from 'react-router-dom'
import { JobDetailPage } from './pages/JobDetailPage'
import { JobsPage } from './pages/JobsPage'

export default function App() {
  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">MEM-AIVisdefect · detector-ui</p>
          <h1>检测结果展示</h1>
          <p className="sub">离线模块结构化输出可视化（mock 可演示；真实样例联调见文档 26）</p>
        </div>
      </header>
      <Routes>
        <Route index element={<JobsPage />} />
        <Route path="jobs/:pieceId" element={<JobDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

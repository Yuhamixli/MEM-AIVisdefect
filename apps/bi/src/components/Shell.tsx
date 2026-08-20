import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { publicUrl } from '../data/load'
import { detectorUiUrl } from '../lib/urls'

export function Shell() {
  const [syncedAt, setSyncedAt] = useState<string | null>(null)

  useEffect(() => {
    fetch(publicUrl('/data/sync-meta.json'))
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { synced_at?: string } | null) => {
        if (d?.synced_at) setSyncedAt(d.synced_at)
      })
      .catch(() => undefined)
  }, [])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <p className="eyebrow">MEM-AIVisdefect · 电芯压条 · 拉挤外观检</p>
          <h1>项目健康看板</h1>
          <p className="sub">
            申报书考核：查全率≥80% · 准确率≥85% · ≥3类 · 50件。评价看准确度/效率/成本（目的&gt;手段）。五节点至
            09-30。
          </p>
        </div>
        <nav className="nav" aria-label="主导航">
          <NavLink to="/" end>
            总览
          </NavLink>
          <NavLink to="/detect">检测</NavLink>
          <NavLink to="/plan">计划</NavLink>
          <NavLink to="/budget">M币</NavLink>
          <NavLink to="/team">团队</NavLink>
          <NavLink to="/open-decisions">未决</NavLink>
          <NavLink to="/biweekly">双周报</NavLink>
          <NavLink to="/knowledge">知识</NavLink>
        </nav>
      </header>
      <Outlet />
      <footer className="page-foot">
        数据截至 {syncedAt ?? '未同步，请运行 npm run sync-data'}
        {' · '}
        <a href={detectorUiUrl('/')}>detector-ui</a>
      </footer>
    </div>
  )
}

import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import type { UiConfig } from '../lib/types'

export function Shell({
  children,
  pendingCount,
  config,
}: {
  children: ReactNode
  pendingCount: number
  config: UiConfig
}) {
  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">MEM-AIVisdefect · detector-ui</p>
          <h1>检测结果展示</h1>
          <p className="sub">离线模块结构化输出 · 只读 public/data/detect 快照 · 复核不改检测原值</p>
        </div>
        <nav className="nav" aria-label="detector-ui 导航">
          <NavLink to="/" end>
            任务列表
          </NavLink>
          <NavLink to="/review">
            复核队列{pendingCount > 0 ? <span className="nav-count">{pendingCount}</span> : null}
          </NavLink>
          <NavLink to="/export">导出</NavLink>
          <a href={config.bi_url} className="nav-ext">
            返回管理看板
          </a>
        </nav>
      </header>
      {children}
    </div>
  )
}

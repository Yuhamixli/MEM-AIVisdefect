import { NavLink, Outlet } from 'react-router-dom'

export function Shell() {
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
          <NavLink to="/plan">计划</NavLink>
          <NavLink to="/budget">M币</NavLink>
          <NavLink to="/team">团队</NavLink>
          <NavLink to="/knowledge">知识</NavLink>
          <NavLink to="/feedback">意见箱</NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}

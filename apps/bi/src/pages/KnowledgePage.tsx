import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { loadKnowledgeIndex, loadKnowledgeMarkdown } from '../data/load'
import type { KnowledgeItem } from '../data/knowledge'

export function KnowledgePage() {
  const { docId } = useParams()
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [updatedAt, setUpdatedAt] = useState('')
  const [feishuPulledAt, setFeishuPulledAt] = useState('')
  const [feishuCount, setFeishuCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadKnowledgeIndex()
      .then((idx) => {
        if (cancelled) return
        setItems(idx.items)
        setUpdatedAt(idx.updated_at)
        setFeishuPulledAt(idx.feishu_pulled_at ?? '')
        setFeishuCount(idx.feishu_count ?? 0)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category))
    return ['全部', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'zh'))]
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pinned = new Set([
      'evaluation-principles',
      'open-decisions',
      'operation-plan',
      'todo',
      'defect-catalog',
      'progress-status',
      'meeting-zhang-20260711',
    ])
    const pinExtra = (id: string, title: string) =>
      /20260801/.test(title) || /20260808/.test(title) || (id.startsWith('fs-') && title === '进度状态')
    return items
      .filter((item) => {
        if (category !== '全部' && item.category !== category) return false
        if (!q) return true
        return (
          item.title.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const ap = pinned.has(a.id) || pinExtra(a.id, a.title) ? 0 : 1
        const bp = pinned.has(b.id) || pinExtra(b.id, b.title) ? 0 : 1
        if (ap !== bp) return ap - bp
        return 0
      })
  }, [items, query, category])

  const active = items.find((i) => i.id === docId) ?? null

  useEffect(() => {
    if (!active) {
      setMarkdown(null)
      return
    }
    let cancelled = false
    setLoadingDoc(true)
    loadKnowledgeMarkdown(active.path)
      .then((text) => {
        if (!cancelled) setMarkdown(text)
      })
      .catch((err: unknown) => {
        if (!cancelled) setMarkdown(`加载失败：${err instanceof Error ? err.message : String(err)}`)
      })
      .finally(() => {
        if (!cancelled) setLoadingDoc(false)
      })
    return () => {
      cancelled = true
    }
  }, [active])

  if (error) {
    return (
      <div className="error-box">
        <strong>知识索引加载失败</strong>
        <p>{error}</p>
        <p className="muted">请运行 `npm run sync-data` 生成 `knowledge-index.json`。</p>
      </div>
    )
  }

  return (
    <div className="knowledge-layout">
      <aside className="card knowledge-sidebar">
        <h2>项目知识库</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
          共 {items.length} 篇 · 仓库同步 {updatedAt || '—'}
          {feishuPulledAt ? ` · 飞书镜像 ${feishuPulledAt}（${feishuCount} 篇）` : ''}
        </p>
        <input
          className="knowledge-search"
          type="search"
          placeholder="搜索标题 / 路径 / 分类"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="搜索知识"
        />
        <div className="category-chips">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip${category === c ? ' active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="knowledge-list">
          {filtered.map((item) => (
            <Link
              key={item.id}
              to={`/knowledge/${item.id}`}
              className={`knowledge-item${active?.id === item.id ? ' active' : ''}`}
            >
              <span className="k-cat">{item.category}</span>
              <span className="k-title">{item.title}</span>
            </Link>
          ))}
          {filtered.length === 0 ? <p className="muted">无匹配条目</p> : null}
        </div>
      </aside>

      <article className="card knowledge-article">
        {!active ? (
          <div className="knowledge-empty">
            <h2>浏览项目知识</h2>
            <p>
              看板读的是 <strong>GitHub 仓库</strong>，不是飞书网页。左侧「项目管理 / 领域知识」是仓库定稿（不少停在 7
              月）；「飞书·…」分类是 2026-08-13 从共享盘拉下来的镜像，含 8/1 详设方案、8/8 周会逐字稿。
            </p>
            <div className="pinned-docs">
              <p className="eyebrow" style={{ marginBottom: 8 }}>
                申报书主入口
              </p>
              <Link to="/knowledge/progress-status" className="pinned-link">
                当前进度状态（08-13 策展）
              </Link>
              <Link to="/knowledge/operation-plan" className="pinned-link">
                课题运营计划（申报书）
              </Link>
              <Link to="/knowledge/todo" className="pinned-link">
                模块化 TODO
              </Link>
              <Link to="/knowledge/defect-catalog" className="pinned-link">
                缺陷图谱（七类）
              </Link>
              <Link to="/plan" className="pinned-link">
                运营 / 计划看板 →
              </Link>
            </div>
            <p className="muted">
              要对齐飞书：`apps/feishu-cursor-bridge` 跑 `npm run sync-docs`，再在 `apps/bi` 跑 `npm run sync-data`。
            </p>
          </div>
        ) : (
          <>
            <header className="knowledge-article-head">
              <div>
                <p className="eyebrow">{active.category}</p>
                <h2 style={{ margin: 0 }}>{active.title}</h2>
                <p className="muted" style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>
                  源文件：<code>{active.source}</code>
                </p>
              </div>
            </header>
            {loadingDoc ? (
              <p className="muted">加载中…</p>
            ) : (
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown ?? ''}</ReactMarkdown>
              </div>
            )}
          </>
        )}
      </article>
    </div>
  )
}

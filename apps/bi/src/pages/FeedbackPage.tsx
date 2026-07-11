import { useEffect, useState, type FormEvent } from 'react'

const SESSION_KEY = 'bi-feedback-unlocked'

type FeedbackForm = {
  author: string
  type: 'opinion' | 'concern' | 'idea'
  priority_hint: 'low' | 'medium' | 'high'
  related_area: string
  summary: string
  detail: string
  hope: string
  if_ignored: string
}

const EMPTY: FeedbackForm = {
  author: '',
  type: 'opinion',
  priority_hint: 'medium',
  related_area: '其它',
  summary: '',
  detail: '',
  hope: '',
  if_ignored: '',
}

const AREAS = ['范围', '进度', '成本', '质量', '团队', '技术', '其它'] as const

export function FeedbackPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [form, setForm] = useState<FeedbackForm>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitOk, setSubmitOk] = useState<string | null>(null)

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(SESSION_KEY) === '1')
  }, [])

  async function handleUnlock(e: FormEvent) {
    e.preventDefault()
    setUnlockError(null)
    setUnlocking(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Write-Password': password,
        },
        body: JSON.stringify({ action: 'ping' }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        throw new Error(data.error || `口令校验失败（${res.status}）`)
      }
      sessionStorage.setItem(SESSION_KEY, '1')
      sessionStorage.setItem('bi-feedback-pw', password)
      setUnlocked(true)
      setPassword('')
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : String(err))
    } finally {
      setUnlocking(false)
    }
  }

  function update<K extends keyof FeedbackForm>(key: K, value: FeedbackForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitOk(null)
    setSubmitting(true)
    const pw = sessionStorage.getItem('bi-feedback-pw') || ''
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Write-Password': pw,
        },
        body: JSON.stringify({ action: 'submit', ...form }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        path?: string
        message?: string
      }
      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem(SESSION_KEY)
          sessionStorage.removeItem('bi-feedback-pw')
          setUnlocked(false)
        }
        throw new Error(data.error || `提交失败（${res.status}）`)
      }
      setSubmitOk(data.message || `已进入意见箱${data.path ? `：${data.path}` : ''}，等待管理者消化。`)
      setForm(EMPTY)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!unlocked) {
    return (
      <section className="card feedback-card">
        <h2>意见箱</h2>
        <p className="muted">
          读知识无需登录。填写意见需队入口令（向课题管理者索取）。提交后进入仓库意见箱，由管理者定期消化，不会自动改需求。
        </p>
        <form className="feedback-form" onSubmit={handleUnlock}>
          <label>
            队入口令
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {unlockError ? <p className="form-error">{unlockError}</p> : null}
          <button type="submit" className="btn-primary" disabled={unlocking || !password}>
            {unlocking ? '校验中…' : '解锁填写'}
          </button>
        </form>
      </section>
    )
  }

  return (
    <section className="card feedback-card">
      <h2>提交意见</h2>
      <p className="muted">字段与仓库意见模板一致。一句话必填；其余尽量写清。</p>
      <form className="feedback-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            姓名或编号
            <input
              value={form.author}
              onChange={(e) => update('author', e.target.value)}
              placeholder="如 T03 或 张三"
              required
            />
          </label>
          <label>
            类型
            <select value={form.type} onChange={(e) => update('type', e.target.value as FeedbackForm['type'])}>
              <option value="opinion">意见</option>
              <option value="concern">担忧</option>
              <option value="idea">点子</option>
            </select>
          </label>
          <label>
            优先级（自评）
            <select
              value={form.priority_hint}
              onChange={(e) => update('priority_hint', e.target.value as FeedbackForm['priority_hint'])}
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </label>
          <label>
            相关领域
            <select value={form.related_area} onChange={(e) => update('related_area', e.target.value)}>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          一句话
          <input
            value={form.summary}
            onChange={(e) => update('summary', e.target.value)}
            placeholder="用一句话说清楚你的看法"
            required
            maxLength={200}
          />
        </label>
        <label>
          详细说明
          <textarea value={form.detail} onChange={(e) => update('detail', e.target.value)} rows={4} />
        </label>
        <label>
          你希望发生什么
          <textarea value={form.hope} onChange={(e) => update('hope', e.target.value)} rows={3} />
        </label>
        <label>
          若不处理会怎样
          <textarea value={form.if_ignored} onChange={(e) => update('if_ignored', e.target.value)} rows={3} />
        </label>
        {submitError ? <p className="form-error">{submitError}</p> : null}
        {submitOk ? <p className="form-ok">{submitOk}</p> : null}
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? '提交中…' : '提交到意见箱'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              sessionStorage.removeItem(SESSION_KEY)
              sessionStorage.removeItem('bi-feedback-pw')
              setUnlocked(false)
            }}
          >
            锁定
          </button>
        </div>
      </form>
    </section>
  )
}

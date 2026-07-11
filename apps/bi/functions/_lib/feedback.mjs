/**
 * Shared helpers for feedback write API (Cloudflare Pages + local Node).
 */

/**
 * @param {string} input
 * @param {number} [maxLen]
 */
export function slugify(input, maxLen = 24) {
  const s = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fff\-]+/gi, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return (s || 'note').slice(0, maxLen)
}

/**
 * @param {string} author
 */
export function sanitizeAuthor(author) {
  return String(author || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '')
    .slice(0, 32)
}

/**
 * @param {Date} [now]
 */
export function yyyymmdd(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

/**
 * @param {Date} [now]
 */
export function isoDate(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

/**
 * @param {{
 *   author: string
 *   type: string
 *   priority_hint: string
 *   related_area: string
 *   summary: string
 *   detail?: string
 *   hope?: string
 *   if_ignored?: string
 * }} body
 * @param {Date} [now]
 */
export function buildMarkdown(body, now = new Date()) {
  const author = sanitizeAuthor(body.author)
  const type = body.type || 'opinion'
  const priority = body.priority_hint || 'medium'
  const area = body.related_area || '其它'
  const summary = String(body.summary || '').trim()
  const detail = String(body.detail || '').trim()
  const hope = String(body.hope || '').trim()
  const ifIgnored = String(body.if_ignored || '').trim()
  const id = `FB-${yyyymmdd(now)}-web`

  return `# 意见反馈

\`\`\`yaml
id: ${id}
type: ${type}
author: ${author}
date: ${isoDate(now)}
status: open
priority_hint: ${priority}
related_area: ${area}
source: bi-web
\`\`\`

## 一句话

${summary}

## 详细说明

${detail || '（未填）'}

## 你希望发生什么

${hope || '（未填）'}

## 若不处理会怎样

${ifIgnored || '（未填）'}

## 附件 / 链接

（网页提交）
`
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, value: Record<string, string> } | { ok: false, error: string }}
 */
export function validateSubmitBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: '请求体无效' }
  }
  /** @type {Record<string, unknown>} */
  const b = /** @type {Record<string, unknown>} */ (body)
  const author = sanitizeAuthor(String(b.author || ''))
  const summary = String(b.summary || '').trim()
  if (!author) return { ok: false, error: '请填写姓名或编号' }
  if (!summary) return { ok: false, error: '请填写一句话' }
  if (summary.length > 200) return { ok: false, error: '一句话过长' }

  const type = String(b.type || 'opinion')
  if (!['opinion', 'concern', 'idea'].includes(type)) {
    return { ok: false, error: '类型无效' }
  }
  const priority_hint = String(b.priority_hint || 'medium')
  if (!['low', 'medium', 'high'].includes(priority_hint)) {
    return { ok: false, error: '优先级无效' }
  }
  const related_area = String(b.related_area || '其它').slice(0, 32)

  return {
    ok: true,
    value: {
      author,
      type,
      priority_hint,
      related_area,
      summary,
      detail: String(b.detail || ''),
      hope: String(b.hope || ''),
      if_ignored: String(b.if_ignored || ''),
    },
  }
}

/**
 * @param {Record<string, string>} value
 * @param {Date} [now]
 */
export function buildInboxRelativePath(value, now = new Date()) {
  const name = `${yyyymmdd(now)}-${value.author}-${slugify(value.summary)}.md`
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw new Error('非法文件名')
  }
  return `docs/feedback-inbox/inbox/${name}`
}

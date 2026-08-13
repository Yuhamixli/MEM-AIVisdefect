/**
 * Shared helpers for detector-ui review write API.
 */

const ACTIONS = new Set(['confirm', 'reject', 'relabel'])

/**
 * @param {unknown} body
 */
export function validateReviewBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: { code: 400, message: 'JSON 无效' } }
  }
  const piece_id = String(body.piece_id || '').trim()
  const defect_id = String(body.defect_id || '').trim()
  const action = String(body.action || '').trim()
  if (!piece_id) {
    return {
      ok: false,
      status: 422,
      error: { code: 422, message: 'piece_id is required', field_errors: { piece_id: 'required' } },
    }
  }
  if (!defect_id) {
    return {
      ok: false,
      status: 422,
      error: { code: 422, message: 'defect_id is required', field_errors: { defect_id: 'required' } },
    }
  }
  if (!ACTIONS.has(action)) {
    return {
      ok: false,
      status: 422,
      error: { code: 422, message: 'action must be confirm|reject|relabel', field_errors: { action: 'enum' } },
    }
  }
  if (action === 'relabel' && !String(body.new_slug || '').trim()) {
    return {
      ok: false,
      status: 422,
      error: { code: 422, message: 'new_slug is required for relabel', field_errors: { new_slug: 'required' } },
    }
  }
  return {
    ok: true,
    value: {
      piece_id: piece_id.slice(0, 64),
      defect_id: defect_id.slice(0, 64),
      action,
      new_slug: String(body.new_slug || '').trim().slice(0, 64) || undefined,
      note: String(body.note || '').trim().slice(0, 500) || undefined,
      reviewer: String(body.reviewer || '').trim().slice(0, 32) || undefined,
      ts: String(body.ts || new Date().toISOString()),
    },
  }
}

/**
 * @param {ReturnType<typeof validateReviewBody>['value']} value
 */
export function buildReviewMarkdown(value) {
  return `# 检测复核

\`\`\`yaml
piece_id: ${value.piece_id}
defect_id: ${value.defect_id}
action: ${value.action}
new_slug: ${value.new_slug || ''}
reviewer: ${value.reviewer || ''}
ts: ${value.ts}
status: open
\`\`\`

${value.note || '（无备注）'}
`
}

/**
 * @param {{ piece_id: string, defect_id: string, ts?: string }} value
 * @param {Date} [now]
 */
export function buildReviewRelativePath(value, now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const safePiece = String(value.piece_id).replace(/[^a-zA-Z0-9._-]/g, '-')
  const safeDef = String(value.defect_id).replace(/[^a-zA-Z0-9._-]/g, '-')
  return `docs/feedback-inbox/inbox/${y}${m}${d}-review-${safePiece}-${safeDef}.md`
}

import {
  buildReviewMarkdown,
  buildReviewRelativePath,
  validateReviewBody,
} from '../_lib/review.mjs'

/**
 * @typedef {{
 *   WRITE_PASSWORD: string
 *   GITHUB_TOKEN: string
 *   GITHUB_REPO: string
 *   GITHUB_BRANCH?: string
 * }} Env
 */

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function checkPassword(request, env) {
  const expected = env.WRITE_PASSWORD
  if (!expected) {
    return { ok: false, response: json(503, { ok: false, error: { code: 503, message: '服务未配置 WRITE_PASSWORD' } }) }
  }
  const got = request.headers.get('X-Write-Password') || ''
  if (got !== expected) {
    return { ok: false, response: json(401, { ok: false, error: { code: 401, message: '口令错误' } }) }
  }
  return { ok: true }
}

async function createGithubFile(env, path, markdown) {
  const token = env.GITHUB_TOKEN
  const repo = env.GITHUB_REPO
  if (!token || !repo) {
    return json(503, { ok: false, error: { code: 503, message: '服务未配置 GITHUB_TOKEN / GITHUB_REPO' } })
  }
  const branch = env.GITHUB_BRANCH || 'main'
  const encodedPath = path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
  const url = `https://api.github.com/repos/${repo}/contents/${encodedPath}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'mem-aivisdefect-review',
    },
    body: JSON.stringify({
      message: `review: ${path}`,
      content: btoa(unescape(encodeURIComponent(markdown))),
      branch,
    }),
  })
  if (res.status === 422 || res.status === 409) {
    return json(409, { ok: false, error: { code: 409, message: '同名复核记录已存在' } })
  }
  if (!res.ok) {
    return json(502, { ok: false, error: { code: 502, message: '写入仓库失败', upstream_status: res.status } })
  }
  return json(200, { ok: true, file: path })
}

/** @param {EventContext} context */
export async function onRequestPost(context) {
  const { request, env } = context
  const auth = checkPassword(request, env)
  if (!auth.ok) return auth.response

  let body
  try {
    body = await request.json()
  } catch {
    return json(400, { ok: false, error: { code: 400, message: 'JSON 无效' } })
  }

  const validated = validateReviewBody(body)
  if (!validated.ok) return json(validated.status, { ok: false, error: validated.error })

  const path = buildReviewRelativePath(validated.value)
  const markdown = buildReviewMarkdown(validated.value)
  return createGithubFile(env, path, markdown)
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Write-Password',
    },
  })
}

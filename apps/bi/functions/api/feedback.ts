import {
  buildInboxRelativePath,
  buildMarkdown,
  validateSubmitBody,
} from '../_lib/feedback.mjs'

/**
 * @typedef {{
 *   WRITE_PASSWORD: string
 *   GITHUB_TOKEN: string
 *   GITHUB_REPO: string
 *   GITHUB_BRANCH?: string
 * }} Env
 */

/**
 * @param {number} status
 * @param {Record<string, unknown>} body
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

/**
 * @param {Request} request
 * @param {Env} env
 */
function checkPassword(request, env) {
  const expected = env.WRITE_PASSWORD
  if (!expected) {
    return { ok: false, response: json(503, { error: '服务未配置 WRITE_PASSWORD' }) }
  }
  const got = request.headers.get('X-Write-Password') || ''
  if (got !== expected) {
    return { ok: false, response: json(401, { error: '口令错误' }) }
  }
  return { ok: true }
}

/**
 * @param {Env} env
 * @param {string} path
 * @param {string} markdown
 * @param {string} author
 */
async function createGithubFile(env, path, markdown, author) {
  const token = env.GITHUB_TOKEN
  const repo = env.GITHUB_REPO
  if (!token || !repo) {
    return json(503, { error: '服务未配置 GITHUB_TOKEN / GITHUB_REPO' })
  }
  const branch = env.GITHUB_BRANCH || 'main'
  const encodedPath = path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
  const url = `https://api.github.com/repos/${repo}/contents/${encodedPath}`
  const content = btoa(unescape(encodeURIComponent(markdown)))
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'mem-aivisdefect-bi',
    },
    body: JSON.stringify({
      message: `feedback(inbox): web submit from ${author}`,
      content,
      branch,
    }),
  })

  if (res.status === 422 || res.status === 409) {
    return json(409, { error: '同名文件已存在，请稍改一句话后重试' })
  }
  if (!res.ok) {
    const text = await res.text()
    console.error('GitHub API error', res.status, text.slice(0, 500))
    return json(502, { error: '写入仓库失败，请稍后重试或联系管理者' })
  }

  return json(201, {
    ok: true,
    path,
    message: `已进入意见箱：${path}，等待管理者消化。`,
  })
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
    return json(400, { error: 'JSON 无效' })
  }

  if (body && body.action === 'ping') {
    return json(200, { ok: true })
  }

  const validated = validateSubmitBody(body)
  if (!validated.ok) return json(400, { error: validated.error })

  let path
  try {
    path = buildInboxRelativePath(validated.value)
  } catch {
    return json(400, { error: '非法文件名' })
  }

  const markdown = buildMarkdown(validated.value)
  return createGithubFile(env, path, markdown, validated.value.author)
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

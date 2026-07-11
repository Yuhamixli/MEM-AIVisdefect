/**
 * Local feedback API for Vite dev.
 * Writes to repo docs/feedback-inbox/inbox/ when LOCAL_WRITE=1 (default),
 * or uses GitHub API when GITHUB_TOKEN + GITHUB_REPO are set and LOCAL_WRITE=0.
 *
 * Env:
 *   WRITE_PASSWORD (default: dev-password)
 *   PORT (default: 8788)
 *   LOCAL_WRITE (default: 1)
 *   GITHUB_TOKEN / GITHUB_REPO / GITHUB_BRANCH
 */
import { createServer } from 'node:http'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildInboxRelativePath,
  buildMarkdown,
  validateSubmitBody,
} from '../functions/_lib/feedback.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../../..')
const port = Number(process.env.PORT || 8788)
const writePassword = process.env.WRITE_PASSWORD || 'dev-password'
const localWrite = (process.env.LOCAL_WRITE || '1') !== '0'

/**
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {Record<string, unknown>} body
 */
function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify(body))
}

/**
 * @param {import('node:http').IncomingMessage} req
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

/**
 * @param {string} path
 * @param {string} markdown
 * @param {string} author
 */
async function writeViaGithub(path, markdown, author) {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  if (!token || !repo) {
    throw new Error('未配置 GITHUB_TOKEN / GITHUB_REPO')
  }
  const branch = process.env.GITHUB_BRANCH || 'main'
  const content = Buffer.from(markdown, 'utf8').toString('base64')
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
      'User-Agent': 'mem-aivisdefect-bi-local',
    },
    body: JSON.stringify({
      message: `feedback(inbox): web submit from ${author}`,
      content,
      branch,
    }),
  })
  if (res.status === 422 || res.status === 409) {
    const err = new Error('同名文件已存在，请稍改一句话后重试')
    // @ts-expect-error
    err.status = 409
    throw err
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub 写入失败: ${res.status} ${text.slice(0, 200)}`)
  }
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Write-Password',
    })
    res.end()
    return
  }

  if (req.method !== 'POST' || req.url?.split('?')[0] !== '/api/feedback') {
    sendJson(res, 404, { error: 'Not found' })
    return
  }

  const got = req.headers['x-write-password']
  if (got !== writePassword) {
    sendJson(res, 401, { error: '口令错误' })
    return
  }

  let body
  try {
    body = await readBody(req)
  } catch {
    sendJson(res, 400, { error: 'JSON 无效' })
    return
  }

  if (body?.action === 'ping') {
    sendJson(res, 200, { ok: true })
    return
  }

  const validated = validateSubmitBody(body)
  if (!validated.ok) {
    sendJson(res, 400, { error: validated.error })
    return
  }

  let path
  try {
    path = buildInboxRelativePath(validated.value)
  } catch {
    sendJson(res, 400, { error: '非法文件名' })
    return
  }

  const markdown = buildMarkdown(validated.value)

  try {
    if (localWrite) {
      const abs = join(repoRoot, path)
      if (existsSync(abs)) {
        sendJson(res, 409, { error: '同名文件已存在，请稍改一句话后重试' })
        return
      }
      mkdirSync(dirname(abs), { recursive: true })
      writeFileSync(abs, markdown, 'utf8')
    } else {
      await writeViaGithub(path, markdown, validated.value.author)
    }
    sendJson(res, 201, {
      ok: true,
      path,
      message: `已进入意见箱：${path}，等待管理者消化。`,
    })
  } catch (err) {
    const status = /** @type {{ status?: number }} */ (err).status || 502
    sendJson(res, status, {
      error: err instanceof Error ? err.message : String(err),
    })
  }
})

server.listen(port, () => {
  console.log(`[local-feedback-api] http://127.0.0.1:${port}/api/feedback`)
  console.log(`[local-feedback-api] WRITE_PASSWORD=${writePassword ? '(set)' : '(empty)'} LOCAL_WRITE=${localWrite ? '1' : '0'}`)
})

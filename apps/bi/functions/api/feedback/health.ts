/**
 * GET /api/feedback/health
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

/** @param {EventContext} context */
export async function onRequestGet(context) {
  const env = context.env || {}
  const missing = ['WRITE_PASSWORD', 'GITHUB_TOKEN', 'GITHUB_REPO'].filter((k) => !env[k])
  if (missing.length > 0) {
    return json(503, {
      ok: false,
      repo_configured: false,
      missing,
      ts: new Date().toISOString(),
    })
  }
  return json(200, {
    ok: true,
    repo_configured: true,
    branch: env.GITHUB_BRANCH || 'main',
    ts: new Date().toISOString(),
  })
}

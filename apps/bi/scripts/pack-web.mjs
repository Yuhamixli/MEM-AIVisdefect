/**
 * Assemble BI + detector-ui for a custom-domain static host (Aliyun OSS HK).
 * Site root = BI (VITE_BASE=/). Detector stays at /detector-ui/.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const biRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const detRoot = join(biRoot, '../detector-ui')
const out = join(biRoot, 'web-dist')

function run(cwd, command, extraEnv = {}) {
  const result = spawnSync(command, {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
    shell: true,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run(biRoot, 'npm run build', { VITE_BASE: '/' })
run(detRoot, 'npm run build', {
  VITE_BASE: '/detector-ui/',
  VITE_BI_HOME: '/index.html#/',
})

const biDist = join(biRoot, 'dist')
const detDist = join(detRoot, 'dist')
if (!existsSync(biDist) || !existsSync(detDist)) {
  console.error('missing dist after build')
  process.exit(1)
}

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync(biDist, out, { recursive: true })
cpSync(detDist, join(out, 'detector-ui'), { recursive: true })
console.log(`packed ${out}`)

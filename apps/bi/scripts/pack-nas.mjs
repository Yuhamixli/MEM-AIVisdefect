/**
 * Copy Vite dist into nas/html/MEM-AIVisdefect so Web Station / nginx
 * can serve the same /MEM-AIVisdefect/ base as GitHub Pages.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const dest = join(root, 'nas/html/MEM-AIVisdefect')

if (!existsSync(dist)) {
  console.error('missing dist — run npm run build first')
  process.exit(1)
}

rmSync(dest, { recursive: true, force: true })
mkdirSync(dest, { recursive: true })
cpSync(dist, dest, { recursive: true })
console.log(`packed ${dest}`)

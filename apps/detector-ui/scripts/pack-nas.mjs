/**
 * Copy Vite dist into bi/nas/html/detector-ui so Web Station can serve
 * /detector-ui/ next to /MEM-AIVisdefect/.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const dest = join(root, '../bi/nas/html/detector-ui')

if (!existsSync(dist)) {
  console.error('missing dist — run npm run build first')
  process.exit(1)
}

rmSync(dest, { recursive: true, force: true })
mkdirSync(dest, { recursive: true })
cpSync(dist, dest, { recursive: true })
console.log(`packed ${dest}`)

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../nas/html')
const port = Number(process.env.PORT || 4179)

http
  .createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }
    const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '')
    const file = path.normalize(path.join(dir, rel))
    if (!file.startsWith(path.normalize(dir))) {
      res.writeHead(403)
      res.end('forbidden')
      return
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404)
        res.end('not found')
        return
      }
      res.writeHead(200)
      res.end(data)
    })
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`nas-pack http://127.0.0.1:${port}/`)
  })

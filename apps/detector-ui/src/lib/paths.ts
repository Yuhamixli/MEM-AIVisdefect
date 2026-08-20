/** Resolve static files under Vite `base` (`/detector-ui/` on NAS / Pages). */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL
  const cleaned = path.startsWith('/') ? path.slice(1) : path
  return `${base}${cleaned}`
}

export function assetUrl(path: string): string {
  if (!path) return path
  if (/^https?:\/\//i.test(path)) return path
  return publicUrl(path)
}

export function biHomeUrl(_configured?: string): string {
  const configured = import.meta.env.VITE_BI_HOME as string | undefined
  if (configured) {
    if (/^https?:\/\//i.test(configured)) return configured
    const { protocol, host } = window.location
    const path = configured.startsWith('/') ? configured : `/${configured}`
    return `${protocol}//${host}${path}`
  }
  const { hostname, protocol, host } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:5173/MEM-AIVisdefect/#/'
  }
  return `${protocol}//${host}/MEM-AIVisdefect/index.html#/`
}

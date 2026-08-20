/** Cross-app links. Local Vite vs NAS / tunnel on the same host. */
export function detectorUiUrl(hashPath = '/'): string {
  const hash = hashPath.startsWith('/') ? hashPath : `/${hashPath}`
  const { hostname, protocol, host } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://127.0.0.1:5174/detector-ui/#${hash}`
  }
  return `${protocol}//${host}/detector-ui/index.html#${hash}`
}

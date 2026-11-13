import { useEffect, useState } from 'react'

// Hash routes work on GitHub Pages without any server configuration.
function parse() {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, query = ''] = raw.split('?')
  const parts = path.split('/').filter(Boolean)
  return { path: '/' + parts.join('/'), parts, query: Object.fromEntries(new URLSearchParams(query)) }
}

export function useRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const on = () => setRoute(parse())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export function navigate(to, { replace = false } = {}) {
  const hash = '#' + to
  if (replace) window.location.replace(hash)
  else window.location.hash = to
}

export function joinUrl(code) {
  const base = window.location.href.split('#')[0]
  return `${base}#/join?code=${code}`
}

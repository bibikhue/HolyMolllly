const pages = {
  '#/visitors': 'visitors',
  '#/countries': 'countries',
  '#/outlook': 'outlook',
  '#/reports': 'reports',
  '#/events': 'events',
  '#/project': 'project',
}

export function resolvePage(pathname, hash) {
  if (pathname !== '/' && pathname !== '/index.html') return 'notFound'

  const route = (hash || '').split('?')[0]
  if (route === '' || route === '#' || route === '#/') return 'dashboard'
  return pages[route] || 'notFound'
}

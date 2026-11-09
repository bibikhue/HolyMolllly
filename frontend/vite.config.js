import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { execFileSync } from 'node:child_process'
import { defineConfig, loadEnv } from 'vite'

function getGitHash() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }).trim() || 'local'
  } catch {
    return 'local'
  }
}

export default defineConfig(({ mode }) => {
  const { VITE_SITE_URL = '' } = loadEnv(mode, '.', 'VITE_')
  const title = '맙소사 | 부산 관광 대시보드'
  const description = '팀 맙소사의 부산 외국인 관광수요 대시보드. 전체 방문 현황과 국가별 관광, 관광수요 전망, 분석 리포트를 한곳에서 살펴보세요.'
  const imageAlt = '부산 바다와 광안대교 전경 위에 부산의 흐름을 읽다, 관광의 내일을 보다 문구와 팀 맙소사 이름을 담은 공유 이미지'
  let siteUrl
  if (VITE_SITE_URL.trim()) {
    const parsed = new URL(VITE_SITE_URL.trim())
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error('VITE_SITE_URL must be an HTTP(S) deployment URL without credentials, query, or fragment.')
    }
    siteUrl = parsed.href.endsWith('/') ? parsed.href : `${parsed.href}/`
  }
  const imageUrl = siteUrl ? new URL('images/mapsosa-og-coast-v3.png', siteUrl).href : '/images/mapsosa-og-coast-v3.png'
  const meta = (property, content) => ({ tag: 'meta', attrs: { property, content }, injectTo: 'head' })
  const twitter = (name, content) => ({ tag: 'meta', attrs: { name, content }, injectTo: 'head' })

  return {
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __GIT_HASH__: JSON.stringify(getGitHash()),
    },
    server: { proxy: { '/api/mice': 'http://127.0.0.1:4174', '/api/reports': { target: 'http://127.0.0.1:4174', changeOrigin: false }, '/api/chat': { target: 'http://127.0.0.1:4174', changeOrigin: false } } },
    plugins: [
      {
        name: 'mapsosa-sharing-metadata',
        transformIndexHtml() {
          return [
            meta('og:type', 'website'),
            meta('og:locale', 'ko_KR'),
            meta('og:site_name', '맙소사'),
            meta('og:title', title),
            meta('og:description', description),
            meta('og:image', imageUrl),
            meta('og:image:type', 'image/png'),
            meta('og:image:width', '1200'),
            meta('og:image:height', '630'),
            meta('og:image:alt', imageAlt),
            twitter('twitter:card', 'summary_large_image'),
            twitter('twitter:title', title),
            twitter('twitter:description', description),
            twitter('twitter:image', imageUrl),
            twitter('twitter:image:alt', imageAlt),
            ...(siteUrl ? [meta('og:url', siteUrl), { tag: 'link', attrs: { rel: 'canonical', href: siteUrl }, injectTo: 'head' }] : []),
          ]
        },
      },
      react(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
  }
})

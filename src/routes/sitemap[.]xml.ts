import { createFileRoute } from '@tanstack/react-router'

const SITE_ORIGIN = 'https://connectionshelper.app'

function daysAgo(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

function buildSitemap(): string {
  const staticUrls = [
    { loc: `${SITE_ORIGIN}/`, priority: '1.0', changefreq: 'daily' },
    {
      loc: `${SITE_ORIGIN}/how-it-works`,
      priority: '0.7',
      changefreq: 'monthly',
    },
    { loc: `${SITE_ORIGIN}/settings`, priority: '0.5', changefreq: 'monthly' },
  ]

  const puzzleUrls = Array.from({ length: 365 }, (_, i) => {
    const date = daysAgo(i)
    return {
      loc: `${SITE_ORIGIN}/?date=${date}`,
      lastmod: date,
      priority: i === 0 ? '0.9' : '0.6',
      changefreq: 'daily',
    }
  })

  const urls = [...staticUrls, ...puzzleUrls]

  const body = urls
    .map((u) => {
      const lastmod =
        'lastmod' in u && u.lastmod
          ? `\n    <lastmod>${u.lastmod}</lastmod>`
          : ''
      return `  <url>
    <loc>${u.loc}</loc>${lastmod}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () =>
        new Response(buildSitemap(), {
          headers: {
            'content-type': 'application/xml; charset=utf-8',
            'cache-control': 'public, max-age=3600, s-maxage=86400',
          },
        }),
    },
  },
})

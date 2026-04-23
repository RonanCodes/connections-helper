import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import appCss from '../styles.css?url'

const DESCRIPTION =
  'Get instant definitions for NYT Connections puzzle words. Stuck on a word? Look it up without spoiling the categories!'
const TITLE = 'Connections Helper: NYT Puzzle Sidekick 🧩'

const PRE_HYDRATE_THEME = `(function() {
  try {
    var theme = localStorage.getItem('sl-theme') || 'nyt';
    document.documentElement.setAttribute('data-theme', theme);
    var bg = theme === 'nyt' ? '#ffffff' :
             theme === 'light' ? '#ffffff' :
             theme === 'synthwave' ? '#1a1025' :
             theme === 'geocities' ? '#008080' :
             theme === 'neubrutalism' ? '#fef3c7' : '#121213';
    document.body.style.backgroundColor = bg;
  } catch (e) {}
})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { name: 'theme-color', content: '#121213' },
      { name: 'robots', content: 'index, follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:image', content: '/og-image.png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: DESCRIPTION },
      { name: 'twitter:image', content: '/og-image.png' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@300;400;500;600;700&family=Abril+Fatface&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body
        className="font-sans antialiased [overflow-wrap:anywhere]"
        style={{ backgroundColor: '#ffffff' }}
      >
        <script dangerouslySetInnerHTML={{ __html: PRE_HYDRATE_THEME }} />
        {children}
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import satori, { init as initSatori } from 'satori/standalone'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import resvgWasmModule from '@resvg/resvg-wasm/index_bg.wasm'
import yogaWasmModule from 'satori/yoga.wasm'
// Inline the TTF bytes into the server bundle at build time. Custom Vite
// plugin (vite.config.ts → `ttfArrayBuffer()`) resolves `?arraybuffer`
// imports to `new Uint8Array([...]).buffer`. Previously we fetched fonts
// over HTTP from the worker's own origin, but CF Workers can't reliably
// fetch their own domain (observed 522s in prod).
import interRegular from '../../assets/fonts/Inter-Regular.ttf?arraybuffer'
import interBold from '../../assets/fonts/Inter-Bold.ttf?arraybuffer'

let engineReady: Promise<void> | null = null
function ensureEngines(): Promise<void> {
  if (!engineReady) {
    engineReady = Promise.all([
      initWasm(resvgWasmModule as unknown as WebAssembly.Module),
      initSatori(yogaWasmModule as unknown as WebAssembly.Module),
    ]).then(() => undefined)
  }
  return engineReady
}

type OgParams = { date: string | null; title: string }

function parseParams(url: URL): OgParams {
  const rawDate = url.searchParams.get('date')
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? '') ? rawDate : null
  const title =
    url.searchParams.get('title') ?? 'Connections Helper: NYT Puzzle Sidekick'
  return { date, title: title.slice(0, 80) }
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${monthNames[m - 1]} ${d}, ${y}`
}

function buildCard({ date, title }: OgParams) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '1200px',
        height: '630px',
        padding: '72px',
        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        color: '#ffffff',
        fontFamily: 'Inter',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              fontSize: '36px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    color: '#22c55e',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '20px',
                    fontSize: '32px',
                  },
                  children: '🧩',
                },
              },
              { type: 'span', props: { children: 'Connections Helper' } },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column' },
            children: [
              ...(date
                ? [
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '40px',
                          fontWeight: 400,
                          opacity: 0.85,
                          marginBottom: '16px',
                        },
                        children: formatDate(date),
                      },
                    },
                  ]
                : []),
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '88px',
                    fontWeight: 700,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.05,
                  },
                  children: title,
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              fontSize: '28px',
              fontWeight: 500,
              opacity: 0.85,
            },
            children: [
              {
                type: 'span',
                props: {
                  children: 'Stuck on a word? Look it up without spoilers.',
                },
              },
              {
                type: 'span',
                props: { children: 'connectionshelper.app' },
              },
            ],
          },
        },
      ],
    },
  }
}

export const Route = createFileRoute('/api/og')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const params = parseParams(url)

          await ensureEngines()

          const svg = await satori(buildCard(params) as never, {
            width: 1200,
            height: 630,
            fonts: [
              {
                name: 'Inter',
                data: interRegular,
                weight: 400,
                style: 'normal',
              },
              {
                name: 'Inter',
                data: interBold,
                weight: 700,
                style: 'normal',
              },
            ],
          })

          const resvg = new Resvg(svg, {
            fitTo: { mode: 'width', value: 1200 },
          })
          const png = resvg.render().asPng()

          return new Response(png as BodyInit, {
            headers: {
              'content-type': 'image/png',
              'cache-control':
                'public, max-age=86400, s-maxage=604800, immutable',
            },
          })
        } catch (err) {
          console.error('[GET /api/og] render error', err)
          const message = err instanceof Error ? err.message : String(err)
          return Response.json(
            { error: 'Failed to render OG image', message },
            { status: 500 },
          )
        }
      },
    },
  },
})

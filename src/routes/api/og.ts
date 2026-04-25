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
import robotoSlabBlack from '../../assets/fonts/RobotoSlab-Black.ttf?arraybuffer'

const NYT_INK = '#121212'
const NYT_BG = '#ffffff'
const BRAND_GREEN = '#22c55e'
const TAGLINE_GREY = '#5a5a5a'

// Lucide-style puzzle icon, stroke-only, brand green. Inlined as a data URL
// so satori can render it via the <img> element (most reliable path for
// arbitrary SVG inside satori).
const PUZZLE_ICON_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="${BRAND_GREEN}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/></svg>`,
)}`

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

type OgParams = { date: string | null }

function parseParams(url: URL): OgParams {
  const rawDate = url.searchParams.get('date')
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? '') ? rawDate : null
  return { date }
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

function buildCard({ date }: OgParams) {
  const subline = date ? formatDate(date) : 'Your puzzle-solving sidekick'
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1200px',
        height: '630px',
        padding: '60px',
        backgroundColor: NYT_BG,
        fontFamily: 'Inter',
      },
      children: [
        {
          type: 'img',
          props: {
            src: PUZZLE_ICON_DATA_URL,
            width: 140,
            height: 140,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontFamily: 'Roboto Slab',
              fontWeight: 900,
              fontSize: '96px',
              color: NYT_INK,
              letterSpacing: '-2px',
              lineHeight: 1.05,
              marginTop: '36px',
              whiteSpace: 'nowrap',
            },
            children: 'Connections Helper',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: '36px',
              color: TAGLINE_GREY,
              marginTop: '20px',
            },
            children: subline,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              marginTop: '36px',
              backgroundColor: NYT_INK,
              color: '#ffffff',
              padding: '22px 44px',
              borderRadius: '14px',
              fontSize: '38px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
            },
            children: [
              {
                type: 'span',
                props: {
                  style: { color: BRAND_GREEN, marginRight: '20px' },
                  children: '→',
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
              {
                name: 'Roboto Slab',
                data: robotoSlabBlack,
                weight: 900,
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

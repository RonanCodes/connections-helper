import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { eq, sql } from 'drizzle-orm'
import { createDb } from '../../db'
import { companions } from '../../db/schema'

// NYT's Connections Companion column uses a separate numbering scheme from
// the puzzle ID, and the URL path date is one day BEFORE the puzzle date
// (companion is published the evening before). Gaps in the companion sequence
// (e.g. skipped days) mean we can't derive the number from puzzle_id alone.
//
// Strategy: scrape https://www.nytimes.com/spotlight/connections-companion,
// which lists ~15 recent companions per page with href + "for {date}" text.
// Cache the full mapping (puzzle_date → companion_number + url_date) in D1.

const SPOTLIGHT_BASE = 'https://www.nytimes.com/spotlight/connections-companion'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6h
const MAX_PAGES = 20 // ~300 days of history

type Entry = {
  puzzleDate: string
  companionNumber: number
  urlDate: string
}

// Parse HTML for companion links + matching puzzle dates.
//
// Spotlight index renders each entry as two sibling nodes:
//   <a href="/YYYY/MM/DD/crosswords/connections-companion-N.html"><h3>…</h3></a>
//   <p>Scroll down for hints and conversation about the puzzle for
//      Thursday, April 23, 2026.</p>
// So the "for {date}" text lives AFTER the closing </a>, not inside it. We
// scan up to 1KB past each href match to find the sibling paragraph.
function parseCompanionPage(html: string): Array<Entry> {
  const out: Array<Entry> = []
  const linkRe =
    /href="\/(\d{4})\/(\d{2})\/(\d{2})\/crosswords\/connections-companion-(\d+)\.html"/g
  const dateRe = /for\s+(?:[A-Za-z]+,\s+)?([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/

  const months: Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  }

  const seen = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(html)) !== null) {
    const [, y, mo, d, num] = m
    const urlDate = `${y}-${mo}-${d}`
    const key = `${urlDate}:${num}`
    if (seen.has(key)) continue
    seen.add(key)

    // Look ahead 1KB past the href for the sibling "for {date}" paragraph.
    const window = html.slice(m.index, m.index + 1024)
    const dm = window.match(dateRe)
    if (!dm) continue
    const monthNum = months[dm[1].toLowerCase()]
    if (!monthNum) continue
    const puzzleDate = `${dm[3]}-${String(monthNum).padStart(2, '0')}-${String(+dm[2]).padStart(2, '0')}`
    out.push({
      puzzleDate,
      companionNumber: +num,
      urlDate,
    })
  }
  return out
}

async function fetchPage(page: number): Promise<string | null> {
  const url = page === 1 ? SPOTLIGHT_BASE : `${SPOTLIGHT_BASE}?page=${page}`
  try {
    const res = await fetch(url, {
      headers: {
        // NYT blocks the default worker UA for some paths; give a real one.
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    })
    if (!res.ok) return null
    return await res.text()
  } catch (err) {
    console.error(`[companion] fetch page=${page}`, err)
    return null
  }
}

function toUrl(entry: Entry): string {
  return `https://www.nytimes.com/${entry.urlDate.replace(/-/g, '/')}/crosswords/connections-companion-${entry.companionNumber}.html`
}

export const Route = createFileRoute('/api/companion/$date')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { date } = params
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return Response.json(
            { error: 'Invalid date format. Use YYYY-MM-DD' },
            { status: 400 },
          )
        }

        const db = createDb(env.DB)

        // Cache hit if we have a fresh record for this puzzle date.
        const cached = await db
          .select()
          .from(companions)
          .where(eq(companions.puzzleDate, date))
          .get()

        const now = Date.now()
        if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
          return Response.json({
            puzzleDate: cached.puzzleDate,
            companionNumber: cached.companionNumber,
            urlDate: cached.urlDate,
            url: toUrl(cached),
            cached: true,
          })
        }

        // Walk spotlight pages until we find the requested date. Each page
        // gives us ~15 entries which we bulk-upsert, amortising the cost.
        for (let page = 1; page <= MAX_PAGES; page++) {
          const html = await fetchPage(page)
          if (!html) break
          const entries = parseCompanionPage(html)
          if (entries.length === 0) break

          await db
            .insert(companions)
            .values(
              entries.map((e) => ({
                puzzleDate: e.puzzleDate,
                companionNumber: e.companionNumber,
                urlDate: e.urlDate,
                fetchedAt: now,
              })),
            )
            .onConflictDoUpdate({
              target: companions.puzzleDate,
              set: {
                companionNumber: sql`excluded.companion_number`,
                urlDate: sql`excluded.url_date`,
                fetchedAt: now,
              },
            })

          const hit = entries.find((e) => e.puzzleDate === date)
          if (hit) {
            return Response.json({
              puzzleDate: hit.puzzleDate,
              companionNumber: hit.companionNumber,
              urlDate: hit.urlDate,
              url: toUrl(hit),
              cached: false,
            })
          }
        }

        return Response.json(
          {
            error: 'No companion found for this date',
            fallback: 'https://www.nytimes.com/spotlight/connections-companion',
          },
          { status: 404 },
        )
      },
    },
  },
})

import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/how-it-works')({ component: HowItWorks })

interface SourceEntry {
  order: number
  icon: string
  name: string
  url?: string
  role: string
  description: string
  coverage: string
  keyRequired?: boolean
}

const SOURCES: SourceEntry[] = [
  {
    order: 1,
    icon: '📘',
    name: 'Merriam-Webster',
    url: 'https://dictionaryapi.com',
    role: 'Primary',
    description:
      'Gold-standard American English dictionary. Clear, authoritative definitions with part-of-speech tags.',
    coverage: 'Excellent for standard English words',
    keyRequired: true,
  },
  {
    order: 2,
    icon: '📖',
    name: 'Free Dictionary API',
    url: 'https://dictionaryapi.dev',
    role: 'Fallback',
    description:
      'Free, unauthenticated dictionary API backed by Wiktionary. No key required; works without setup.',
    coverage: 'Good for common words; thin for niche vocabulary',
  },
  {
    order: 3,
    icon: '🔤',
    name: 'Datamuse',
    url: 'https://www.datamuse.com/api/',
    role: 'Fallback',
    description:
      'Word-finding API with brief gloss-style definitions. Often the only source for compound words ("CROSSBODY") or informal terms.',
    coverage: 'Compound words, rare terms',
  },
  {
    order: 4,
    icon: '🌐',
    name: 'Wikipedia',
    url: 'https://en.wikipedia.org/api/rest_v1/',
    role: 'Fallback',
    description:
      'Article summaries (first two sentences). Only source that covers proper nouns, places, bands, and cultural references.',
    coverage: 'Proper nouns, brands, people, places',
  },
  {
    order: 5,
    icon: '🏙️',
    name: 'Urban Dictionary',
    url: 'https://api.urbandictionary.com/v0/define',
    role: 'Fallback',
    description:
      'Top community definitions sorted by upvotes. Catches slang, memes, and neologisms.',
    coverage: 'Slang, idioms, internet culture',
  },
]

function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to the puzzle
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            How it works
          </h1>
          <p className="text-muted-foreground text-base">
            A look under the hood at where the definitions come from, in what
            order, and what happens behind the scenes.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">What this app does</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every day the New York Times publishes a Connections puzzle: 16
            words that group into four themed categories. This app fetches
            today's puzzle, then looks up a definition for each word so you can
            solve without spoiling yourself. The category names are hidden
            behind a tap so you choose when to peek.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-1">
            Where definitions come from
          </h2>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Each word is looked up in a waterfall: if the top source has no
            entry, the next one is tried. Whichever source returns the
            definition first becomes the label shown on the card.
          </p>

          <div className="space-y-3">
            {SOURCES.map((source) => (
              <Card key={source.order}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base flex items-center gap-2.5">
                      <span className="text-xl">{source.icon}</span>
                      <span>
                        <span className="text-muted-foreground font-normal mr-1.5">
                          #{source.order}
                        </span>
                        {source.name}
                      </span>
                    </CardTitle>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {source.keyRequired && (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-normal"
                        >
                          API key
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-normal"
                      >
                        {source.role}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-xs mt-1.5">
                    {source.coverage}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">
                  {source.description}
                  {source.url && (
                    <div className="mt-2">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground/80 hover:text-foreground transition-colors hover:underline"
                      >
                        {source.url}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Caching</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Definitions are cached in a Cloudflare D1 database for 30 days per
            word. This keeps external APIs from being hit repeatedly for common
            words, and lets the app respond fast even when upstream sources are
            slow or rate-limited. Puzzle data (the NYT JSON for each day) is
            also cached.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Privacy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No account, no tracking cookies beyond the usual analytics (PostHog
            + Sentry for error reporting). Your puzzle selections and theme
            preference are stored locally in your browser. Nothing you do is
            linked to an identity.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Stack</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            TanStack Start (React 19) on Cloudflare Workers with D1 (SQLite) for
            caching. Drizzle ORM for the database layer, Tailwind + shadcn for
            the UI, Radix for primitives. Source available on{' '}
            <a
              href="https://github.com/RonanCodes/connections-helper"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <Github className="w-3 h-3" />
              GitHub
            </a>
            .
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">
            Not affiliated with NYT
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This is an unofficial helper built by a fan. The puzzle content
            belongs to the New York Times; this tool just surfaces definitions
            for the day's words. If you don't already subscribe,{' '}
            <a
              href="https://www.nytimes.com/games/connections"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              play Connections on nytimes.com
            </a>
            .
          </p>
        </section>

        <div className="mt-12">
          <Link to="/">
            <Button variant="outline" className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to the puzzle
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

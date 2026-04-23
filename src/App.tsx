import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  RefreshCw,
  Calendar,
  Sparkles,
  Puzzle,
  Gamepad2,
  Newspaper,
  Share2,
  Copy,
  Check,
  Palette,
  Github,
  Book,
  BookOpen,
  BookText,
  BookMarked,
  Globe,
  Search,
  MessageSquareMore,
  ExternalLink,
  Loader2,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import confetti from 'canvas-confetti'
import { initTheme } from '@/lib/themes'
import { initPostHog } from '@/lib/posthog'
import { initSentry } from '@/lib/sentry'
import { EnvironmentBadge } from '@/lib/env-badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { DatePicker } from './components/DatePicker'
import { SettingsDialog } from './components/SettingsDialog'
import {
  PREFERRED_SOURCE_AUTO,
  getEnabledSources,
  getPreferredSource,
} from '@/lib/user-prefs'

// Easter egg utilities
type Theme =
  | 'default'
  | 'light'
  | 'neubrutalism'
  | 'synthwave'
  | 'geocities'
  | 'nyt'

const THEME_CONFETTI: Record<Theme, string[]> = {
  default: ['#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9'],
  light: ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981'],
  nyt: ['#f9df6d', '#a0c35a', '#b0c4ef', '#ba81c5', '#6aaa64'],
  neubrutalism: ['#facc15', '#a3e635', '#000000', '#ffffff', '#f472b6'],
  synthwave: ['#ff2a6d', '#00d4ff', '#b14aed', '#05ffa1', '#ff79c6'],
  geocities: ['#ffff00', '#00ff00', '#ff00ff', '#00ffff', '#ff0000'],
}

const WIGGLE_CSS = `
@-webkit-keyframes wiggle {
  0%, 90%, 100% { -webkit-transform: rotate(0deg); transform: rotate(0deg); }
  92% { -webkit-transform: rotate(-4deg); transform: rotate(-4deg); }
  94% { -webkit-transform: rotate(4deg); transform: rotate(4deg); }
  96% { -webkit-transform: rotate(-2deg); transform: rotate(-2deg); }
  98% { -webkit-transform: rotate(2deg); transform: rotate(2deg); }
}
@keyframes wiggle {
  0%, 90%, 100% { -webkit-transform: rotate(0deg); transform: rotate(0deg); }
  92% { -webkit-transform: rotate(-4deg); transform: rotate(-4deg); }
  94% { -webkit-transform: rotate(4deg); transform: rotate(4deg); }
  96% { -webkit-transform: rotate(-2deg); transform: rotate(-2deg); }
  98% { -webkit-transform: rotate(2deg); transform: rotate(2deg); }
}
@-webkit-keyframes squish {
  0% { -webkit-transform: scale(1); transform: scale(1); }
  40% { -webkit-transform: scale(0.92); transform: scale(0.92); }
  100% { -webkit-transform: scale(1); transform: scale(1); }
}
@keyframes squish {
  0% { -webkit-transform: scale(1); transform: scale(1); }
  40% { -webkit-transform: scale(0.92); transform: scale(0.92); }
  100% { -webkit-transform: scale(1); transform: scale(1); }
}
.wiggle-occasional {
  -webkit-animation: wiggle 6s ease-in-out infinite;
  animation: wiggle 6s ease-in-out infinite;
  -webkit-transform-origin: center center;
  transform-origin: center center;
}
.wiggle-off {
  -webkit-animation: none;
  animation: none;
}
.bounce-click {
  -webkit-animation: squish 0.15s ease-out;
  animation: squish 0.15s ease-out;
}
`

function fireConfetti() {
  const theme = (document.documentElement.getAttribute('data-theme') ??
    'light') as Theme
  const colors = THEME_CONFETTI[theme]

  confetti({ particleCount: 150, spread: 100, origin: { y: 0.3 }, colors })
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    })
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    })
  }, 200)

  // Synthwave extra sparkle
  if (theme === 'synthwave') {
    setTimeout(() => {
      confetti({
        particleCount: 30,
        spread: 360,
        startVelocity: 20,
        gravity: 0.5,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#ff2a6d', '#00d4ff'],
        shapes: ['star'],
        scalar: 1.5,
      })
    }, 400)
  }
}

interface SingleDefinition {
  definition: string
  partOfSpeech?: string
  source?: string
}

type SourceInfo = {
  Icon: LucideIcon
  label: string
  color: string
  url?: string
  fetchKey?: string
  faviconDomain?: string
}

const SOURCE_INFO: Record<string, SourceInfo> = {
  'merriam-webster': {
    Icon: BookOpen,
    label: 'Merriam-Webster',
    color: 'text-blue-600',
    url: 'https://www.merriam-webster.com/dictionary/{word}',
    fetchKey: 'merriam-webster',
    faviconDomain: 'merriam-webster.com',
  },
  wordnik: {
    Icon: BookText,
    label: 'Wordnik',
    color: 'text-emerald-600',
    url: 'https://www.wordnik.com/words/{word}',
    fetchKey: 'wordnik',
    faviconDomain: 'wordnik.com',
  },
  dictionary: {
    Icon: Book,
    label: 'Wiktionary',
    color: 'text-green-500',
    url: 'https://en.wiktionary.org/wiki/{word}',
    fetchKey: 'dictionary',
    faviconDomain: 'wiktionary.org',
  },
  dictionarycom: {
    Icon: BookMarked,
    label: 'Dictionary.com',
    color: 'text-teal-500',
    url: 'https://www.dictionary.com/browse/{word}',
    faviconDomain: 'dictionary.com',
  },
  datamuse: {
    Icon: Search,
    label: 'Datamuse',
    color: 'text-sky-500',
    fetchKey: 'datamuse',
    faviconDomain: 'datamuse.com',
  },
  wikipedia: {
    Icon: Globe,
    label: 'Wikipedia',
    color: 'text-slate-500',
    url: 'https://en.wikipedia.org/wiki/{word}',
    fetchKey: 'wikipedia',
    faviconDomain: 'wikipedia.org',
  },
  urban: {
    Icon: MessageSquareMore,
    label: 'Urban Dictionary',
    color: 'text-orange-500',
    url: 'https://www.urbandictionary.com/define.php?term={word}',
    fetchKey: 'urban',
    faviconDomain: 'urbandictionary.com',
  },
}

function SourceIcon({
  info,
  className,
}: {
  info: SourceInfo
  className?: string
}) {
  const { Icon, faviconDomain, label } = info
  const [errored, setErrored] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (!faviconDomain || errored) {
    return <Icon className={className} />
  }

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <Icon
        className={cn(
          'absolute inset-0 w-full h-full transition-opacity',
          loaded ? 'opacity-0' : 'opacity-100',
        )}
      />
      <img
        src={`https://icons.duckduckgo.com/ip3/${faviconDomain}.ico`}
        alt={label}
        loading="lazy"
        className={cn(
          'w-full h-full object-contain transition-opacity',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </span>
  )
}

// Wordnik is temporarily hidden until the API key is provisioned — without the
// key, the endpoint always returns null and confuses users who click it.
const SWAPPABLE_SOURCE_KEYS = [
  'merriam-webster',
  'dictionary',
  'datamuse',
  'wikipedia',
  'urban',
] as const

// NYT puzzle words are ALL CAPS, but some sources need specific casing:
// - Wikipedia article titles are case-sensitive (Hobo ✓, HOBO ✗) and use underscores for spaces
// - Dictionary.com uses lowercase + hyphens for multi-word entries
// - Urban Dictionary is case-insensitive
function buildSourceUrl(sourceKey: string, word: string): string | undefined {
  const info = SOURCE_INFO[sourceKey] as
    | (typeof SOURCE_INFO)[keyof typeof SOURCE_INFO]
    | undefined
  if (!info?.url) return undefined
  const lower = word.toLowerCase()
  let slug = lower
  if (sourceKey === 'wikipedia') {
    slug = (lower.charAt(0).toUpperCase() + lower.slice(1)).replace(/ /g, '_')
  } else if (sourceKey === 'dictionary' || sourceKey === 'datamuse') {
    // Wiktionary: lowercase + underscores for spaces (canonical for common words).
    slug = lower.replace(/ /g, '_')
  } else if (sourceKey === 'dictionarycom' || sourceKey === 'wordnik') {
    slug = lower.replace(/ /g, '-')
  }
  return info.url.replace('{word}', encodeURIComponent(slug))
}

interface WordDefinition {
  word: string
  definitions: SingleDefinition[]
  loading?: boolean
  categoryIndex?: number // Which category (0-3) this word belongs to
  position?: number // Grid position from NYT (0-15)
  imageUrl?: string // For shape/image puzzles (SVG cards)
  imageAltText?: string // Alt text for image cards
}

interface NYTCard {
  content?: string
  position: number
  image_url?: string
  image_alt_text?: string
}

interface NYTPuzzle {
  id: number
  print_date: string
  categories: {
    title: string
    cards: NYTCard[]
  }[]
}

const FIRST_PUZZLE_DATE = '2023-06-12'
const getToday = () => new Date().toISOString().split('T')[0]

// NYT's "Connections Companion" column URL format:
//   /YYYY/MM/DD/crosswords/connections-companion-{puzzleId}.html
// Works from ~puzzle #60 onwards (column started late 2023). Older puzzles
// 404 on this path; users can fall back to /spotlight/connections-companion.
function getCompanionUrl(date: string, puzzleId: number): string {
  const [y, m, d] = date.split('-')
  return `https://www.nytimes.com/${y}/${m}/${d}/crosswords/connections-companion-${puzzleId}.html`
}

// NYT category colors
const CATEGORY_COLORS = [
  'bg-yellow-400 text-yellow-950 border-yellow-500',
  'bg-green-400 text-green-950 border-green-500',
  'bg-blue-400 text-blue-950 border-blue-500',
  'bg-purple-400 text-purple-950 border-purple-500',
]

function getSavedDate(): string | null {
  return localStorage.getItem('connections-date')
}

function saveDate(date: string) {
  localStorage.setItem('connections-date', date)
}

async function fetchPuzzle(date: string): Promise<NYTPuzzle | null> {
  try {
    const res = await fetch(`/api/puzzle/${date}`)
    if (!res.ok) throw new Error('Puzzle not found')
    return await res.json()
  } catch {
    return null
  }
}

async function fetchDefinitionsBatch(
  words: string[],
): Promise<Record<string, { definitions: SingleDefinition[] }>> {
  // Filter out null/undefined/empty words (e.g. image-based puzzle cards with no text content)
  const validWords = words.filter(
    (w) => w && typeof w === 'string' && w.trim().length > 0,
  )
  if (validWords.length === 0) return {}

  try {
    const res = await fetch('/api/definitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words: validWords }),
    })
    if (!res.ok) throw new Error('Failed to fetch definitions')
    const data = await res.json()
    return data.definitions || {}
  } catch {
    // Return empty definitions on error
    return Object.fromEntries(
      validWords.map((w) => [
        w.toLowerCase(),
        { definitions: [{ definition: 'Failed to fetch definition' }] },
      ]),
    )
  }
}

function SkeletonWordCard({ index }: { index: number }) {
  return (
    <Card
      className={cn(
        'h-full flex flex-col gap-2',
        'animate-in fade-in slide-in-from-bottom-2',
      )}
      style={{
        animationDelay: `${index * 30}ms`,
        animationFillMode: 'backwards',
      }}
    >
      <CardHeader className="pb-0">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col items-start gap-1">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-14 rounded-md" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Skeleton className="h-10 w-[72px] rounded-md" />
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-md" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow">
        <div className="space-y-2 flex-grow">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
    </Card>
  )
}

function DefinitionLines({ text }: { text: string }) {
  const usageNoteKeywords =
    /\s+[—–-]\s*(?=(?:often|usually|sometimes|chiefly|now|used|always|mostly|also|formerly|originally|esp\.?|specif\.?)\b)/i
  const parts = text.split(usageNoteKeywords)
  const mainText = parts[0]
  const notes = parts.slice(1)

  const senses = mainText.split(/;\s+/).filter(Boolean)
  const labelPrefix =
    /^(especially|specifically|also|broadly|chiefly|usually|often|sometimes|esp\.?|specif\.?)\s*:\s*(.+)$/i

  return (
    <div className="space-y-1">
      {senses.map((sense, i) => {
        const trimmed = sense.trim()
        const match = trimmed.match(labelPrefix)
        return (
          <div key={i} className="leading-relaxed">
            {match ? (
              <>
                <span className="italic text-muted-foreground/80 mr-1">
                  {match[1].toLowerCase()}:
                </span>
                {match[2]}
              </>
            ) : (
              trimmed
            )}
          </div>
        )
      })}
      {notes.map((note, i) => (
        <div
          key={`n-${i}`}
          className="text-xs italic text-muted-foreground/75 leading-relaxed pl-3 border-l-2 border-border/40"
        >
          {note.trim()}
        </div>
      ))}
    </div>
  )
}

function WordCard({
  word,
  index,
  showHints,
}: {
  word: WordDefinition
  index: number
  showHints?: boolean
}) {
  const [showColor, setShowColor] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const categoryIndex = word.categoryIndex ?? 0

  const originalDefinitions = word.definitions
  const originalSource = originalDefinitions[0]?.source || 'dictionary'
  const [activeSource, setActiveSource] = useState<string>(originalSource)
  const [sourceCache, setSourceCache] = useState<
    Record<string, SingleDefinition[]>
  >({ [originalSource]: originalDefinitions })
  const [sourceLoading, setSourceLoading] = useState<string | null>(null)
  const [manualSwap, setManualSwap] = useState(false)
  const [preferredSource, setPreferredSourceState] = useState<string>(() =>
    getPreferredSource(),
  )
  const [enabledSources, setEnabledSourcesState] = useState<Set<string>>(() =>
    getEnabledSources(SWAPPABLE_SOURCE_KEYS),
  )

  useEffect(() => {
    setActiveSource(originalSource)
    setSourceCache({ [originalSource]: originalDefinitions })
    setExpanded(false)
    setSourceLoading(null)
    setManualSwap(false)
  }, [originalSource, originalDefinitions])

  useEffect(() => {
    const onPref = () => setPreferredSourceState(getPreferredSource())
    const onEnabled = () =>
      setEnabledSourcesState(getEnabledSources(SWAPPABLE_SOURCE_KEYS))
    window.addEventListener('ch-preferred-source-change', onPref)
    window.addEventListener('ch-enabled-sources-change', onEnabled)
    return () => {
      window.removeEventListener('ch-preferred-source-change', onPref)
      window.removeEventListener('ch-enabled-sources-change', onEnabled)
    }
  }, [])

  // Auto-swap to the user's preferred primary source when it differs from the
  // current active source. Skipped if the user has manually picked a source on
  // this card — their choice wins. Only commits the swap if the preferred
  // source actually returned definitions.
  useEffect(() => {
    const cancelled = { current: false }
    if (manualSwap || word.loading) return
    if (
      preferredSource === PREFERRED_SOURCE_AUTO ||
      preferredSource === activeSource
    ) {
      return
    }
    if (!(preferredSource in SOURCE_INFO)) return
    const pref = preferredSource
    if (pref in sourceCache) {
      setActiveSource(pref)
      return
    }
    ;(async () => {
      try {
        const res = await fetch(
          `/api/definition/${encodeURIComponent(word.word)}?source=${encodeURIComponent(pref)}`,
        )
        if (!res.ok || cancelled.current) return
        const data = await res.json()
        if (!data.definitions || data.definitions.length === 0) return
        const defs: SingleDefinition[] = data.definitions.map((d) => ({
          ...d,
          source: pref,
        }))
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- set by cleanup lambda; flow analysis misses it
        if (cancelled.current) return
        setSourceCache((prev) => ({ ...prev, [pref]: defs }))
        setActiveSource(pref)
      } catch {
        // Preferred source failed — silently fall back to current result.
      }
    })()
    return () => {
      cancelled.current = true
    }
  }, [word.word, word.loading, preferredSource, manualSwap, activeSource])

  const activeDefinitions: SingleDefinition[] =
    sourceCache[activeSource] ?? originalDefinitions
  const primaryDef = activeDefinitions.at(0) ?? originalDefinitions.at(0)
  const hasMore = activeDefinitions.length > 1

  async function switchSource(sourceKey: string) {
    if (sourceKey === activeSource) return
    setManualSwap(true)
    if (sourceKey in sourceCache) {
      setActiveSource(sourceKey)
      setExpanded(false)
      return
    }
    setSourceLoading(sourceKey)
    try {
      const res = await fetch(
        `/api/definition/${encodeURIComponent(word.word)}?source=${encodeURIComponent(sourceKey)}`,
      )
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      const defs: SingleDefinition[] =
        data.definitions && data.definitions.length > 0
          ? data.definitions.map((d) => ({ ...d, source: sourceKey }))
          : [
              {
                definition: `No entry on ${SOURCE_INFO[sourceKey].label}.`,
                source: sourceKey,
              },
            ]
      setSourceCache((prev) => ({ ...prev, [sourceKey]: defs }))
      setActiveSource(sourceKey)
      setExpanded(false)
    } catch (err) {
      console.error('Failed to switch source', err)
    } finally {
      setSourceLoading(null)
    }
  }

  return (
    <Card
      className={cn(
        'transition-shadow duration-150 md:hover:shadow-md',
        'animate-in fade-in slide-in-from-bottom-2',
        'h-full flex flex-col gap-2',
        showColor && CATEGORY_COLORS[categoryIndex],
      )}
      style={{
        animationDelay: `${index * 30}ms`,
        animationFillMode: 'backwards',
      }}
    >
      <CardHeader className="pb-0 relative">
        {showHints && word.categoryIndex !== undefined && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowColor(!showColor)
            }}
            aria-pressed={showColor}
            className={cn(
              'absolute top-0 right-6 p-1.5 rounded-md border z-10',
              'transition-colors duration-150 active:translate-y-px',
              'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              showColor
                ? 'bg-foreground/10 border-foreground/30 hover:bg-foreground/15 active:bg-foreground/20'
                : 'bg-muted/50 border-border hover:bg-muted active:bg-muted/80',
            )}
            title={showColor ? 'Hide color' : 'Reveal category color'}
          >
            {showColor ? (
              <div
                className={cn(
                  'w-4 h-4 rounded-sm transition-all duration-500',
                  CATEGORY_COLORS[categoryIndex].split(' ')[0],
                  'animate-in zoom-in-50',
                )}
              />
            ) : (
              <Palette className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
        <div className="flex flex-col gap-2">
          <div className="min-w-0 flex flex-col items-start text-left pr-10">
            {word.imageUrl ? (
              <CardTitle className="text-lg flex items-center gap-2">
                <img
                  src={word.imageUrl}
                  alt={word.imageAltText || word.word}
                  className="w-8 h-8"
                />
                <span className="uppercase tracking-wide text-sm truncate">
                  {word.imageAltText || word.word}
                </span>
              </CardTitle>
            ) : (
              <CardTitle className="text-lg uppercase tracking-wide truncate">
                {word.word}
              </CardTitle>
            )}
            {primaryDef?.partOfSpeech && !word.loading && (
              <Badge
                variant="secondary"
                className="text-xs font-normal mt-1 lowercase pl-0"
              >
                {primaryDef.partOfSpeech}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {!word.loading &&
              SWAPPABLE_SOURCE_KEYS.filter(
                (k) => enabledSources.has(k) || k === activeSource,
              )
                .sort((a, b) => {
                  if (a === preferredSource) return -1
                  if (b === preferredSource) return 1
                  return 0
                })
                .map((key) => {
                  const info = SOURCE_INFO[key]
                  const isActive = key === activeSource
                  const isLoading = sourceLoading === key

                  if (isActive) {
                    const url = buildSourceUrl(key, word.word)
                    return (
                      <Tooltip key={key}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'inline-flex items-center h-10 rounded-md border overflow-hidden text-xs',
                              'bg-foreground/5 border-foreground/30',
                              info.color,
                            )}
                          >
                            <span className="inline-flex items-center justify-center px-2.5 h-full">
                              <SourceIcon info={info} className="w-5 h-5" />
                            </span>
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Open ${info.label} for "${word.word}" in a new tab`}
                                className="inline-flex items-center justify-center h-full px-2 border-l border-foreground/20 text-foreground/70 hover:text-foreground hover:bg-foreground/10 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">{info.label}</TooltipContent>
                      </Tooltip>
                    )
                  }

                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon-lg"
                          onClick={(e) => {
                            e.stopPropagation()
                            void switchSource(key)
                          }}
                          disabled={isLoading}
                          aria-label={`Switch to ${info.label}`}
                          className="border-border/40 text-muted-foreground hover:text-foreground disabled:cursor-wait"
                        >
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <SourceIcon info={info} className="w-5 h-5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Try {info.label}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow">
        {word.loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <div className="flex flex-col h-full gap-3">
            {/* Primary definition - grows to fill space */}
            <CardDescription
              className={cn(
                'text-sm leading-relaxed flex-grow',
                showColor && 'text-current opacity-90',
              )}
            >
              {primaryDef?.definition ? (
                <DefinitionLines text={primaryDef.definition} />
              ) : (
                'No definition found'
              )}
            </CardDescription>

            {/* Expandable additional definitions */}
            {hasMore && expanded && (
              <div className="space-y-2 pt-2 border-t border-border/50 animate-in slide-in-from-top-2 max-h-48 overflow-y-auto">
                {activeDefinitions.slice(1).map((def, i) => (
                  <div key={i} className="text-sm">
                    <CardDescription
                      className={cn(
                        'leading-relaxed',
                        showColor && 'text-current opacity-90',
                      )}
                    >
                      {def.partOfSpeech &&
                        def.partOfSpeech !== primaryDef?.partOfSpeech && (
                          <Badge
                            variant="outline"
                            className="text-xs font-normal mr-1.5 mb-1 align-middle"
                          >
                            {def.partOfSpeech}
                          </Badge>
                        )}
                      <DefinitionLines text={def.definition} />
                    </CardDescription>
                  </div>
                ))}
              </div>
            )}

            {/* More definitions button - always at bottom */}
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                aria-pressed={expanded}
                className={cn(
                  'w-full mt-auto text-xs',
                  expanded &&
                    'bg-primary/10 text-primary border-primary/30 hover:bg-primary/15 active:bg-primary/20',
                )}
              >
                {expanded ? (
                  <>Less</>
                ) : (
                  <>
                    {activeDefinitions.length - 1} more definition
                    {activeDefinitions.length > 2 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Get unlock key for current date
function getUnlockKey(date: string) {
  return `connections-unlocked-${date}`
}

// Streak tracking for Easter egg
function ShareButton({
  puzzleId,
  puzzleDate,
}: {
  puzzleId: number | null
  puzzleDate: string
}) {
  const [copied, setCopied] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}?date=${puzzleDate}`
      : ''
  const shareText = puzzleId
    ? `Check out NYT Connections #${puzzleId} - can you solve it?`
    : `Check out today's NYT Connections puzzle!`

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    setTimeout(() => document.addEventListener('click', handleClick), 0)
    return () => document.removeEventListener('click', handleClick)
  }, [showMenu])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleNativeShare = async () => {
    if ('share' in navigator) {
      try {
        await navigator.share({
          title: 'Connections Helper',
          text: shareText,
          url: shareUrl,
        })
      } catch {
        // User cancelled or error
      }
    }
    setShowMenu(false)
  }

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
      '_blank',
    )
    setShowMenu(false)
  }

  return (
    <div ref={menuRef} className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setShowMenu(!showMenu)}
        aria-label="Share"
        title="Share"
      >
        <Share2 className="w-4 h-4" />
      </Button>

      {showMenu && (
        <div className="absolute top-full right-0 mt-2 z-50 min-w-[180px] rounded-lg p-1 shadow-lg bg-popover text-popover-foreground border border-border">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNativeShare}
              className="w-full justify-start"
            >
              <Share2 className="w-4 h-4" />
              Share...
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleWhatsApp}
            className="w-full justify-start"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="w-full justify-start"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
        </div>
      )}
    </div>
  )
}

function CategoryHints({ hints, show }: { hints: string[]; show: boolean }) {
  const [revealedCards, setRevealedCards] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ])
  const [showColors, setShowColors] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ])

  if (!show || hints.length === 0) return null

  const toggleCard = (index: number) => {
    setRevealedCards((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  const toggleColor = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setShowColors((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  return (
    <Card className="mb-6 overflow-hidden">
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Tap cards to reveal categories
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {hints.map((hint, i) => (
            <div
              key={i}
              onClick={() => toggleCard(i)}
              className={cn(
                'relative cursor-pointer select-none px-2 py-2 rounded-lg font-semibold text-center text-[10px] border-2 transition-all duration-300 min-h-[52px] overflow-hidden',
                revealedCards[i]
                  ? showColors[i]
                    ? CATEGORY_COLORS[i]
                    : 'bg-card text-foreground border-border'
                  : 'bg-muted border-border text-muted-foreground hover:bg-muted/80',
              )}
            >
              {revealedCards[i] ? (
                <div className="flex items-center justify-center gap-1 h-full">
                  <span
                    className="flex-1 leading-tight break-words hyphens-auto"
                    style={{ wordBreak: 'break-word' }}
                  >
                    {hint}
                  </span>
                  <button
                    onClick={(e) => toggleColor(i, e)}
                    aria-pressed={showColors[i]}
                    className={cn(
                      'flex-shrink-0 p-1.5 rounded-md border',
                      'transition-colors duration-150 active:translate-y-px',
                      'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      showColors[i]
                        ? 'bg-foreground/10 border-foreground/30 hover:bg-foreground/15 active:bg-foreground/20'
                        : 'bg-muted/50 border-border hover:bg-muted active:bg-muted/80',
                    )}
                    title={showColors[i] ? 'Hide color' : 'Reveal color hint'}
                  >
                    {showColors[i] ? (
                      <div
                        className={cn(
                          'w-4 h-4 rounded-sm',
                          CATEGORY_COLORS[i].split(' ')[0],
                        )}
                      />
                    ) : (
                      <Palette className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              ) : (
                <span className="text-lg">?</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Flip card component for classic mode
function FlipCard({
  word,
  isFlipped,
  onFlip,
}: {
  word: WordDefinition
  isFlipped: boolean
  onFlip: () => void
}) {
  return (
    <div
      className="aspect-square cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={onFlip}
    >
      <div
        className={cn(
          'relative w-full h-full transition-transform duration-500',
          'transform-style-preserve-3d',
        )}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.5s ease-in-out',
        }}
      >
        {/* Front - Word */}
        <div
          className={cn(
            'absolute inset-0 rounded-lg font-bold p-1.5',
            'flex items-center justify-center text-center uppercase',
            'bg-muted border-2 border-border',
            'text-[0.65rem] sm:text-xs md:text-sm',
            'overflow-hidden break-words leading-tight',
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {word.imageUrl ? (
            <img
              src={word.imageUrl}
              alt={word.imageAltText || word.word}
              className="w-8 h-8"
            />
          ) : (
            <span className="line-clamp-2">{word.word}</span>
          )}
        </div>
        {/* Back - Definition with word at top */}
        <div
          className={cn(
            'absolute inset-0 rounded-lg p-1.5',
            'flex flex-col text-center',
            'bg-primary text-primary-foreground border-2 border-primary',
            'overflow-hidden',
          )}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* Word at top, faded */}
          <span className="text-[0.5rem] sm:text-[0.55rem] uppercase font-semibold opacity-60 mb-0.5 shrink-0">
            {word.word}
          </span>
          {/* Definition - larger, centered */}
          <span className="flex-1 flex items-center justify-center text-[0.55rem] sm:text-[0.65rem] md:text-xs leading-snug line-clamp-4">
            {word.definitions[0]?.definition || 'No definition'}
          </span>
        </div>
      </div>
    </div>
  )
}

// Classic mode grid (NYT-style 4x4 layout - display only, no game mechanics)
function ClassicGrid({ words }: { words: WordDefinition[] }) {
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())

  const toggleFlip = (wordText: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev)
      if (next.has(wordText)) {
        next.delete(wordText)
      } else {
        next.add(wordText)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* 4x4 Grid - tap to flip */}
      <div className="grid grid-cols-4 gap-2">
        {words.map((word) => (
          <FlipCard
            key={word.word}
            word={word}
            isFlipped={flippedCards.has(word.word)}
            onFlip={() => toggleFlip(word.word)}
          />
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Tap cards to flip and see definitions
      </p>
    </div>
  )
}

export default function App() {
  const [words, setWords] = useState<WordDefinition[]>([])
  const [categoryHints, setCategoryHints] = useState<string[]>([])
  const [loadingPuzzle, setLoadingPuzzle] = useState(true)
  const [hasSearched, setHasSearched] = useState(false)
  const [puzzleDate, setPuzzleDate] = useState<string>(
    getSavedDate() || getToday(),
  )
  const [puzzleId, setPuzzleId] = useState<number | null>(null)
  const [showHints, setShowHints] = useState(false)
  // TODO: Restore view mode toggle after fixing @bendr/themes
  const [viewMode] = useState<'helper' | 'classic'>('helper')
  const [error, setError] = useState<string | null>(null)
  const [rainbowMode, setRainbowMode] = useState(false)
  const [wiggleDisabled, setWiggleDisabled] = useState(
    () => localStorage.getItem('connections-wiggle-seen') === 'true',
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const navigate = useNavigate()
  const clickCountRef = useRef(0)
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const puzzleIconRef = useRef<SVGSVGElement>(null)

  // Easter egg: Click puzzle icon 7 times for rainbow mode
  const handlePuzzleClick = () => {
    // Disable wiggle after first interaction
    if (!wiggleDisabled) {
      setWiggleDisabled(true)
      localStorage.setItem('connections-wiggle-seen', 'true')
    }

    // Add bounce animation
    if (puzzleIconRef.current) {
      puzzleIconRef.current.classList.remove('bounce-click')
      // Force reflow to restart animation
      void puzzleIconRef.current.getBoundingClientRect()
      puzzleIconRef.current.classList.add('bounce-click')
    }

    clickCountRef.current += 1

    // Reset count after 2 seconds of no clicks
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current)
    clickTimeoutRef.current = setTimeout(() => {
      clickCountRef.current = 0
    }, 2000)

    if (clickCountRef.current >= 7) {
      clickCountRef.current = 0
      setRainbowMode((prev) => !prev)

      // Fire theme-aware confetti!
      fireConfetti()
    }
  }

  useEffect(() => {
    // Inject wiggle CSS for Easter egg hint
    const styleId = 'easter-egg-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = WIGGLE_CSS
      document.head.appendChild(style)
    }

    // Set NYT as default theme for this app if no theme saved
    if (!localStorage.getItem('sl-theme')) {
      localStorage.setItem('sl-theme', 'nyt')
    }
    initTheme()
    initSentry()
    initPostHog()
    loadPuzzle(puzzleDate)
  }, [])

  const loadPuzzle = async (date: string) => {
    setLoadingPuzzle(true)
    setError(null)
    setHasSearched(false)
    setWords([])
    setCategoryHints([])
    setShowHints(false)

    const puzzle = await fetchPuzzle(date)

    if (puzzle) {
      setPuzzleDate(puzzle.print_date)
      setPuzzleId(puzzle.id)

      const allWords: WordDefinition[] = []
      const hints: string[] = []

      puzzle.categories.forEach((cat, categoryIndex) => {
        hints.push(cat.title)
        cat.cards.forEach((card) => {
          // Support both text cards (content) and image cards (image_url + image_alt_text)
          const displayWord = card.content || card.image_alt_text || ''
          allWords.push({
            word: displayWord,
            definitions: [],
            loading: true,
            categoryIndex,
            position: card.position,
            imageUrl: card.image_url,
            imageAltText: card.image_alt_text,
          })
        })
      })

      // Sort by position to match NYT grid order (not random)
      const sorted = [...allWords].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
      )
      setCategoryHints(hints)
      setWords(sorted)
      setHasSearched(true)

      // For image-based puzzles, use alt text for definitions lookup
      // Skip definitions for cards that are purely visual (no meaningful text)
      const isImagePuzzle = sorted.some((w) => w.imageUrl)
      const wordList = sorted.map((w) => w.word).filter(Boolean)
      const definitions: Record<string, { definitions: SingleDefinition[] }> =
        isImagePuzzle ? {} : await fetchDefinitionsBatch(wordList)

      setWords(
        sorted.map((word) => {
          const key = word.word.toLowerCase()
          const defs = definitions[key] as
            | { definitions: SingleDefinition[] }
            | undefined
          const fallback: Array<SingleDefinition> = isImagePuzzle
            ? [
                {
                  definition: word.imageAltText
                    ? `Shape: ${word.imageAltText}`
                    : 'Visual element',
                },
              ]
            : []
          return {
            ...word,
            ...defs,
            definitions: defs?.definitions ?? fallback,
            loading: false,
          }
        }),
      )
    } else {
      setError('Puzzle not found for this date')
    }

    setLoadingPuzzle(false)
  }

  const handleDateChange = (newDate: string) => {
    setPuzzleDate(newDate)
    saveDate(newDate)
    loadPuzzle(newDate)
  }

  const goToPreviousDay = () => {
    const current = new Date(puzzleDate)
    current.setDate(current.getDate() - 1)
    const newDate = current.toISOString().split('T')[0]
    if (newDate >= FIRST_PUZZLE_DATE) handleDateChange(newDate)
  }

  const goToNextDay = () => {
    const current = new Date(puzzleDate)
    current.setDate(current.getDate() + 1)
    const newDate = current.toISOString().split('T')[0]
    if (newDate <= getToday()) handleDateChange(newDate)
  }

  const isToday = puzzleDate === getToday()
  const isFirstDay = puzzleDate <= FIRST_PUZZLE_DATE
  const loadingDefinitions = words.some((w) => w.loading)

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background transition-colors">
        <div className="fixed top-3 left-3 z-50 pointer-events-none">
          <div className="pointer-events-auto">
            <EnvironmentBadge showExternal={false} />
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-5 sm:px-6 md:px-8 py-6 md:py-10">
          {/* Header */}
          <header className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
              <Puzzle
                ref={puzzleIconRef}
                className={cn(
                  // design-system:allow — easter-egg delight, not a state indicator
                  'w-8 h-8 flex-shrink-0 cursor-pointer transition-all hover:scale-110 select-none',
                  wiggleDisabled ? '' : 'wiggle-occasional',
                  rainbowMode ? 'rainbow-icon' : 'text-green-500',
                )}
                onClick={handlePuzzleClick}
              />
              <span className={cn(rainbowMode ? 'rainbow-text' : '')}>
                Connections Helper
              </span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Your puzzle-solving sidekick
            </p>
          </header>

          <SettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            sources={SWAPPABLE_SOURCE_KEYS.map((key) => ({
              key,
              label: SOURCE_INFO[key].label,
              description: '',
              faviconDomain: SOURCE_INFO[key].faviconDomain,
            }))}
          />

          {/* Date Navigation */}
          <Card className="mb-4 py-2">
            <CardContent>
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={goToPreviousDay}
                      disabled={isFirstDay || loadingPuzzle}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous day</TooltipContent>
                </Tooltip>

                <div className="flex-1 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                  <DatePicker
                    value={puzzleDate}
                    onChange={handleDateChange}
                    min={FIRST_PUZZLE_DATE}
                    max={getToday()}
                  />
                  {puzzleId && (
                    <a
                      href={getCompanionUrl(puzzleDate, puzzleId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Read NYT's Connections Companion for this puzzle"
                      className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors hidden sm:inline"
                    >
                      #{puzzleId}
                    </a>
                  )}
                  <Button
                    onClick={() => handleDateChange(getToday())}
                    size="sm"
                    variant="outline"
                    disabled={isToday}
                  >
                    <Calendar className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Today</span>
                  </Button>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={goToNextDay}
                      disabled={isToday || loadingPuzzle}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next day</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          {/* Actions row: Unlock/Lock Hints on the left when a puzzle is loaded; Settings + Share on the right */}
          <div className="flex items-center justify-between gap-2 mb-4 min-h-9">
            {hasSearched && words.length > 0 && !loadingPuzzle ? (
              <Button
                variant="outline"
                size="sm"
                aria-pressed={showHints}
                onClick={() => {
                  if (showHints) {
                    setShowHints(false)
                  } else {
                    localStorage.setItem(getUnlockKey(puzzleDate), 'true')
                    setShowHints(true)
                  }
                }}
                className={cn(
                  showHints &&
                    'bg-primary/10 text-primary border-primary/30 hover:bg-primary/15 active:bg-primary/20',
                )}
              >
                {showHints ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" /> Lock Hints
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" /> Unlock Hints
                  </>
                )}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild>
                    <a
                      href="https://www.nytimes.com/games/connections"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Play today's puzzle on NYT"
                    >
                      <Gamepad2 className="w-4 h-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Play on NYT</TooltipContent>
              </Tooltip>
              {puzzleId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" asChild>
                      <a
                        href={getCompanionUrl(puzzleDate, puzzleId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Read NYT's Connections Companion for #${puzzleId}`}
                      >
                        <Newspaper className="w-4 h-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Companion for #{puzzleId}</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (
                        typeof window !== 'undefined' &&
                        window.matchMedia('(max-width: 640px)').matches
                      ) {
                        void navigate({ to: '/settings' })
                      } else {
                        setSettingsOpen(true)
                      }
                    }}
                    aria-label="Open settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
              <ShareButton puzzleId={puzzleId} puzzleDate={puzzleDate} />
            </div>
          </div>

          {/* Loading State: skeleton grid matching the real layout */}
          {loadingPuzzle && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 16 }).map((_, i) => (
                <SkeletonWordCard key={i} index={i} />
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !loadingPuzzle && (
            <Card className="text-center py-16">
              <CardContent>
                <div className="text-6xl mb-4">😕</div>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button onClick={() => handleDateChange(getToday())}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Load Today's Puzzle
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {hasSearched && words.length > 0 && !loadingPuzzle && (
            <>
              {/* Category Hints - only in helper mode */}
              {viewMode === 'helper' && (
                <CategoryHints hints={categoryHints} show={showHints} />
              )}

              {/* View Mode Content */}
              {viewMode === 'helper' ? (
                /* Helper Mode - Word Cards with Definitions */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {words.map((word, i) => (
                    <WordCard
                      key={word.word}
                      word={word}
                      index={i}
                      showHints={showHints}
                    />
                  ))}
                </div>
              ) : (
                /* Classic Mode - 4x4 Grid */
                <ClassicGrid words={words} />
              )}
            </>
          )}

          {/* Footer */}
          <footer className="mt-12 text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              Made by{' '}
              <a
                href="https://ronanconnolly.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                Ronan Connolly
              </a>{' '}
              •{' '}
              <a
                href="https://github.com/RonanCodes/connections-helper"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                <Github className="w-3 h-3" />
                Source
              </a>{' '}
              •{' '}
              <Link
                to="/how-it-works"
                className="underline hover:text-foreground transition-colors"
              >
                How it works
              </Link>{' '}
              • Not affiliated with NYT
            </p>
          </footer>
        </div>
      </div>
    </TooltipProvider>
  )
}

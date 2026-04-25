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
  Gamepad2,
  Newspaper,
  Share2,
  Copy,
  Check,
  Palette,
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
import { GithubLogo } from '@/components/icons/github-logo'
import { initTheme } from '@/lib/themes'
import { track } from '@/lib/posthog'
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
import { InstallPrompt } from './components/InstallPrompt'
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
  92% { -webkit-transform: rotate(-2deg); transform: rotate(-2deg); }
  94% { -webkit-transform: rotate(2deg); transform: rotate(2deg); }
  96% { -webkit-transform: rotate(-1deg); transform: rotate(-1deg); }
  98% { -webkit-transform: rotate(1deg); transform: rotate(1deg); }
}
@keyframes wiggle {
  0%, 90%, 100% { -webkit-transform: rotate(0deg); transform: rotate(0deg); }
  92% { -webkit-transform: rotate(-2deg); transform: rotate(-2deg); }
  94% { -webkit-transform: rotate(2deg); transform: rotate(2deg); }
  96% { -webkit-transform: rotate(-1deg); transform: rotate(-1deg); }
  98% { -webkit-transform: rotate(1deg); transform: rotate(1deg); }
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

async function fireConfetti() {
  const theme = (document.documentElement.getAttribute('data-theme') ??
    'nyt') as Theme
  const colors = THEME_CONFETTI[theme]

  const { default: confetti } = await import('canvas-confetti')

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
  const info = SOURCE_INFO[sourceKey]
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

const COMPANION_INDEX_URL =
  'https://www.nytimes.com/spotlight/connections-companion'

// The companion column uses its own numbering and publishes on the evening
// BEFORE the puzzle (URL date = puzzle date - 1). Both drift from the puzzle
// ID, so we ask the server to resolve the puzzle date → companion URL + number
// by scraping + caching the spotlight index. Falls back to the index on miss.
interface CompanionInfo {
  url: string
  number: number | null
}
async function fetchCompanion(puzzleDate: string): Promise<CompanionInfo> {
  try {
    const res = await fetch(`/api/companion/${puzzleDate}`)
    if (!res.ok) return { url: COMPANION_INDEX_URL, number: null }
    const data = await res.json()
    return {
      url: data.url || COMPANION_INDEX_URL,
      number:
        typeof data.companionNumber === 'number' ? data.companionNumber : null,
    }
  } catch {
    return { url: COMPANION_INDEX_URL, number: null }
  }
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
        {!word.loading && (
          <div className="absolute top-0 right-4 z-10 flex items-start gap-1 flex-wrap justify-end">
            {SWAPPABLE_SOURCE_KEYS.filter(
              (k) => enabledSources.has(k) || k === activeSource,
            )
              .sort((a, b) => {
                if (a === preferredSource) return -1
                if (b === preferredSource) return 1
                return 0
              })
              .slice(0, 3)
              .map((key) => {
                const info = SOURCE_INFO[key]
                const isActive = key === activeSource
                const isLoading = sourceLoading === key
                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!isActive) void switchSource(key)
                        }}
                        disabled={isLoading}
                        aria-label={
                          isActive ? info.label : `Switch to ${info.label}`
                        }
                        aria-pressed={isActive}
                        aria-busy={isLoading}
                        className={cn(
                          'disabled:cursor-wait transition-all',
                          isActive
                            ? 'bg-foreground text-background border-2 border-foreground hover:bg-foreground/90 shadow-md scale-110 ring-2 ring-foreground/25 ring-offset-2 ring-offset-background'
                            : 'border-border/40 text-muted-foreground opacity-60 hover:opacity-100 hover:text-foreground',
                          isLoading && 'animate-pulse opacity-70',
                        )}
                      >
                        <SourceIcon info={info} className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {isActive ? info.label : `Try ${info.label}`}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            {showHints && word.categoryIndex !== undefined && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowColor(!showColor)
                    }}
                    aria-pressed={showColor}
                    className={cn(
                      showColor && 'bg-foreground/10 hover:bg-foreground/15',
                    )}
                  >
                    {showColor ? (
                      <div
                        className={cn(
                          'w-4 h-4 rounded-sm animate-in zoom-in-50',
                          CATEGORY_COLORS[categoryIndex].split(' ')[0],
                        )}
                      />
                    ) : (
                      <Palette className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {showColor ? 'Hide color' : 'Reveal category color'}
                </TooltipContent>
              </Tooltip>
            )}
            {(() => {
              const url = buildSourceUrl(activeSource, word.word)
              if (!url) return null
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${SOURCE_INFO[activeSource].label} for "${word.word}" in a new tab`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Open in new tab</TooltipContent>
                </Tooltip>
              )
            })()}
          </div>
        )}
        <div className="min-w-0 flex flex-col items-start text-left pr-[13rem]">
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
              className="text-xs font-normal mt-1 lowercase"
            >
              {primaryDef.partOfSpeech}
            </Badge>
          )}
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
            {/* Primary definition - natural height so the scroll area
                sits directly beneath it; the "more" button uses mt-auto
                to still pin to the card bottom for grid-row alignment. */}
            <CardDescription
              className={cn(
                'text-sm leading-relaxed',
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
              <div className="space-y-2 pt-2 border-t border-border/50 animate-in slide-in-from-top-2 flex-grow min-h-0 overflow-y-auto">
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
                variant="secondary"
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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const firstMenuItemRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}?date=${puzzleDate}`
      : ''
  const shareTitle = puzzleId
    ? `NYT Connections #${puzzleId}: stuck? Look up any word without spoilers`
    : `Today's NYT Connections: stuck? Look up any word without spoilers`
  const shareText = shareTitle

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

  // Focus management: move focus into the menu on open, back to the
  // trigger on close. Keyboard users land exactly where they expect.
  useEffect(() => {
    if (showMenu) {
      wasOpenRef.current = true
      firstMenuItemRef.current?.focus()
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false
      triggerRef.current?.focus()
    }
  }, [showMenu])

  // Escape closes the menu (parity with dialog semantics).
  useEffect(() => {
    if (!showMenu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMenu(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showMenu])

  const sharePayload = { puzzle_id: puzzleId, puzzle_date: puzzleDate }

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
    track('share', { channel: 'copy', ...sharePayload })
  }

  const handleNativeShare = async () => {
    if ('share' in navigator) {
      try {
        await navigator.share({
          title: 'Connections Helper',
          text: shareText,
          url: shareUrl,
        })
        track('share', { channel: 'native', ...sharePayload })
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
    track('share', { channel: 'whatsapp', ...sharePayload })
    setShowMenu(false)
  }

  const handleX = () => {
    window.open(
      `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer',
    )
    track('share', { channel: 'x', ...sharePayload })
    setShowMenu(false)
  }

  const handleReddit = () => {
    window.open(
      `https://www.reddit.com/r/NYTConnections/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`,
      '_blank',
      'noopener,noreferrer',
    )
    track('share', { channel: 'reddit', ...sharePayload })
    setShowMenu(false)
  }

  const hasNativeShare =
    typeof navigator !== 'undefined' && 'share' in navigator

  return (
    <div ref={menuRef} className="relative">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        onClick={() => setShowMenu(!showMenu)}
        aria-label="Share"
        aria-haspopup="menu"
        aria-expanded={showMenu}
        title="Share"
      >
        <Share2 className="w-4 h-4" />
      </Button>

      {showMenu && (
        <div
          role="menu"
          aria-label="Share puzzle"
          className="absolute top-full right-0 mt-2 z-50 min-w-[180px] rounded-lg p-1 shadow-lg bg-popover text-popover-foreground border border-border"
        >
          {hasNativeShare && (
            <Button
              ref={firstMenuItemRef}
              role="menuitem"
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
            ref={hasNativeShare ? undefined : firstMenuItemRef}
            role="menuitem"
            variant="ghost"
            size="sm"
            onClick={handleX}
            className="w-full justify-start"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            X (Twitter)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReddit}
            className="w-full justify-start"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12.32c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.12-.07 2.961-.913a.33.33 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.533.533-1.67.723-2.526.723-.855 0-1.993-.19-2.525-.723a.336.336 0 0 0-.232-.095z" />
            </svg>
            Reddit
          </Button>
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
      <CardContent className="px-3 pt-2.5 pb-3">
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          Tap cards to reveal categories
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {hints.map((hint, i) => {
            if (!revealedCards[i]) {
              return (
                <Button
                  key={i}
                  variant="secondary"
                  onClick={() => toggleCard(i)}
                  className="h-auto min-h-[52px] px-2 py-2 text-lg font-semibold text-muted-foreground"
                >
                  ?
                </Button>
              )
            }
            return (
              <div
                key={i}
                onClick={() => toggleCard(i)}
                className={cn(
                  'relative cursor-pointer select-none rounded-md font-semibold text-center text-[10px] border transition-all duration-300 min-h-[52px] overflow-hidden flex items-center px-2 py-2 gap-1',
                  showColors[i]
                    ? CATEGORY_COLORS[i]
                    : 'bg-background text-foreground border-border hover:border-foreground/40',
                )}
              >
                <span
                  className="flex-1 leading-tight break-words hyphens-auto"
                  style={{ wordBreak: 'break-word' }}
                >
                  {hint}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => toggleColor(i, e)}
                  aria-pressed={showColors[i]}
                  className={cn(
                    'h-7 w-7 flex-shrink-0',
                    showColors[i] && 'bg-foreground/10 hover:bg-foreground/15',
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
                </Button>
              </div>
            )
          })}
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
  const [companionUrl, setCompanionUrl] = useState<string>(COMPANION_INDEX_URL)
  const [companionNumber, setCompanionNumber] = useState<number | null>(null)
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
  const reportBugRef = useRef<HTMLButtonElement>(null)

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
    loadPuzzle(puzzleDate)

    // Defer analytics until the browser is idle so they don't block
    // the critical render path or the initial puzzle fetch.
    const scheduleAnalytics = () => {
      void import('@/lib/sentry').then((m) => m.initSentry())
      void import('@/lib/posthog').then((m) => m.initPostHog())
    }
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(scheduleAnalytics, { timeout: 3000 })
    } else {
      setTimeout(scheduleAnalytics, 1500)
    }

    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        void navigator.serviceWorker
          .register('/sw.js')
          .catch((err: unknown) => {
            console.warn('SW registration failed:', err)
          })
      })
    }
  }, [])

  // Wire the footer "Report a bug" link to the Sentry feedback widget. The
  // SDK is loaded lazily on idle (see analytics scheduling above), so this
  // effect's awaited init may not resolve until after the user starts
  // interacting. attachFeedbackTo handles that wait internally.
  useEffect(() => {
    const el = reportBugRef.current
    if (!el) return
    let cleanup: (() => void) | null = null
    let cancelled = false
    void import('@/lib/sentry').then(({ attachFeedbackTo }) =>
      attachFeedbackTo(el).then((c) => {
        if (cancelled) c?.()
        else cleanup = c
      }),
    )
    return () => {
      cancelled = true
      cleanup?.()
    }
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
      setCompanionUrl(COMPANION_INDEX_URL)
      setCompanionNumber(null)
      void fetchCompanion(puzzle.print_date).then((info) => {
        setCompanionUrl(info.url)
        setCompanionNumber(info.number)
      })

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

  const goToToday = () => {
    const today = getToday()
    if (puzzleDate !== today) handleDateChange(today)
  }

  // Keyboard shortcuts. Ignored when focus is in an editable element, when a
  // modal/dialog is open (Radix sets aria-hidden on siblings), or when any
  // modifier key is held (don't hijack Cmd+R, Cmd+L, etc.).
  useEffect(() => {
    // Walk the composed event path so we also detect inputs inside Shadow
    // DOM (e.g. Sentry's feedback widget, which is a web component).
    // document.activeElement only sees the shadow host, not the inner field.
    const isEditableEvent = (e: KeyboardEvent): boolean => {
      for (const el of e.composedPath()) {
        if (!(el instanceof HTMLElement)) continue
        const tag = el.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
          return true
        if (el.isContentEditable) return true
      }
      return false
    }

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isEditableEvent(e)) return
      if (settingsOpen) return

      switch (e.key) {
        case 'ArrowLeft':
        case ',':
          e.preventDefault()
          goToPreviousDay()
          break
        case 'ArrowRight':
        case '.':
          e.preventDefault()
          goToNextDay()
          break
        case 't':
        case 'T':
          e.preventDefault()
          goToToday()
          break
        case 'h':
        case 'H':
          e.preventDefault()
          setShowHints((prev) => !prev)
          break
        case 's':
        case 'S':
          e.preventDefault()
          setSettingsOpen(true)
          break
        case '?':
          e.preventDefault()
          alert(
            'Keyboard shortcuts\n\n' +
              '← or ,   Previous day\n' +
              '→ or .   Next day\n' +
              't        Jump to today\n' +
              'h        Toggle hints\n' +
              's        Open settings\n' +
              '?        Show this help',
          )
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [puzzleDate, settingsOpen])

  const isToday = puzzleDate === getToday()
  const isFirstDay = puzzleDate <= FIRST_PUZZLE_DATE
  const loadingDefinitions = words.some((w) => w.loading)

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background transition-colors">
        <div className="fixed top-3 right-3 z-50 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2">
            {import.meta.env.DEV && (
              <Link to="/design-system" target="_blank" rel="noopener">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/90 backdrop-blur"
                  aria-label="Open design system showcase (dev only)"
                  title="Design system (dev only)"
                >
                  <Palette className="w-4 h-4" />
                  <span className="hidden sm:inline">Design system</span>
                </Button>
              </Link>
            )}
            <EnvironmentBadge showExternal={false} />
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-5 sm:px-6 md:px-8 py-6 md:py-10">
          {/* Header */}
          <header className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
              <svg
                ref={puzzleIconRef}
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className={cn(
                  // design-system:allow — easter-egg delight, not a state indicator
                  'w-6 h-6 flex-shrink-0 cursor-pointer transition-all hover:scale-110 select-none',
                  wiggleDisabled ? '' : 'wiggle-occasional',
                )}
                onClick={handlePuzzleClick}
              >
                <rect width="32" height="32" rx="6" fill="#181818" />
                <rect
                  x="2"
                  y="2"
                  width="13"
                  height="13"
                  rx="2.5"
                  fill="#f9df6d"
                />
                <rect
                  x="17"
                  y="2"
                  width="13"
                  height="13"
                  rx="2.5"
                  fill="#a0c35a"
                />
                <rect
                  x="2"
                  y="17"
                  width="13"
                  height="13"
                  rx="2.5"
                  fill="#b0c4ef"
                />
                <rect
                  x="17"
                  y="17"
                  width="13"
                  height="13"
                  rx="2.5"
                  fill="#ba81c5"
                />
              </svg>
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
            <CardContent className="px-2">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon-lg"
                      className="flex-shrink-0 h-12 w-12"
                      onClick={goToPreviousDay}
                      disabled={isFirstDay || loadingPuzzle}
                      aria-label="Previous day"
                    >
                      <ChevronLeft className="!size-7" strokeWidth={2.5} />
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
                  <span
                    aria-hidden={!puzzleId}
                    className={cn(
                      'text-sm text-muted-foreground transition-colors hidden sm:inline-block w-14 text-center',
                      !puzzleId && 'invisible',
                    )}
                  >
                    #{companionNumber ?? puzzleId ?? '0000'}
                  </span>
                  <Button
                    onClick={() => handleDateChange(getToday())}
                    size="sm"
                    variant="secondary"
                    disabled={isToday}
                  >
                    Today
                  </Button>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon-lg"
                      className="flex-shrink-0 h-12 w-12"
                      onClick={goToNextDay}
                      disabled={isToday || loadingPuzzle}
                      aria-label="Next day"
                    >
                      <ChevronRight className="!size-7" strokeWidth={2.5} />
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
                variant="secondary"
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
                  <Button variant="ghost" size="icon" asChild>
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
                    <Button variant="ghost" size="icon" asChild>
                      <a
                        href={companionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={
                          companionNumber
                            ? `Read NYT's Connections Companion No. ${companionNumber}`
                            : `Read NYT's Connections Companion for puzzle #${puzzleId}`
                        }
                      >
                        <Newspaper className="w-4 h-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {companionNumber
                      ? `Companion No. ${companionNumber}`
                      : `Companion for #${puzzleId}`}
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
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
            <div
              role="status"
              aria-live="polite"
              aria-busy={true}
              aria-label="Loading puzzle definitions"
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {Array.from({ length: 16 }).map((_, i) => (
                <SkeletonWordCard key={i} index={i} />
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !loadingPuzzle && (
            <Card className="text-center py-16" role="alert">
              <CardContent>
                <div className="text-6xl mb-4" aria-hidden>
                  😕
                </div>
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

          {/* Footer — flex row with items-center keeps the GitHub icon
              vertically aligned with adjacent text instead of floating at
              the icon's inline-flex centre (which sits above the baseline). */}
          <footer className="mt-12 space-y-3">
            {/* Each interactive item carries `min-h-6 inline-flex items-center`
                so click targets are at least 24×24 CSS pixels — required by
                WCAG 2.2 target-size (Lighthouse will fail the page below 0.95
                without it). Visual layout is unchanged because the row is
                already vertically centred. */}
            <div className="text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center min-h-6">
                Made by
                <a
                  href="https://ronanconnolly.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors ml-1"
                >
                  Ronan Connolly
                </a>
              </span>
              <span aria-hidden>•</span>
              <a
                href="https://x.com/ronancodes"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors inline-flex items-center gap-1 min-h-6"
                aria-label="Follow @ronancodes on X"
              >
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                @ronancodes
              </a>
              <span aria-hidden>•</span>
              <a
                href="https://github.com/RonanCodes/connections-helper"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors inline-flex items-center gap-1 min-h-6"
              >
                <GithubLogo className="w-3 h-3" />
                Source
              </a>
              <span aria-hidden>•</span>
              <Link
                to="/how-it-works"
                className="underline hover:text-foreground transition-colors inline-flex items-center min-h-6"
              >
                How it works
              </Link>
              <span aria-hidden>•</span>
              <a
                href="/api/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors inline-flex items-center min-h-6"
              >
                API
              </a>
              <span aria-hidden>•</span>
              <button
                ref={reportBugRef}
                type="button"
                className="underline hover:text-foreground transition-colors cursor-pointer inline-flex items-center min-h-6"
              >
                Report a bug
              </button>
              <span aria-hidden>•</span>
              <span>Not affiliated with NYT</span>
            </div>
          </footer>
        </div>
        <InstallPrompt />
      </div>
    </TooltipProvider>
  )
}

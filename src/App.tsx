import { useState, useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  RefreshCw,
  Calendar,
  Sparkles,
  Puzzle,
  Share2,
  Copy,
  Check,
  Palette,
  Github,
} from 'lucide-react'
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
import '@/lib/themes/css/themes.css'

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

// Source icons, labels, and URLs (word placeholder: {word})
const SOURCE_INFO: Record<
  string,
  { icon: string; label: string; color: string; url?: string }
> = {
  // Merriam-Webster Collegiate API. Links match exactly; URL is merriam-webster.com/dictionary/{word}.
  'merriam-webster': {
    icon: '📘',
    label: 'Merriam-Webster',
    color: 'text-blue-600',
    url: 'https://www.merriam-webster.com/dictionary/{word}',
  },
  // Wordnik aggregates several dictionaries; its own site has a per-word page that matches.
  wordnik: {
    icon: '📗',
    label: 'Wordnik',
    color: 'text-green-600',
    url: 'https://www.wordnik.com/words/{word}',
  },
  // Backend source key is 'dictionary' (from dictionaryapi.dev, a free dictionary API backed by Wiktionary).
  // Linking to Wiktionary is semantically correct: it's the underlying source that dictionaryapi.dev pulls from.
  dictionary: {
    icon: '📖',
    label: 'Dictionary',
    color: 'text-green-500',
    url: 'https://en.wiktionary.org/wiki/{word}',
  },
  // Only used as an alt-source link (user-facing cross-check), never as the primary source key.
  dictionarycom: {
    icon: '📖',
    label: 'Dictionary.com',
    color: 'text-green-500',
    url: 'https://www.dictionary.com/browse/{word}',
  },
  datamuse: {
    icon: '🔤',
    label: 'Datamuse',
    color: 'text-blue-500',
    // Datamuse is an API with no per-word entry page, but its definitions come from Wiktionary,
    // so link there for click-through.
    url: 'https://en.wiktionary.org/wiki/{word}',
  },
  wikipedia: {
    icon: '🌐',
    label: 'Wikipedia',
    color: 'text-slate-400',
    url: 'https://en.wikipedia.org/wiki/{word}',
  },
  urban: {
    icon: '🏙️',
    label: 'Urban Dictionary',
    color: 'text-orange-500',
    url: 'https://www.urbandictionary.com/define.php?term={word}',
  },
  inferred: { icon: '🤔', label: 'Inferred', color: 'text-yellow-500' },
}

// Sources always offered as one-tap alternates next to the primary definition.
// If the primary source matches one of these, it's removed from the alternate row.
const ALT_SOURCE_KEYS = ['dictionarycom', 'urban', 'wikipedia'] as const

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
        'h-full flex flex-col',
        'animate-in fade-in slide-in-from-bottom-2',
      )}
      style={{
        animationDelay: `${index * 30}ms`,
        animationFillMode: 'backwards',
      }}
    >
      <CardHeader className="pb-1">
        <CardTitle className="text-lg flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-5 w-14 rounded-md" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow gap-3">
        <div className="space-y-2 flex-grow">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
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

  const definitions = word.definitions
  const primaryDef = definitions[0]
  const hasMore = definitions.length > 1

  return (
    <Card
      className={cn(
        'transition-shadow duration-150 md:hover:shadow-md',
        'animate-in fade-in slide-in-from-bottom-2',
        'h-full flex flex-col',
        showColor && CATEGORY_COLORS[categoryIndex],
      )}
      style={{
        animationDelay: `${index * 30}ms`,
        animationFillMode: 'backwards',
      }}
    >
      <CardHeader className="pb-1">
        <CardTitle className="text-lg flex items-center justify-between">
          {word.imageUrl ? (
            <div className="flex items-center gap-2">
              <img
                src={word.imageUrl}
                alt={word.imageAltText || word.word}
                className="w-8 h-8"
              />
              <span className="uppercase tracking-wide text-sm">
                {word.imageAltText || word.word}
              </span>
            </div>
          ) : (
            <span className="uppercase tracking-wide">{word.word}</span>
          )}
          <div className="flex items-center gap-2">
            {primaryDef.partOfSpeech && !word.loading && (
              <Badge variant="secondary" className="text-xs font-normal">
                {primaryDef.partOfSpeech}
              </Badge>
            )}
            {showHints && word.categoryIndex !== undefined && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowColor(!showColor)
                }}
                className={cn(
                  'p-1.5 rounded-md transition-all duration-300 border',
                  showColor
                    ? 'bg-black/10 border-transparent scale-110'
                    : 'bg-muted/50 border-border hover:bg-muted hover:scale-105',
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
          </div>
        </CardTitle>
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
              {primaryDef.definition || 'No definition found'}
            </CardDescription>

            {/* Source + alternate lookups */}
            {(() => {
              const primaryKey = primaryDef.source || 'dictionary'
              const sourceInfo = SOURCE_INFO[primaryKey] ?? SOURCE_INFO.inferred
              const sourceUrl = buildSourceUrl(primaryKey, word.word)
              const alternates = ALT_SOURCE_KEYS.filter((k) => k !== primaryKey)

              return (
                <div className="flex items-center justify-between gap-2 text-xs">
                  {sourceUrl ? (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors hover:underline min-w-0"
                      title={`View "${word.word}" on ${sourceInfo.label}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>{sourceInfo.icon}</span>
                      <span className="truncate">{sourceInfo.label}</span>
                    </a>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 text-muted-foreground min-w-0"
                      title={`Source: ${sourceInfo.label}`}
                    >
                      <span>{sourceInfo.icon}</span>
                      <span className="truncate">{sourceInfo.label}</span>
                    </span>
                  )}

                  {/* One-tap alternate lookups */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {alternates.map((altKey) => {
                      const alt = SOURCE_INFO[altKey]
                      const altUrl = buildSourceUrl(altKey, word.word)
                      if (!altUrl) return null
                      return (
                        <Tooltip key={altKey}>
                          <TooltipTrigger asChild>
                            <a
                              href={altUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md opacity-60 hover:opacity-100 hover:bg-muted transition-all"
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Check ${alt.label} for "${word.word}"`}
                            >
                              <span>{alt.icon}</span>
                            </a>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Check {alt.label}
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* Expandable additional definitions */}
            {hasMore && expanded && (
              <div className="space-y-2 pt-2 border-t border-border/50 animate-in slide-in-from-top-2 max-h-48 overflow-y-auto">
                {definitions.slice(1).map((def, i) => (
                  <div key={i} className="text-sm">
                    <CardDescription
                      className={cn(
                        'leading-relaxed',
                        showColor && 'text-current opacity-90',
                      )}
                    >
                      {def.partOfSpeech &&
                        def.partOfSpeech !== primaryDef.partOfSpeech && (
                          <Badge
                            variant="outline"
                            className="text-xs font-normal mr-1.5 align-middle"
                          >
                            {def.partOfSpeech}
                          </Badge>
                        )}
                      {def.definition}
                    </CardDescription>
                  </div>
                ))}
              </div>
            )}

            {/* More definitions button - always at bottom */}
            {hasMore && (
              <button
                onClick={() => setExpanded(!expanded)}
                className={cn(
                  'w-full text-xs px-3 py-2.5 rounded-lg transition-all mt-auto',
                  'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground',
                  'border border-border/50 hover:border-border',
                  'flex items-center justify-center gap-1.5',
                  expanded && 'bg-primary/10 text-primary border-primary/30',
                )}
              >
                {expanded ? (
                  <>Less</>
                ) : (
                  <>
                    {definitions.length - 1} more definition
                    {definitions.length > 2 ? 's' : ''}
                  </>
                )}
              </button>
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
        size="sm"
        className="w-8 px-0"
        onClick={() => setShowMenu(!showMenu)}
        title="Share"
      >
        <Share2 className="w-4 h-4" />
      </Button>

      {showMenu && (
        <div
          className="absolute top-full right-0 mt-2 z-50 min-w-[180px] rounded-lg p-1 shadow-lg"
          style={{
            backgroundColor: 'var(--color-surface, #ffffff)',
            border: '1px solid var(--color-border, #e5e5e5)',
          }}
        >
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover:bg-black/5"
            >
              <Share2 className="w-4 h-4" />
              Share...
            </button>
          )}
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover:bg-black/5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </button>
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover:bg-black/5"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
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
                    className={cn(
                      'flex-shrink-0 p-1.5 rounded-md transition-all duration-300 border',
                      showColors[i]
                        ? 'bg-black/10 border-transparent scale-110'
                        : 'bg-muted/50 border-border hover:bg-muted hover:scale-105',
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
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                  <Puzzle
                    ref={puzzleIconRef}
                    className={cn(
                      'w-8 h-8 flex-shrink-0 cursor-pointer transition-all hover:scale-110 select-none',
                      wiggleDisabled ? '' : 'wiggle-occasional',
                      rainbowMode ? 'rainbow-icon' : 'text-green-500',
                    )}
                    onClick={handlePuzzleClick}
                  />
                  <span
                    className={cn(
                      'truncate',
                      rainbowMode ? 'rainbow-text' : '',
                    )}
                  >
                    Connections Helper
                  </span>
                </h1>
                <ShareButton puzzleId={puzzleId} puzzleDate={puzzleDate} />
              </div>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Your puzzle-solving sidekick
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <EnvironmentBadge showExternal={false} />
              {/* TODO: Restore Classic mode and ThemePicker after fixing @bendr/themes */}
            </div>
          </header>

          {/* Date Navigation */}
          <Card className="mb-6">
            <CardContent className="py-4">
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
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                      #{puzzleId}
                    </span>
                  )}
                  <Button
                    onClick={() => handleDateChange(getToday())}
                    size="sm"
                    disabled={isToday}
                    variant={isToday ? 'outline' : 'default'}
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

          {/* Loading State: skeleton grid matching the real layout */}
          {loadingPuzzle && (
            <>
              <div className="flex justify-between items-center mb-4 min-h-9">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-28 rounded-md" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 16 }).map((_, i) => (
                  <SkeletonWordCard key={i} index={i} />
                ))}
              </div>
            </>
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
              {/* Controls */}
              <div className="flex justify-between items-center mb-4 min-h-9">
                <span />
                {showHints ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowHints(false)}
                  >
                    <EyeOff className="w-4 h-4 mr-2" /> Lock Hints
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      localStorage.setItem(getUnlockKey(puzzleDate), 'true')
                      setShowHints(true)
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" /> Unlock Hints
                  </Button>
                )}
              </div>

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

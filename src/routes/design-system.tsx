import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Check, Info, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  ELEVATION,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  Z,
} from '@/design-system/tokens'
import { THEMES, THEME_META, getThemeConfig, setTheme } from '@/lib/themes'
import type { Theme } from '@/lib/themes'

export const Route = createFileRoute('/design-system')({
  component: DesignSystemShowcase,
  validateSearch: (search: Record<string, unknown>) => {
    const raw = typeof search.theme === 'string' ? search.theme : undefined
    const theme = (THEMES as readonly string[]).includes(raw ?? '')
      ? (raw as Theme)
      : undefined
    return { theme }
  },
})

// Semantic colour tokens bridged by @theme inline in styles.css. Each pair
// (fg/bg) is what consumers should reach for — never raw hex.
const COLOUR_PAIRS: Array<{
  name: string
  bg: string
  fg: string
  note: string
}> = [
  {
    name: 'background / foreground',
    bg: 'bg-background',
    fg: 'text-foreground',
    note: 'page canvas',
  },
  {
    name: 'card / card-foreground',
    bg: 'bg-card',
    fg: 'text-card-foreground',
    note: 'raised surfaces',
  },
  {
    name: 'popover / popover-foreground',
    bg: 'bg-popover',
    fg: 'text-popover-foreground',
    note: 'floating menus',
  },
  {
    name: 'muted / muted-foreground',
    bg: 'bg-muted',
    fg: 'text-muted-foreground',
    note: 'hover tint, secondary text',
  },
  {
    name: 'accent / accent-foreground',
    bg: 'bg-accent',
    fg: 'text-accent-foreground',
    note: 'interactive hover fills',
  },
  {
    name: 'primary / primary-foreground',
    bg: 'bg-primary',
    fg: 'text-primary-foreground',
    note: 'main CTA',
  },
  {
    name: 'secondary / secondary-foreground',
    bg: 'bg-secondary',
    fg: 'text-secondary-foreground',
    note: 'alternative CTA',
  },
  {
    name: 'destructive',
    bg: 'bg-destructive',
    fg: 'text-white',
    note: 'danger, delete',
  },
]

const BUTTON_VARIANTS = [
  'default',
  'secondary',
  'outline',
  'ghost',
  'link',
  'destructive',
] as const

const BUTTON_SIZES = ['xs', 'sm', 'default', 'lg'] as const

const RADIUS_KEYS = ['none', 'sm', 'md', 'lg', 'xl', 'pill'] as const
const ELEVATION_KEYS = ['flat', 'raised', 'floating', 'overlay'] as const
const TYPOGRAPHY_KEYS = [
  'display',
  'h1',
  'h2',
  'h3',
  'bodyLg',
  'body',
  'label',
  'caption',
  'mono',
  'tiny',
] as const

function DesignSystemShowcase() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/design-system' })
  const [theme, setActiveTheme] = useState<Theme>('nyt')
  const [pressed, setPressed] = useState(false)

  useEffect(() => {
    const initial = search.theme ?? getThemeConfig().theme
    if (search.theme) setTheme(search.theme)
    setActiveTheme(initial)
  }, [search.theme])

  function pickTheme(next: Theme) {
    setTheme(next)
    setActiveTheme(next)
    navigate({ search: { theme: next }, replace: true })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-5 sm:px-6 md:px-8 py-6 md:py-10 space-y-10">
        <header className="space-y-4">
          <Link to="/" className="inline-block">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to puzzle
            </Button>
          </Link>
          <div>
            <h1 className={cn(TYPOGRAPHY.display, 'mb-2')}>Design System</h1>
            <p className="text-muted-foreground">
              Live showcase of tokens and primitives. Hidden route — not linked
              from nav.
            </p>
          </div>

          <fieldset className="flex flex-wrap gap-2">
            <legend className={cn(TYPOGRAPHY.tiny, 'mb-2 w-full')}>
              Preview theme
            </legend>
            {THEMES.map((t) => {
              const meta = THEME_META[t]
              const isActive = theme === t
              return (
                <Button
                  key={t}
                  variant="outline"
                  size="sm"
                  onClick={() => pickTheme(t)}
                  aria-pressed={isActive}
                  className={cn(
                    isActive &&
                      'bg-primary/10 text-primary border-primary/30 hover:bg-primary/15 active:bg-primary/20',
                  )}
                >
                  <span aria-hidden>{meta.emoji}</span>
                  {meta.name}
                </Button>
              )
            })}
          </fieldset>
        </header>

        <Section
          title="Colour tokens"
          description="Semantic pairs bridged from CSS vars. Never use raw hex in app code."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COLOUR_PAIRS.map((c) => (
              <div
                key={c.name}
                className={cn(
                  'flex items-center justify-between gap-3 px-4 py-3',
                  RADIUS.md,
                  ELEVATION.flat,
                  c.bg,
                  c.fg,
                )}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-xs opacity-80 truncate">{c.note}</div>
                </div>
                <Check className="w-4 h-4 shrink-0 opacity-70" />
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Typography"
          description="Ten-step scale. Use semantic names; avoid inline text-[Npx]."
        >
          <div className="space-y-3">
            {TYPOGRAPHY_KEYS.map((key) => (
              <div
                key={key}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-baseline sm:gap-6 py-2 border-b border-border last:border-b-0',
                )}
              >
                <div className="min-w-[110px]">
                  <code className="text-xs text-muted-foreground">
                    TYPOGRAPHY.{key}
                  </code>
                </div>
                <div className={cn(TYPOGRAPHY[key], 'flex-1')}>
                  The quick brown fox jumps over the lazy dog
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Radius"
          description="One radius scale. Constant across states — never change radius on :active."
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {RADIUS_KEYS.map((key) => (
              <div key={key} className="flex flex-col items-center gap-2">
                <div className={cn('w-20 h-20 bg-primary', RADIUS[key])} />
                <code className="text-xs text-muted-foreground">{key}</code>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Elevation"
          description="Border-first; shadows only when the theme casts them."
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ELEVATION_KEYS.map((key) => (
              <div
                key={key}
                className={cn(
                  'p-4 bg-card text-card-foreground',
                  RADIUS.md,
                  ELEVATION[key],
                )}
              >
                <div className="text-sm font-medium mb-1">{key}</div>
                <div className="text-xs text-muted-foreground">
                  ELEVATION.{key}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Buttons — variants × sizes"
          description="Interact to see hover, active (translate-y-px), and focus ring."
        >
          <div className="space-y-5">
            {BUTTON_VARIANTS.map((variant) => (
              <div key={variant} className="space-y-2">
                <div className={cn(TYPOGRAPHY.tiny, 'text-muted-foreground')}>
                  {variant}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {BUTTON_SIZES.map((size) => (
                    <Button key={size} variant={variant} size={size}>
                      {size === 'xs' || size === 'sm' ? 'Click' : 'Click me'}
                    </Button>
                  ))}
                  <Button variant={variant} size="sm" disabled>
                    Disabled
                  </Button>
                  <Button variant={variant} size="sm">
                    <Plus />
                    With icon
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Icon buttons"
          description="Square sizes for pure-icon controls."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="icon-xs" aria-label="Info">
              <Info />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Info">
              <Info />
            </Button>
            <Button variant="outline" size="icon" aria-label="Info">
              <Info />
            </Button>
            <Button variant="outline" size="icon-lg" aria-label="Info">
              <Info />
            </Button>
            <Button variant="destructive" size="icon" aria-label="Delete">
              <Trash2 />
            </Button>
            <Button variant="outline" size="icon" aria-label="Loading" disabled>
              <Loader2 className="animate-spin" />
            </Button>
          </div>
        </Section>

        <Section
          title="Toggle button"
          description="aria-pressed flips the visual. Same radius in both states — only fill and border change."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              aria-pressed={pressed}
              onClick={() => setPressed((p) => !p)}
              className={cn(
                pressed &&
                  'bg-primary/10 text-primary border-primary/30 hover:bg-primary/15 active:bg-primary/20',
              )}
            >
              {pressed ? 'On' : 'Off'}
            </Button>
            <span className="text-xs text-muted-foreground">
              aria-pressed={String(pressed)}
            </span>
          </div>
        </Section>

        <Section
          title="Inputs"
          description="Same radius + focus treatment as Button."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-1.5">
              <label className={TYPOGRAPHY.label}>Default</label>
              <Input placeholder="Type something" />
            </div>
            <div className="space-y-1.5">
              <label className={TYPOGRAPHY.label}>Disabled</label>
              <Input placeholder="Locked" disabled />
            </div>
            <div className="space-y-1.5">
              <label className={TYPOGRAPHY.label}>Invalid</label>
              <Input defaultValue="nope" aria-invalid />
            </div>
            <div className="space-y-1.5">
              <label className={TYPOGRAPHY.label}>With value</label>
              <Input defaultValue="Hello" />
            </div>
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="ghost">Ghost</Badge>
            <Badge variant="link">Link</Badge>
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Card title</CardTitle>
                <CardDescription>
                  Cards use ELEVATION.raised by default.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Body content sits inside CardContent and inherits
                card-foreground.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Another card</CardTitle>
                <CardDescription>
                  Pair with Button primitives for actions.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button size="sm">Primary</Button>
                <Button variant="outline" size="sm">
                  Secondary
                </Button>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section
          title="Spacing scale"
          description="4px grid. Numbers map to Tailwind spacing units."
        >
          <div className="space-y-2">
            {(Object.keys(SPACING) as Array<keyof typeof SPACING>).map(
              (key) => (
                <div key={key} className="flex items-center gap-4">
                  <code className="text-xs text-muted-foreground min-w-[90px]">
                    SPACING.{key}
                  </code>
                  <div
                    className="h-4 bg-primary rounded-sm"
                    style={{ width: `${parseInt(SPACING[key], 10) * 4}px` }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {parseInt(SPACING[key], 10) * 4}px
                  </span>
                </div>
              ),
            )}
          </div>
        </Section>

        <Section
          title="Z-index scale"
          description="Numeric so arithmetic works in style objects."
        >
          <div className="flex flex-wrap gap-2">
            {(Object.keys(Z) as Array<keyof typeof Z>).map((key) => (
              <div
                key={key}
                className={cn(
                  'px-3 py-2 bg-muted text-muted-foreground',
                  RADIUS.md,
                )}
              >
                <code className="text-xs">
                  Z.{key} = {Z[key]}
                </code>
              </div>
            ))}
          </div>
        </Section>

        <footer className="pt-6 border-t border-border text-xs text-muted-foreground">
          Full spec:{' '}
          <a
            href="https://github.com/ronanconnolly/connections-helper/blob/main/DESIGN_SYSTEM.md"
            className="text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            DESIGN_SYSTEM.md
          </a>
        </footer>
      </div>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className={cn(TYPOGRAPHY.h2, 'mb-1')}>{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

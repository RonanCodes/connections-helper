import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TYPOGRAPHY } from '@/design-system/tokens'
import { cn } from '@/lib/utils'
import {
  MAX_ENABLED_SOURCES,
  PREFERRED_SOURCE_AUTO,
  getEnabledSources,
  getPreferredSource,
  setEnabledSources,
  setPreferredSource,
} from '@/lib/user-prefs'
import { SOURCE_DESCRIPTIONS } from '@/lib/source-descriptions'

export const Route = createFileRoute('/settings')({ component: SettingsPage })

type SourceOption = {
  key: string
  label: string
  faviconDomain?: string
}

const SOURCES: SourceOption[] = [
  {
    key: 'merriam-webster',
    label: 'Merriam-Webster',
    faviconDomain: 'merriam-webster.com',
  },
  {
    key: 'dictionary',
    label: 'Wiktionary',
    faviconDomain: 'wiktionary.org',
  },
  { key: 'datamuse', label: 'Datamuse', faviconDomain: 'datamuse.com' },
  { key: 'wikipedia', label: 'Wikipedia', faviconDomain: 'wikipedia.org' },
  {
    key: 'urban',
    label: 'Urban Dictionary',
    faviconDomain: 'urbandictionary.com',
  },
]

const ALL_KEYS = SOURCES.map((s) => s.key)

function SettingsPage() {
  const [preferred, setPreferred] = useState<string>(() => getPreferredSource())
  const [enabled, setEnabled] = useState<Set<string>>(() =>
    getEnabledSources(ALL_KEYS),
  )

  function persistPreferred(key: string) {
    setPreferred(key)
    setPreferredSource(key)
  }

  function persistEnabled(next: Set<string>) {
    setEnabled(next)
    setEnabledSources(Array.from(next), ALL_KEYS)
  }

  function choosePreferred(key: string) {
    persistPreferred(key)
    if (key !== PREFERRED_SOURCE_AUTO && !enabled.has(key)) {
      const next = new Set(enabled)
      if (next.size >= MAX_ENABLED_SOURCES) {
        const victim = [...next].find((k) => k !== key && k !== preferred)
        if (victim) next.delete(victim)
      }
      next.add(key)
      persistEnabled(next)
    }
  }

  function toggleEnabled(key: string) {
    const next = new Set(enabled)
    if (next.has(key)) {
      if (next.size <= 1) return
      if (preferred === key) return
      next.delete(key)
    } else {
      if (next.size >= MAX_ENABLED_SOURCES) return
      next.add(key)
    }
    persistEnabled(next)
  }

  const preferredOptions: Array<SourceOption> = [
    { key: PREFERRED_SOURCE_AUTO, label: 'Automatic (waterfall)' },
    ...SOURCES,
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 sm:px-6 md:px-8 py-6 md:py-10">
        <Link to="/" className="inline-block mb-6">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to puzzle
          </Button>
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Settings
          </h1>
          <p className="text-muted-foreground text-base">
            Changes save automatically.
          </p>
        </header>

        <section className="mb-10">
          <div className="mb-3">
            <h2 className="text-xl font-semibold mb-1">Preferred source</h2>
            <p className="text-sm text-muted-foreground">
              Shown first for each word. Other enabled sources stay one tap
              away.
            </p>
          </div>
          <fieldset className="space-y-2">
            <legend className="sr-only">Preferred source</legend>
            {preferredOptions.map((opt) => {
              const isActive = preferred === opt.key
              return (
                <label
                  key={opt.key}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-md border cursor-pointer transition-colors',
                    'hover:bg-muted',
                    isActive ? 'border-primary bg-muted' : 'border-border',
                  )}
                >
                  <input
                    type="radio"
                    name="preferred-source"
                    value={opt.key}
                    checked={isActive}
                    onChange={() => choosePreferred(opt.key)}
                    className="w-4 h-4 accent-primary"
                  />
                  {opt.faviconDomain && (
                    <img
                      src={`https://icons.duckduckgo.com/ip3/${opt.faviconDomain}.ico`}
                      alt=""
                      className="w-5 h-5 shrink-0"
                      loading="lazy"
                    />
                  )}
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              )
            })}
          </fieldset>
        </section>

        <section className="mb-10">
          <div className="mb-3">
            <h2 className="text-xl font-semibold mb-1">
              Enabled sources{' '}
              <span className="text-sm font-normal text-muted-foreground">
                ({enabled.size}/{MAX_ENABLED_SOURCES})
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Only enabled sources appear as swap icons. Pick up to{' '}
              {MAX_ENABLED_SOURCES} so the card row stays tidy.
            </p>
          </div>
          <div className="space-y-3">
            {SOURCES.map((opt) => {
              const isEnabled = enabled.has(opt.key)
              const isPreferred = preferred === opt.key
              const lockedOn = isPreferred || (isEnabled && enabled.size <= 1)
              const capReached =
                !isEnabled && enabled.size >= MAX_ENABLED_SOURCES
              const disabled = lockedOn || capReached
              const desc = SOURCE_DESCRIPTIONS[opt.key]
              return (
                <label
                  key={opt.key}
                  className={cn(
                    'flex items-start gap-3 px-3 py-3 rounded-md border transition-colors',
                    disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                    isEnabled
                      ? 'border-border bg-muted/50'
                      : 'border-border opacity-60',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    disabled={disabled}
                    onChange={() => toggleEnabled(opt.key)}
                    className="w-4 h-4 mt-1 accent-primary"
                  />
                  {opt.faviconDomain && (
                    <img
                      src={`https://icons.duckduckgo.com/ip3/${opt.faviconDomain}.ico`}
                      alt=""
                      className="w-5 h-5 shrink-0 mt-0.5"
                      loading="lazy"
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{opt.label}</span>
                      {isPreferred && (
                        <span className={cn(TYPOGRAPHY.tiny, 'text-primary')}>
                          Preferred
                        </span>
                      )}
                      {capReached && (
                        <span
                          className={cn(
                            TYPOGRAPHY.tiny,
                            'text-muted-foreground',
                          )}
                        >
                          Cap reached
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>{desc.settingsBlurb}</div>
                      <div>
                        <span className="font-medium text-foreground/80">
                          Good for:
                        </span>{' '}
                        {desc.goodFor}
                      </div>
                      <div>
                        <span className="font-medium text-foreground/80">
                          Not for:
                        </span>{' '}
                        {desc.notFor}
                      </div>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

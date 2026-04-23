import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  PREFERRED_SOURCE_AUTO,
  getEnabledSources,
  getPreferredSource,
  setEnabledSources,
  setPreferredSource,
} from '@/lib/user-prefs'
import { SOURCE_DESCRIPTIONS } from '@/lib/source-descriptions'
import { THEMES, THEME_META, getThemeConfig, setTheme } from '@/lib/themes'
import type { Theme } from '@/lib/themes'

type SourceOption = {
  key: string
  label: string
  faviconDomain?: string
}

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sources: Array<SourceOption>
}

export function SettingsDialog({
  open,
  onOpenChange,
  sources,
}: SettingsDialogProps) {
  const allKeys = sources.map((s) => s.key)
  const [draftPreferred, setDraftPreferred] = useState<string>(
    PREFERRED_SOURCE_AUTO,
  )
  const [draftEnabled, setDraftEnabled] = useState<Set<string>>(
    new Set(allKeys),
  )
  const [draftTheme, setDraftTheme] = useState<Theme>('nyt')
  const originalThemeRef = useRef<Theme>('nyt')

  useEffect(() => {
    if (open) {
      setDraftPreferred(getPreferredSource())
      setDraftEnabled(getEnabledSources(allKeys))
      const current = getThemeConfig().theme
      originalThemeRef.current = current
      setDraftTheme(current)
    }
  }, [open])

  function chooseTheme(next: Theme) {
    setDraftTheme(next)
    setTheme(next)
  }

  function choosePreferred(key: string) {
    setDraftPreferred(key)
    if (key !== PREFERRED_SOURCE_AUTO && !draftEnabled.has(key)) {
      const next = new Set(draftEnabled)
      next.add(key)
      setDraftEnabled(next)
    }
  }

  function toggleEnabled(key: string) {
    const next = new Set(draftEnabled)
    if (next.has(key)) {
      if (next.size <= 1) return
      if (draftPreferred === key) return
      next.delete(key)
    } else {
      next.add(key)
    }
    setDraftEnabled(next)
  }

  function handleSave() {
    setEnabledSources(Array.from(draftEnabled), allKeys)
    setPreferredSource(draftPreferred)
    setTheme(draftTheme)
    onOpenChange(false)
  }

  function handleCancel() {
    if (draftTheme !== originalThemeRef.current) {
      setTheme(originalThemeRef.current)
    }
    onOpenChange(false)
  }

  const preferredOptions: Array<SourceOption> = [
    { key: PREFERRED_SOURCE_AUTO, label: 'Automatic (waterfall)' },
    ...sources,
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[var(--color-border,#e5e5e5)]">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Pick the source you&apos;d like shown first, and toggle which
            sources appear on each card.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Theme</h3>
            <p className="text-xs text-muted-foreground">
              Changes preview instantly. Save to keep, Cancel to revert.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => {
                const meta = THEME_META[t]
                const isActive = draftTheme === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => chooseTheme(t)}
                    className={cn(
                      'flex items-start gap-2 px-3 py-2.5 rounded-md border text-left transition-colors',
                      isActive
                        ? 'border-foreground bg-muted'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <span className="text-lg leading-none mt-0.5" aria-hidden>
                      {meta.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">
                        {meta.name}
                      </span>
                      <span className="block text-[11px] text-muted-foreground leading-snug">
                        {meta.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Preferred source</h3>
            <p className="text-xs text-muted-foreground">
              Shown first for each word. Other enabled sources stay one tap
              away.
            </p>
            <fieldset className="space-y-1.5">
              <legend className="sr-only">Preferred source</legend>
              {preferredOptions.map((opt) => {
                const isActive = draftPreferred === opt.key
                return (
                  <label
                    key={opt.key}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md border cursor-pointer transition-colors',
                      'hover:bg-[var(--color-surface-elevated,#f5f5f5)]',
                      isActive
                        ? 'border-[var(--color-primary,#2563eb)] bg-[var(--color-surface-elevated,#f5f5f5)]'
                        : 'border-[var(--color-border,#e5e5e5)]',
                    )}
                  >
                    <input
                      type="radio"
                      name="preferred-source"
                      value={opt.key}
                      checked={isActive}
                      onChange={() => choosePreferred(opt.key)}
                      className="w-4 h-4 accent-[var(--color-primary,#2563eb)]"
                    />
                    {opt.faviconDomain && (
                      <img
                        src={`https://icons.duckduckgo.com/ip3/${opt.faviconDomain}.ico`}
                        alt=""
                        className="w-4 h-4 shrink-0"
                        loading="lazy"
                      />
                    )}
                    <span className="text-sm font-medium truncate">
                      {opt.label}
                    </span>
                  </label>
                )
              })}
            </fieldset>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Enabled sources</h3>
            <p className="text-xs text-muted-foreground">
              Only enabled sources appear as swap icons. At least one must stay
              on.
            </p>
            <div className="space-y-2">
              {sources.map((opt) => {
                const enabled = draftEnabled.has(opt.key)
                const isPreferred = draftPreferred === opt.key
                const lockedOn =
                  isPreferred || (enabled && draftEnabled.size <= 1)
                const desc = SOURCE_DESCRIPTIONS[opt.key]
                return (
                  <label
                    key={opt.key}
                    className={cn(
                      'flex items-start gap-3 px-3 py-2.5 rounded-md border transition-colors',
                      lockedOn ? 'cursor-not-allowed' : 'cursor-pointer',
                      enabled
                        ? 'border-[var(--color-border,#e5e5e5)] bg-[var(--color-surface-elevated,#f5f5f5)]/50'
                        : 'border-[var(--color-border,#e5e5e5)] opacity-60',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={lockedOn}
                      onChange={() => toggleEnabled(opt.key)}
                      className="w-4 h-4 mt-0.5 accent-[var(--color-primary,#2563eb)]"
                    />
                    {opt.faviconDomain && (
                      <img
                        src={`https://icons.duckduckgo.com/ip3/${opt.faviconDomain}.ico`}
                        alt=""
                        className="w-4 h-4 shrink-0 mt-0.5"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{opt.label}</span>
                        {isPreferred && (
                          <span className="text-[10px] uppercase tracking-wide font-semibold text-[var(--color-primary,#2563eb)]">
                            Preferred
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

        <DialogFooter className="px-6 py-4 border-t border-[var(--color-border,#e5e5e5)] flex-row justify-end gap-2">
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

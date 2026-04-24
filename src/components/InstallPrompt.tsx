import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { track } from '@/lib/posthog'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed'
const VISIT_COUNT_KEY = 'pwa-visit-count'
const MIN_VISITS_BEFORE_PROMPT = 2

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (window.localStorage.getItem(DISMISSED_KEY) === 'true') {
      setDismissed(true)
      return
    }

    const raw = window.sessionStorage.getItem(VISIT_COUNT_KEY)
    const visits = raw ? parseInt(raw, 10) || 0 : 0
    window.sessionStorage.setItem(VISIT_COUNT_KEY, String(visits + 1))

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      const total = parseInt(
        window.sessionStorage.getItem(VISIT_COUNT_KEY) ?? '0',
        10,
      )
      if (total >= MIN_VISITS_BEFORE_PROMPT) {
        setEvent(e as BeforeInstallPromptEvent)
      }
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () =>
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  if (!event || dismissed) return null

  const handleInstall = async () => {
    await event.prompt()
    const { outcome } = await event.userChoice
    track('cta_clicked', {
      cta: 'pwa_install',
      location: `prompt:${outcome}`,
    })
    setEvent(null)
  }

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
    track('cta_clicked', {
      cta: 'pwa_install_dismiss',
      location: 'prompt',
    })
  }

  return (
    <div
      role="dialog"
      aria-label="Install this app"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-lg md:bottom-6"
    >
      <Download className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      <p className="flex-1 text-sm text-foreground">
        Install Connections Helper for one-tap access.
      </p>
      <Button size="sm" onClick={handleInstall}>
        Install
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

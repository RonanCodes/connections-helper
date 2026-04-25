import { useEffect, useState } from 'react'
import { Monitor, Globe } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type Environment = 'local' | 'external'

export interface EnvironmentBadgeProps {
  environment?: Environment
  className?: string
  showExternal?: boolean
}

function detectEnvironment(): Environment {
  if (typeof window === 'undefined') return 'local'
  const h = window.location.hostname
  if (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.startsWith('192.168.') ||
    h.startsWith('10.') ||
    h.startsWith('172.')
  )
    return 'local'
  return 'external'
}

const ENV_CONFIG: Record<
  Environment,
  { label: string; Icon: typeof Monitor; className: string }
> = {
  // Tailwind green-500/blue-500 on white text fail WCAG AA (~2.2:1). Darker
  // 700 variants give 5.6:1 / 8.6:1 so Lighthouse's color-contrast audit
  // passes. Visual difference is small; this badge is dev-only chrome.
  local: {
    label: 'Local Dev',
    Icon: Monitor,
    className: 'bg-green-700 text-white hover:bg-green-800',
  },
  external: {
    label: 'External',
    Icon: Globe,
    className: 'bg-blue-700 text-white hover:bg-blue-800',
  },
}

export function EnvironmentBadge({
  environment: envOverride,
  className = '',
  showExternal = true,
}: EnvironmentBadgeProps) {
  const [env, setEnv] = useState<Environment>('local')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setEnv(envOverride ?? detectEnvironment())
    setMounted(true)
  }, [envOverride])

  if (!mounted) return null
  if (env === 'external' && !showExternal) return null

  const config = ENV_CONFIG[env]
  const { Icon } = config
  const badgeClassName = [config.className, className].filter(Boolean).join(' ')

  return (
    <Badge className={badgeClassName}>
      <Icon size={14} />
      <span>{config.label}</span>
    </Badge>
  )
}

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
  local: {
    label: 'Local Dev',
    Icon: Monitor,
    className: 'bg-green-500 text-white hover:bg-green-600',
  },
  external: {
    label: 'External',
    Icon: Globe,
    className: 'bg-blue-500 text-white hover:bg-blue-600',
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

import { cn } from '@/lib/utils'

function Skeleton({ className, style, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md', className)}
      style={{
        backgroundColor: 'var(--accent, oklch(0 0 0 / 0.08))',
        ...style,
      }}
      {...props}
    />
  )
}

export { Skeleton }

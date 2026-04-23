import { env } from 'cloudflare:workers'

export async function rateLimitByIp(
  request: Request,
  scope: string,
): Promise<Response | null> {
  const limiter = env.API_RATE_LIMIT as unknown as
    | { limit: (opts: { key: string }) => Promise<{ success: boolean }> }
    | undefined
  if (!limiter) return null

  const ip =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'

  const { success } = await limiter.limit({ key: `${scope}:${ip}` })
  if (success) return null

  return new Response(
    JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
    },
  )
}

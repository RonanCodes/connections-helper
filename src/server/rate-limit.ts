import { env } from 'cloudflare:workers'

export async function rateLimitByIp(
  request: Request,
  scope: string,
): Promise<Response | null> {
  // Set RATE_LIMIT_BYPASS=1 in .dev.vars to disable the limiter on local dev
  // (so loadtest:local can measure raw throughput) or as a wrangler secret in
  // staging if you ever need to load-test prod from a single egress.
  if ((env as { RATE_LIMIT_BYPASS?: string }).RATE_LIMIT_BYPASS === '1') {
    return null
  }

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

import type { ZodType } from 'zod'

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status })
}

export function validate<T>(
  schema: ZodType<T>,
  input: unknown,
): { ok: true; data: T } | { ok: false; response: Response } {
  const parsed = schema.safeParse(input)
  if (parsed.success) return { ok: true, data: parsed.data }
  const first = parsed.error.issues[0]
  return { ok: false, response: jsonError(first.message) }
}

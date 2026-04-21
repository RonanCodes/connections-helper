// Server-only secrets for definition-source APIs.
//
// NOT exposed to the client bundle; only accessed from Workers handlers.
// Set via `wrangler secret put <KEY>` for production, or `.dev.vars` for local dev.
// If unset, the corresponding tier is skipped gracefully in the fallback chain.
declare namespace Cloudflare {
  interface Env {
    WORDNIK_API_KEY?: string
    MERRIAM_WEBSTER_API_KEY?: string
  }
}

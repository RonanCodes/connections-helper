import { createFileRoute } from '@tanstack/react-router'
import { ClientOnly } from '@tanstack/react-router'
import App from '../App'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <ClientOnly fallback={<div className="p-8 text-slate-500">Loading…</div>}>
      <App />
    </ClientOnly>
  )
}

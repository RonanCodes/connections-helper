import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Connections Helper</h1>
      <p className="mt-2 text-slate-600">
        Migration skeleton — UI port lands in task #42.
      </p>
    </main>
  )
}

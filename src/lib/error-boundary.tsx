import * as React from 'react'

interface Props {
  fallback: (ctx: { error: unknown }) => React.ReactNode
  onError?: (error: unknown) => void
  children: React.ReactNode
}

interface State {
  error: unknown
}

// Plain React ErrorBoundary so the critical-path bundle doesn't have to
// import @sentry/react. When Sentry is ready (deferred init), it attaches
// its own global handlers via captureException on window.error.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  componentDidCatch(error: unknown) {
    this.props.onError?.(error)
    void import('@sentry/react')
      .then((Sentry) => Sentry.captureException(error))
      .catch(() => {})
  }

  render() {
    if (this.state.error)
      return this.props.fallback({ error: this.state.error })
    return this.props.children
  }
}

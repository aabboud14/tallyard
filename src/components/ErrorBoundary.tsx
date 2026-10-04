import { Component, type ReactNode } from 'react'
import { ERROR_STATE } from '../domain/reference/labels'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-sm border border-oxide bg-oxide-tint p-4 text-sm" role="alert">
          <p className="font-medium">{ERROR_STATE}</p>
          <details className="mt-2">
            <summary>Error text</summary>
            <pre className="mt-1 whitespace-pre-wrap text-xs">{String(this.state.error.message || this.state.error)}</pre>
          </details>
        </div>
      )
    }
    return this.props.children
  }
}

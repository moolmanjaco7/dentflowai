// components/ErrorBoundary.js
import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // you could send this to Sentry later
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white border rounded-2xl p-6 max-w-lg text-slate-700">
            <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
            <p className="mt-2 text-sm">The page hit an error. Try reloading. If it persists, we’ll fix it fast.</p>
            <details className="mt-3 text-xs whitespace-pre-wrap opacity-80">
              {String(this.state.error)}
            </details>
            <button onClick={()=>location.reload()} className="mt-4 rounded-xl bg-blue-700 text-white px-4 py-2 hover:bg-blue-800">
              Reload
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}

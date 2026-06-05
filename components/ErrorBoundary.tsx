"use client"

import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] 组件崩溃:", error.message, errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[200px] flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-zinc-400 mb-3">页面出了点问题</p>
            <button
              type="button"
              onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
              className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-500 transition-colors"
            >
              重新加载
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

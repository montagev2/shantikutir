import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Something went wrong',
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Oops — something went wrong</h2>
          <p>{this.state.message}</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      )
    }
    return this.props.children
  }
}

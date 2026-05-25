import { Component, type ReactNode } from 'react';

interface State {
  err?: Error;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = {};

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: { componentStack?: string | null }) {
    // eslint-disable-next-line no-console
    console.error('[atlas] render crash', err, info);
  }

  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, fontFamily: 'Manrope, sans-serif', color: '#1a2238', background: '#f5ede0', minHeight: '100vh' }}>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, marginBottom: 12 }}>Trip Atlas crashed</h1>
          <p style={{ color: '#3a425a', marginBottom: 16 }}>Something failed while rendering this view.</p>
          <pre style={{ background: '#ede2cf', padding: 12, borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap', overflow: 'auto' }}>
{String(this.state.err?.stack || this.state.err)}
          </pre>
          <a href="./" style={{ display: 'inline-block', marginTop: 16, color: '#b5391f' }}>← reload home</a>
        </div>
      );
    }
    return this.props.children;
  }
}

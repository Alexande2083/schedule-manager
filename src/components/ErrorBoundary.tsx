import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches React render errors and displays a user-friendly fallback UI
 * instead of a blank white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(239,68,68,0.1)' }}>
          <AlertTriangle size={24} style={{ color: '#ef4444' }} />
        </div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
          页面出错了
        </h2>
        <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          渲染过程中发生了意外错误
        </p>
        {this.state.error && (
          <p className="text-xs mb-4 font-mono max-w-md break-all opacity-60"
            style={{ color: 'var(--color-text-muted)' }}>
            {this.state.error.message}
          </p>
        )}
        <button
          onClick={this.handleReset}
          className="btn-primary inline-flex items-center gap-2"
        >
          <RefreshCw size={14} />
          重试
        </button>
        <p className="text-[10px] mt-4" style={{ color: 'var(--color-text-muted)' }}>
          如果问题持续，请刷新页面或清除浏览器缓存。
        </p>
      </div>
    );
  }
}

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TraceX UI Error caught by boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 font-code-sm">
          <div className="max-w-md w-full p-6 rounded-xl bg-surface-container border border-error/40 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-error-container/20 text-error flex items-center justify-center mx-auto border border-error/40">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface font-headline-sm">
                Telemetry View Error
              </h2>
              <p className="text-xs text-on-surface-variant mt-1 font-body-sm">
                An unexpected state parsing error occurred while rendering this module.
              </p>
            </div>
            {this.state.error?.message && (
              <pre className="p-3 rounded-lg text-left text-[11px] bg-surface-container-lowest border border-outline-variant text-error/90 overflow-x-auto">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="btn-primary w-full justify-center"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Telemetry Console
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

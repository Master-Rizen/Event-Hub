import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="p-4 bg-red-100 text-red-600 rounded-full">
            <AlertCircle size={48} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#1a365d]">Something went wrong</h2>
            <p className="text-[#718096] max-w-xs mx-auto">
              The application encountered an unexpected error.
            </p>
          </div>
          {this.state.error && (
            <div className="p-3 bg-gray-50 rounded-lg text-xs font-mono text-gray-500 break-all max-w-md">
              {this.state.error.message}
            </div>
          )}
          <Button onClick={this.handleReset} className="flex items-center">
            <RefreshCw size={16} className="mr-2" />
            Reload Application
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

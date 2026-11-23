import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    let friendly = this.state.message;
    try {
      const parsed = JSON.parse(this.state.message) as { error?: string; path?: string };
      if (parsed.error) {
        friendly = `Cloud sync error (${parsed.path ?? 'firestore'}): ${parsed.error}`;
      }
    } catch {
      // keep raw message
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-6 text-slate-100">
        <div className="max-w-md w-full rounded-xl border border-rose-500/40 bg-slate-900 p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h2 className="text-lg font-bold text-white">Something went wrong</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed break-words">{friendly}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Recover View
          </button>
        </div>
      </div>
    );
  }
}

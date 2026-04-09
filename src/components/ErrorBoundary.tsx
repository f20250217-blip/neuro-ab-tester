"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message || "Unknown error" };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error.message, error.stack);
    console.error("Component stack:", errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#7c6cf0]/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#7c6cf0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h4l3-7 3.5 14 3-12 2.5 5H22" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#f0f0f8] mb-2">Something went wrong</h2>
          <p className="text-sm text-[#7a7a98] mb-2 max-w-sm">The results couldn&apos;t be displayed.</p>
          <p className="text-xs text-[#ff4060] mb-6 max-w-md font-mono break-all">{this.state.errorMsg}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, errorMsg: "" });
              this.props.onReset?.();
            }}
            className="px-6 py-3 rounded-xl bg-[#7c6cf0] text-white font-semibold text-sm hover:bg-[#8d7ff8] transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error.message);
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
          <p className="text-sm text-[#7a7a98] mb-6 max-w-sm">The results couldn&apos;t be displayed. This can happen on some devices due to memory constraints.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
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

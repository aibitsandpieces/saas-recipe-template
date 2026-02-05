'use client';

import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Error boundary component specifically for authentication-related errors
 * Provides user-friendly error messages and recovery options
 */
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Authentication Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <AuthErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

/**
 * Fallback component shown when authentication errors occur
 */
function AuthErrorFallback({ error }: { error?: Error }) {
  const router = useRouter();

  const handleSignOut = () => {
    window.location.href = '/sign-out';
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const isAuthError = error?.message?.includes('auth') ||
                      error?.message?.includes('token') ||
                      error?.message?.includes('JWT') ||
                      error?.message?.includes('Unauthorized');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">
            {isAuthError ? 'Authentication Issue' : 'Something went wrong'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600">
            {isAuthError ? (
              <>
                We're experiencing an authentication issue. This usually resolves by signing out and back in.
                {error?.message && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer">Technical details</summary>
                    <code className="mt-1 block bg-gray-100 p-2 rounded text-left">
                      {error.message}
                    </code>
                  </details>
                )}
              </>
            ) : (
              <>
                An unexpected error occurred. Please try refreshing the page or signing out and back in.
                {error?.message && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer">Technical details</summary>
                    <code className="mt-1 block bg-gray-100 p-2 rounded text-left">
                      {error.message}
                    </code>
                  </details>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col space-y-2">
            <Button onClick={handleSignOut} className="w-full" variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out & Retry
            </Button>
            <Button onClick={handleRetry} className="w-full" variant="default">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="text-xs text-gray-500"
            >
              Go to homepage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Hook version of the error boundary for functional components
 * Usage: const ErrorBoundary = useAuthErrorBoundary();
 */
export function useAuthErrorBoundary() {
  return ({ children, fallback }: Props) => (
    <AuthErrorBoundary fallback={fallback}>
      {children}
    </AuthErrorBoundary>
  );
}
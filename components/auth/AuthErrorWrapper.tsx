'use client';

import { AuthErrorBoundary } from './AuthErrorBoundary';

interface AuthErrorWrapperProps {
  children: React.ReactNode;
}

/**
 * Client-side wrapper for AuthErrorBoundary to use in server components
 */
export function AuthErrorWrapper({ children }: AuthErrorWrapperProps) {
  return (
    <AuthErrorBoundary>
      {children}
    </AuthErrorBoundary>
  );
}
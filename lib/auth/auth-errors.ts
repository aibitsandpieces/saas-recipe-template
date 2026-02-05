import { redirect } from 'next/navigation'

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: 'STALE_JWT' | 'INSUFFICIENT_PRIVILEGES' | 'NO_ORGANIZATION',
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

/**
 * Handle authentication errors with user-friendly recovery
 */
export function handleAuthError(error: AuthenticationError): never {
  console.error('Authentication error:', {
    code: error.code,
    message: error.message,
    details: error.details,
    timestamp: new Date().toISOString()
  })

  switch (error.code) {
    case 'STALE_JWT':
      // Redirect to sign-out/sign-in flow to refresh token
      redirect('/sign-out?reason=stale_token&redirect_url=' + encodeURIComponent('/dashboard'))

    case 'INSUFFICIENT_PRIVILEGES':
      // Redirect to dashboard with error message
      redirect('/dashboard?error=insufficient_privileges')

    case 'NO_ORGANIZATION':
      // Redirect to organization setup
      redirect('/setup-organization')

    default:
      redirect('/dashboard?error=auth_error')
  }
}
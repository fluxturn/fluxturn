/**
 * Environment-aware configuration management
 * Replaces hardcoded values and placeholder URLs with dynamic configurations
 */

export interface AppConfig {
  api: {
    baseUrl: string;
  };
  oauth: {
    callbackUrl: string;
  };
  mfa: {
    issuer: string;
    appName: string;
  };
  session: {
    duration: string;
    secure: boolean;
  };
  email: {
    defaultSender: string;
  };
}

/**
 * Get environment base URL for OAuth callbacks and API calls
 */
export const getEnvironmentBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Frontend environment - use VITE env variable if available
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiUrl) return apiUrl;

    const isDev = window.location.hostname === 'localhost';
    return isDev ? 'http://localhost:5005' : 'https://api.fluxturn.com';
  } else {
    // Backend environment
    return process.env.NODE_ENV === 'production'
      ? 'https://api.fluxturn.com'
      : process.env.API_BASE_URL || 'http://localhost:5005';
  }
};

/**
 * Get OAuth callback URL for a specific provider
 */
export const getOAuthCallbackUrl = (provider: string): string => {
  const baseUrl = getEnvironmentBaseUrl();
  return `${baseUrl}/api/v1/auth/oauth/${provider}/callback`;
};

/**
 * Get dynamic application configuration based on environment
 */
export const getAppConfig = (): AppConfig => {
  const isProd = process.env.NODE_ENV === 'production';
  const isDev = process.env.NODE_ENV === 'development';

  // Read from VITE environment variables
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ||
    (isProd ? 'https://api.fluxturn.com' : 'http://localhost:5005');

  return {
    api: {
      baseUrl: apiBaseUrl
    },
    oauth: {
      callbackUrl: isProd
        ? 'https://fluxturn.com/auth/callback'
        : 'http://localhost:5173/auth/callback'
    },
    mfa: {
      issuer: 'FluxTurn',
      appName: isProd ? 'FluxTurn' : 'FluxTurn (Development)'
    },
    session: {
      duration: isProd ? '24h' : '7d', // Longer sessions in development
      secure: isProd // Secure cookies only in production
    },
    email: {
      defaultSender: isProd ? 'noreply@fluxturn.com' : 'dev-noreply@fluxturn.com'
    }
  };
};

/**
 * Specific error messages to replace generic ones
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password. Please check your credentials and try again.',
  MFA_REQUIRED: 'Multi-factor authentication is required. Please enter your verification code.',
  ACCOUNT_LOCKED: 'Your account has been temporarily locked due to multiple failed login attempts. Please try again in 15 minutes.',
  EMAIL_NOT_VERIFIED: 'Please verify your email address before signing in. Check your inbox for a verification link.',
  INVITATION_EXPIRED: 'This invitation has expired. Please ask your team admin to send a new invitation.',
  OAUTH_CONFIG_MISSING: 'OAuth provider is not configured. Please contact your administrator.',
  INSUFFICIENT_PERMISSIONS: 'You don\'t have permission to perform this action.',
  RATE_LIMITED: 'Too many requests. Please wait a moment before trying again.',
  TOTP_SETUP_FAILED: 'Failed to generate TOTP secret. Please try again.',
  TOTP_VERIFICATION_FAILED: 'The verification code is incorrect or has expired. Please try again.',
  BACKUP_CODE_INVALID: 'Invalid backup code. Please check and try again.',
  SMS_SEND_FAILED: 'Failed to send SMS verification code. Please check your phone number.',
  JWT_EXPIRED: 'Your session has expired. Please sign in again.',
  JWT_INVALID: 'Invalid session token. Please sign in again.',
  EMAIL_SEND_FAILED: 'Failed to send email. Please try again later.',
  WEBHOOK_VALIDATION_FAILED: 'Webhook signature validation failed.',
} as const;


/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
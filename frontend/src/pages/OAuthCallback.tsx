import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth callback...');
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // Check for OAuth error (user cancelled or provider error)
      if (error) {
        setStatus('error');
        setMessage(`OAuth error: ${error}`);

        // Delete the broken credential from backend
        const credentialId = sessionStorage.getItem('oauth_credential_id');
        if (credentialId) {
          // Restore organization context for API call
          const organizationId = sessionStorage.getItem('oauth_organization_id');
          const projectId = sessionStorage.getItem('oauth_project_id');
          const appId = sessionStorage.getItem('oauth_app_id');
          if (organizationId) api.setOrganizationId(organizationId);
          if (projectId) api.setProjectId(projectId);
          if (appId) api.setAppId(appId);

          try {
            await api.delete(`/connectors/${credentialId}`);
            // console.log('Deleted broken credential after OAuth cancellation');
          } catch (deleteError) {
            console.error('Failed to delete credential:', deleteError);
          }
        }

        // Clean up sessionStorage on OAuth error
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_credential_id');
        sessionStorage.removeItem('oauth_code_verifier');
        sessionStorage.removeItem('oauth_organization_id');
        sessionStorage.removeItem('oauth_project_id');
        sessionStorage.removeItem('oauth_app_id');

        // Send error to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth_error',
            message: error
          }, window.location.origin);
        }

        setTimeout(() => window.close(), 3000);
        return;
      }

      // Validate required parameters
      if (!code || !state) {
        setStatus('error');
        setMessage('Missing required OAuth parameters');

        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth_error',
            message: 'Missing required OAuth parameters'
          }, window.location.origin);
        }

        setTimeout(() => window.close(), 3000);
        return;
      }

      // Verify state matches
      const savedState = sessionStorage.getItem('oauth_state');
      if (state !== savedState) {
        setStatus('error');
        setMessage('Invalid OAuth state - possible CSRF attack');

        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth_error',
            message: 'Invalid OAuth state'
          }, window.location.origin);
        }

        setTimeout(() => window.close(), 3000);
        return;
      }

      // Get credential ID
      const credentialId = sessionStorage.getItem('oauth_credential_id');
      if (!credentialId) {
        setStatus('error');
        setMessage('Missing credential ID');

        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth_error',
            message: 'Missing credential ID'
          }, window.location.origin);
        }

        setTimeout(() => window.close(), 3000);
        return;
      }

      // Get code_verifier for PKCE (required for Twitter OAuth 2.0)
      const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

      // Restore organization context for OAuth callback
      const organizationId = sessionStorage.getItem('oauth_organization_id');
      const projectId = sessionStorage.getItem('oauth_project_id');
      const appId = sessionStorage.getItem('oauth_app_id');

      if (organizationId) api.setOrganizationId(organizationId);
      if (projectId) api.setProjectId(projectId);
      if (appId) api.setAppId(appId);

      try {
        // Send code to backend
        const payload: { code: string; state: string; code_verifier?: string } = {
          code,
          state
        };

        // Include code_verifier if present (for PKCE)
        if (codeVerifier) {
          payload.code_verifier = codeVerifier;
        }

        await api.post(`/connectors/${credentialId}/oauth/callback`, payload);

        setStatus('success');
        setMessage('Successfully connected! Redirecting...');

        // Clear session storage
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_credential_id');
        sessionStorage.removeItem('oauth_code_verifier');
        sessionStorage.removeItem('oauth_organization_id');
        sessionStorage.removeItem('oauth_project_id');
        sessionStorage.removeItem('oauth_app_id');

        // Notify parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth_success',
            credentialId
          }, window.location.origin);
        }

        // Close window after success
        setTimeout(() => {
          if (window.opener) {
            window.close();
          } else {
            navigate('/dashboard');
          }
        }, 2000);

      } catch (error: unknown) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        const errObj = error as { response?: { data?: { message?: string } } };
        setMessage(errObj.response?.data?.message || 'Failed to complete OAuth flow');

        // Clean up sessionStorage - credential was already deleted by backend
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_credential_id');
        sessionStorage.removeItem('oauth_code_verifier');
        sessionStorage.removeItem('oauth_organization_id');
        sessionStorage.removeItem('oauth_project_id');
        sessionStorage.removeItem('oauth_app_id');

        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth_error',
            message: error.response?.data?.message || 'Failed to complete OAuth flow'
          }, window.location.origin);
        }

        setTimeout(() => window.close(), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-cyan-500 animate-spin" />
            <h2 className="text-xl font-semibold text-white mb-2">Connecting...</h2>
            <p className="text-gray-400">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold text-white mb-2">Success!</h2>
            <p className="text-gray-400">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
            <p className="text-gray-400">{message}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
};

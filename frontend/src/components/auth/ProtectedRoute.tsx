import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // If we're not loading and not authenticated, the context will handle redirect
    if (!loading && !isAuthenticated) {
      // console.log('User not authenticated, redirecting to login');
    }
  }, [loading, isAuthenticated]);

  // While checking auth status, show loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated after loading, redirect to login
  if (!isAuthenticated) {
    // console.log('Redirecting to login, saving attempted location:', location.pathname);
    // Save the attempted location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
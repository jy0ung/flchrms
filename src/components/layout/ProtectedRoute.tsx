import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types/hrms';
import { buildAuthRedirectHref } from '@/lib/auth-redirect';
import { RouteLoadingState } from '@/components/system';

interface ProtectedRouteProps {
  allowedRoles: AppRole[];
  children?: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { role, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <RouteLoadingState
        fullScreen
        title="Loading access rules"
        description="Checking your account and route permissions."
      />
    );
  }

  if (!user) {
    return (
      <Navigate
        to={buildAuthRedirectHref(location)}
        replace
        state={{ from: location }}
      />
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

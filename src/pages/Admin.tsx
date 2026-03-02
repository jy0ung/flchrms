import { Navigate } from 'react-router-dom';

/**
 * Legacy Admin page — redirects to the new admin dashboard.
 * Kept as a safety-net fallback; the primary redirect is in App.tsx routing.
 */
export default function Admin() {
  return <Navigate to="/admin/dashboard" replace />;
}

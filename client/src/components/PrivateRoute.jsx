import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Route accessibili anche a utenti loggati ma non ancora premium.
// Tutte le altre route private redirezionano a /paywall.
const PAYWALL_EXEMPT = new Set([
  '/paywall',
  '/premium-success',
  '/onboarding',
  '/profile',
  '/privacy',
  '/terms',
]);

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mobile-container items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!user.isPremium && !PAYWALL_EXEMPT.has(location.pathname)) {
    return <Navigate to="/paywall" replace />;
  }

  return children;
}

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Route accessibili anche a utenti loggati ma non ancora premium.
// Strategia "freemium": l'utente atterra in /home con il proprio contatore,
// badge e risparmio. Il paywall scatta solo quando tocca una funzione
// premium (chat AI = /craving, diario, tools, stats avanzate).
const PAYWALL_EXEMPT = new Set([
  '/paywall',
  '/premium-success',
  '/onboarding',
  '/home',
  '/profile',
  '/privacy',
  '/terms',
  '/admin/promo-codes',
]);

// Route accessibili anche se l'utente NON ha ancora completato l'onboarding
// (quitDate ancora null). Tutto il resto forza il redirect a /onboarding,
// così che chi clicca il link dalla welcome mail prima di finire le domande
// non possa saltarle.
const ONBOARDING_EXEMPT = new Set([
  '/onboarding',
  '/profile',
  '/privacy',
  '/terms',
  '/admin/promo-codes',
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

  // Onboarding incompleto → forza il completamento prima di tutto.
  if (!user.quitDate && !ONBOARDING_EXEMPT.has(location.pathname)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!user.isPremium && !PAYWALL_EXEMPT.has(location.pathname)) {
    return <Navigate to="/paywall" replace />;
  }

  return children;
}

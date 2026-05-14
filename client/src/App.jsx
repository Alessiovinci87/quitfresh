import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Craving from './pages/Craving';
import Profile from './pages/Profile';
import Tools from './pages/Tools';
import Diary from './pages/Diary';
import Stats from './pages/Stats';
import PremiumSuccess from './pages/PremiumSuccess';
import Paywall from './pages/Paywall';
import Admin from './pages/Admin';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

function SplashScreen() {
  const baseUrl = import.meta.env.BASE_URL || '/';
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-gradient-to-br from-cream-50 via-cream-100 to-sage-50"
      style={{ animation: 'qfSplashFade 1.8s ease-out forwards' }}
    >
      <style>{`
        @keyframes qfSplashFade {
          0%, 70% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes qfLogoEnter {
          0% { opacity: 0; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes qfTitleEnter {
          0%, 30% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="text-center">
        <img
          src={`${baseUrl}apple-touch-icon.png`}
          alt="QuitFresh"
          className="w-28 h-28 rounded-3xl shadow-card mx-auto mb-4"
          style={{ animation: 'qfLogoEnter 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
        />
        <p
          className="font-display text-2xl font-semibold text-sage-900"
          style={{ animation: 'qfTitleEnter 800ms ease-out forwards' }}
        >
          QuitFresh
        </p>
      </div>
    </div>
  );
}

function AppShell() {
  const location = useLocation();
  const isChat = location.pathname === '/craving';
  const [showSplash, setShowSplash] = useState(true);

  // Splash screen iniziale: 1.8s al primo mount, poi route normale.
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(t);
  }, []);

  if (showSplash) return <SplashScreen />;

  // Per la chat usiamo visualViewport.height (sempre aggiornato all'apertura
  // della tastiera iOS Safari, anche su versioni vecchie che non supportano
  // 100dvh). Il container shrinka, l'input flex-shrink-0 rimane sopra la
  // tastiera. Pattern usato da WhatsApp/Telegram web.
  const [chatHeight, setChatHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );

  useEffect(() => {
    if (!isChat) return;
    const vv = window.visualViewport;
    const update = () => setChatHeight(vv ? vv.height : window.innerHeight);
    update();
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
      return () => {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      };
    } else {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
  }, [isChat]);

  const wrapperStyle = isChat ? { height: `${chatHeight}px` } : undefined;
  const wrapperClass = isChat
    ? "w-full flex flex-col overflow-hidden"
    : "min-h-screen bg-gray-100 flex items-start justify-center";

  return (
    <>
      <div className={wrapperClass} style={wrapperStyle}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/admin/promo-codes" element={<PrivateRoute><Admin /></PrivateRoute>} />
          <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
          <Route path="/home" element={<PrivateRoute><Layout><Home /></Layout></PrivateRoute>} />
          <Route path="/craving" element={<PrivateRoute><Craving /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
          <Route path="/tools" element={<PrivateRoute><Layout><Tools /></Layout></PrivateRoute>} />
          <Route path="/diary" element={<PrivateRoute><Layout><Diary /></Layout></PrivateRoute>} />
          <Route path="/stats" element={<PrivateRoute><Layout><Stats /></Layout></PrivateRoute>} />
          <Route path="/paywall" element={<PrivateRoute><Paywall /></PrivateRoute>} />
          <Route path="/premium-success" element={<PrivateRoute><PremiumSuccess /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
      `}</style>
      <div className="text-center">
        {/* Il logo include gia' la scritta "QuitFresh" nel design, niente
            <p> sotto per evitare ripetizione. */}
        <img
          src={`${baseUrl}apple-touch-icon.png`}
          alt="QuitFresh"
          className="w-64 h-64 sm:w-72 sm:h-72 rounded-[2.25rem] shadow-card mx-auto"
          style={{ animation: 'qfLogoEnter 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
        />
      </div>
    </div>
  );
}

function UpdateBanner() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onReady = () => setReady(true);
    window.addEventListener('sw-update-ready', onReady);
    return () => window.removeEventListener('sw-update-ready', onReady);
  }, []);

  if (!ready) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0px)',
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: '#6B8F71',
        color: '#ffffff',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: 500 }}>Nuova versione disponibile</span>
      <button
        onClick={() => window.applySwUpdate?.()}
        style={{
          padding: '6px 14px',
          backgroundColor: '#ffffff',
          color: '#4a6b50',
          border: 'none',
          borderRadius: '20px',
          fontWeight: 700,
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        Aggiorna
      </button>
    </div>
  );
}

function AppShell() {
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSplashVisible(false), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {splashVisible && <SplashScreen />}
      <UpdateBanner />
      <div className="min-h-screen bg-gray-100 flex items-start justify-center">
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

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

function AppShell() {
  const location = useLocation();
  const isChat = location.pathname === '/craving';

  // Wrapper diverso per chat: container che riempie ESATTAMENTE il viewport
  // visibile (anche con tastiera aperta), flex-col, niente min-height growth.
  // Pattern WhatsApp/Telegram web — il browser shrinka il layout viewport
  // con la tastiera (via 'interactive-widget=resizes-content'), il container
  // shrinka, l'input rimane sopra la tastiera.
  const wrapperClass = isChat
    ? "chat-shell w-full flex flex-col"
    : "min-h-screen bg-gray-100 flex items-start justify-center";

  return (
    <>
      <style>{`
        /* triple fallback per Safari iOS */
        .chat-shell {
          height: 100vh;
          height: 100svh;
          height: 100dvh;
        }
      `}</style>
      <div className={wrapperClass}>
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

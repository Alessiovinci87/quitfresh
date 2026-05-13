import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

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

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <div className="min-h-screen bg-gray-100 flex items-start justify-center">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
            <Route path="/home" element={<PrivateRoute><Layout><Home /></Layout></PrivateRoute>} />
            <Route path="/craving" element={<PrivateRoute><Layout><Craving /></Layout></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
            <Route path="/tools" element={<PrivateRoute><Layout><Tools /></Layout></PrivateRoute>} />
            <Route path="/diary" element={<PrivateRoute><Layout><Diary /></Layout></PrivateRoute>} />
            <Route path="/stats" element={<PrivateRoute><Layout><Stats /></Layout></PrivateRoute>} />
            <Route path="/premium-success" element={<PrivateRoute><PremiumSuccess /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

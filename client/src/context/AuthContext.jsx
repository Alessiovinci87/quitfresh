import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('qf_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.auth.me()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem('qf_token'))
      .finally(() => setLoading(false));
  }, []);

  function login(token, userData) {
    localStorage.setItem('qf_token', token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('qf_token');
    setUser(null);
  }

  function updateUser(updates) {
    setUser((prev) => ({ ...prev, ...updates }));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro AuthProvider');
  return ctx;
}

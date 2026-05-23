import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { initClarity } from '../lib/clarity';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('qf_token');
    if (!token) {
      // Anonimo: tracciamo subito (nessun motivo per aspettare).
      initClarity();
      setLoading(false);
      return;
    }
    api.auth.me()
      .then(({ user }) => {
        setUser(user);
        // Decisione tracking dopo aver risolto /me: skip per admin.
        if (!user?.isAdmin) initClarity();
      })
      .catch(() => {
        localStorage.removeItem('qf_token');
        // Token invalido → utente di fatto anonimo: tracciamo.
        initClarity();
      })
      .finally(() => setLoading(false));
  }, []);

  function login(token, userData) {
    localStorage.setItem('qf_token', token);
    setUser(userData);
    // Login da pagina pubblica (Clarity gia' inizializzato come anonimo).
    // initClarity e' idempotente: non lo ricarica. Per gli admin che entrano
    // da anonimo a loggato, Clarity resta attivo per la sessione corrente —
    // sara' escluso dal prossimo reload. Trade-off accettabile: alternativa
    // sarebbe ricaricare la pagina al login, peggio per UX.
    if (!userData?.isAdmin) initClarity();
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

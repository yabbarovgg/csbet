// src/auth/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  balance: number;
  settings: {
    showGradient?: boolean;
    avatar?: string;
  };
  history: any[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
  updateBalance: (newBalance: number) => Promise<void>;
  addToHistory: (bet: any) => Promise<void>;
  updateBetStatus: (betId: string, status: 'won' | 'lost') => Promise<void>;
  setAvatar: (avatarUrl: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const saved = localStorage.getItem('csbet_auth');
      if (saved === 'true') {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', 'admin')
          .single();
        
        if (data) {
          setUser(data);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('csbet_auth');
        }
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const login = async (password: string) => {
    if (password !== import.meta.env.VITE_MASTER_PASSWORD) {
      throw new Error('Неверный пароль');
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 'admin')
      .single();

    if (error && error.code === 'PGRST116') {
      const {  newUser } = await supabase
        .from('users')
        .insert({ id: 'admin', balance: 15420, settings: {}, history: [] })
        .select()
        .single();
      setUser(newUser);
    } else if (error) {
      throw error;
    } else {
      setUser(data);
    }

    localStorage.setItem('csbet_auth', 'true');
    setIsAuthenticated(true);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('csbet_auth');
    setUser(null);
    setIsAuthenticated(false);
  };

  // 🔹 Простое обновление баланса
  const updateBalance = async (newBalance: number) => {
    setUser(prev => prev ? { ...prev, balance: newBalance } : null);
    await supabase.from('users').update({ balance: newBalance }).eq('id', 'admin');
  };

  // 🔹 Добавление ставки в историю (читаем текущую из БД)
  const addToHistory = async (bet: any) => {
    // Читаем актуальную историю из БД
    const {  currentData } = await supabase
      .from('users')
      .select('history')
      .eq('id', 'admin')
      .single();
    
    const currentHistory = currentData?.history || [];
    const newHistory = [bet, ...currentHistory];
    
    // Обновляем локально и в БД
    setUser(prev => prev ? { ...prev, history: newHistory } : null);
    await supabase.from('users').update({ history: newHistory }).eq('id', 'admin');
  };

  // 🔹 Обновление статуса ставки
  const updateBetStatus = async (betId: string, status: 'won' | 'lost') => {
    const {  currentData } = await supabase
      .from('users')
      .select('history')
      .eq('id', 'admin')
      .single();
    
    const currentHistory = currentData?.history || [];
    const updatedHistory = currentHistory.map((b: any) => 
      b.id === betId ? { ...b, status } : b
    );
    
    setUser(prev => prev ? { ...prev, history: updatedHistory } : null);
    await supabase.from('users').update({ history: updatedHistory }).eq('id', 'admin');
  };

  // 🔹 Быстрое сохранение аватарки (оптимистичное)
  const setAvatar = async (avatarUrl: string) => {
    if (!user) return;
    
    // Сразу обновляем UI
    const newSettings = { ...(user.settings || {}), avatar: avatarUrl };
    setUser(prev => prev ? { ...prev, settings: newSettings } : null);
    
    // Сохраняем в фоне (не ждём)
    supabase.from('users').update({ settings: newSettings }).eq('id', 'admin')
      .then(({ error }) => {
        if (error) {
          console.error('❌ Ошибка сохранения аватарки:', error);
          // Откат при ошибке
          setUser(prev => prev || null);
        }
      });
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      loading, 
      login, 
      logout,
      updateBalance, 
      addToHistory,
      updateBetStatus,
      setAvatar,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
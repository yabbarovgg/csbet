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
  updateBalance: (newBalance: number | ((prev: number) => number)) => Promise<void>;
  updateHistory: (newHistory: any[] | ((prev: any[]) => any[])) => Promise<void>;
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

  // 🔹 Поддержка числа или функции для баланса
  const updateBalance = async (newBalance: number | ((prev: number) => number)) => {
    if (!user) return;
    const bal = typeof newBalance === 'function' ? newBalance(user.balance) : newBalance;
    setUser(prev => prev ? { ...prev, balance: bal } : null);
    
    const { error } = await supabase
      .from('users')
      .update({ balance: bal })
      .eq('id', 'admin');
    if (error) console.error('❌ Ошибка обновления баланса:', error);
  };

  // 🔹 Поддержка массива или функции для истории
  const updateHistory = async (newHistory: any[] | ((prev: any[]) => any[])) => {
    if (!user) return;
    const historyArray = typeof newHistory === 'function' ? newHistory(user.history || []) : newHistory;
    setUser(prev => prev ? { ...prev, history: historyArray } : null);
    
    const { error } = await supabase
      .from('users')
      .update({ history: historyArray })
      .eq('id', 'admin');
    if (error) console.error('❌ Ошибка сохранения истории:', error);
  };

  const setAvatar = async (avatarUrl: string) => {
    if (!user) return;
    try {
      const newSettings = { ...(user.settings || {}), avatar: avatarUrl };
      setUser(prev => prev ? { ...prev, settings: newSettings } : null);
      const { error } = await supabase.from('users').update({ settings: newSettings }).eq('id', 'admin');
      if (error) throw error;
    } catch (err) {
      console.error('❌ Ошибка сохранения аватарки:', err);
      setUser(prev => prev || null);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      loading, 
      login, 
      logout,
      updateBalance, 
      updateHistory,
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
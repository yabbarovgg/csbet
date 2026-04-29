// src/auth/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  nickname: string;
  balance: number;
  settings: { showGradient?: boolean; avatar?: string | null };
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
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const normalizeUser = ( any): User => ({
    id: data.id,
    nickname: data.nickname || 'Игрок',
    balance: data.balance ?? 0,
    settings: data.settings || { showGradient: true, avatar: null },
    history: data.history || []
  });

  // 🔹 Проверка сессии при старте (с защитой от зависания)
  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      const saved = localStorage.getItem('csbet_auth');
      if (saved === 'true') {
        try {
          const { data, error } = await supabase.from('users').select('*').eq('id', 'admin').single();
          if (isMounted && data && !error) {
            setUser(normalizeUser(data));
            setIsAuthenticated(true);
          } else if (isMounted) {
            localStorage.removeItem('csbet_auth');
          }
        } catch {
          if (isMounted) localStorage.removeItem('csbet_auth');
        }
      }
      if (isMounted) setLoading(false);
    };
    checkSession();
    return () => { isMounted = false; };
  }, []);

  // 🔹 БУЛЕПРОФНАЯ АВТОРИЗАЦИЯ
  const login = async (password: string) => {
    if (password !== import.meta.env.VITE_MASTER_PASSWORD) throw new Error('Неверный пароль');

    // 1. Пытаемся прочитать
    let { data, error } = await supabase.from('users').select('*').eq('id', 'admin').single();

    // 2. Если не нашли -> создаём
    if (!data) {
      try {
        await supabase.from('users').insert({
          id: 'admin',
          balance: 15420,
          settings: {},
          history: [],
          nickname: 'Игрок'
        });
        const {  fresh } = await supabase.from('users').select('*').eq('id', 'admin').single();
        data = fresh;
      } catch (err: any) {
        // 🔹 Если Postgres выдал ошибку дубликата (23505) -> просто читаем существующего
        if (err.code === '23505' || err.message?.includes('duplicate')) {
          const {  existing } = await supabase.from('users').select('*').eq('id', 'admin').single();
          data = existing;
        } else {
          throw err;
        }
      }
    }

    if (!data) throw new Error('Не удалось загрузить аккаунт');
    
    setUser(normalizeUser(data));
    localStorage.setItem('csbet_auth', 'true');
    setIsAuthenticated(true);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('csbet_auth');
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = async (updates: Partial<User>) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    setUser({ ...currentUser, ...updates });
    supabase.from('users').update(updates).eq('id', 'admin');
  };

  const updateBalance = async (newBalance: number) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    setUser(prev => prev ? { ...prev, balance: newBalance } : null);
    await supabase.from('users').update({ balance: newBalance }).eq('id', 'admin');
  };

  const addToHistory = async (bet: any) => {
    const { data } = await supabase.from('users').select('history').eq('id', 'admin').single();
    const currentHistory = data?.history || [];
    const newHistory = [bet, ...currentHistory];
    setUser(prev => prev ? { ...prev, history: newHistory } : null);
    await supabase.from('users').update({ history: newHistory }).eq('id', 'admin');
  };

  const updateBetStatus = async (betId: string, status: 'won' | 'lost') => {
    const { data } = await supabase.from('users').select('history').eq('id', 'admin').single();
    if (!data) return;
    const newHistory = data.history.map((b: any) => b.id === betId ? { ...b, status } : b);
    setUser(prev => prev ? { ...prev, history: newHistory } : null);
    await supabase.from('users').update({ history: newHistory }).eq('id', 'admin');
  };

  const setAvatar = async (avatarUrl: string) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    const newSettings = { ...(currentUser.settings || {}), avatar: avatarUrl };
    setUser(prev => prev ? { ...prev, settings: newSettings } : null);
    supabase.from('users').update({ settings: newSettings }).eq('id', 'admin');
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, user, loading, login, logout, 
      updateBalance, addToHistory, updateBetStatus, setAvatar, updateUser 
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
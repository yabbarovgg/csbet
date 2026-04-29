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

  const normalizeUser = (userData: any): User => ({
    id: userData.id,
    nickname: userData.nickname || 'Игрок',
    balance: userData.balance ?? 0,
    settings: userData.settings || { showGradient: true, avatar: null },
    history: userData.history || []
  });

  // 🔹 ВОССТАНОВЛЕНИЕ СЕССИИ С ДИАГНОСТИКОЙ
  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      console.log('🔍 [Auth] Проверка сессии при загрузке...');
      const saved = localStorage.getItem('csbet_auth');
      
      if (saved === 'true') {
        try {
          const res = await supabase.from('users').select('*').eq('id', 'admin').single();
          console.log('📥 [Auth] Ответ Supabase:', res);

          if (res.error) {
            console.error('❌ [Auth] Ошибка Supabase при загрузке:', res.error);
            // НЕ очищаем localStorage при ошибке, чтобы пользователь мог войти заново
          } else if (res.data && isMounted) {
            console.log('✅ [Auth] Сессия успешно восстановлена!');
            setUser(normalizeUser(res.data));
            setIsAuthenticated(true);
          }
        } catch (err) {
          console.error('❌ [Auth] Исключение при checkSession:', err);
        }
      }
      if (isMounted) setLoading(false);
    };
    checkSession();
    return () => { isMounted = false; };
  }, []);

  const login = async (password: string) => {
    if (password !== import.meta.env.VITE_MASTER_PASSWORD) throw new Error('Неверный пароль');

    let userData: any = null;
    const resFind = await supabase.from('users').select('*').eq('id', 'admin').single();
    userData = resFind.data;

    if (!userData) {
      try {
        await supabase.from('users').insert({
          id: 'admin',
          balance: 15420,
          settings: {},
          history: [],
          nickname: 'Игрок'
        });
        const resCreate = await supabase.from('users').select('*').eq('id', 'admin').single();
        userData = resCreate.data;
      } catch (err: any) {
        if (err.code === '23505' || err.message?.includes('duplicate')) {
          const resFetch = await supabase.from('users').select('*').eq('id', 'admin').single();
          userData = resFetch.data;
        } else {
          throw err;
        }
      }
    }

    if (!userData) throw new Error('Не удалось загрузить аккаунт');
    
    setUser(normalizeUser(userData));
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
    const res = await supabase.from('users').select('history').eq('id', 'admin').single();
    const currentHistory = res.data?.history || [];
    const newHistory = [bet, ...currentHistory];
    setUser(prev => prev ? { ...prev, history: newHistory } : null);
    await supabase.from('users').update({ history: newHistory }).eq('id', 'admin');
  };

  const updateBetStatus = async (betId: string, status: 'won' | 'lost') => {
    const res = await supabase.from('users').select('history').eq('id', 'admin').single();
    if (!res.data) return;
    const newHistory = res.data.history.map((b: any) => b.id === betId ? { ...b, status } : b);
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
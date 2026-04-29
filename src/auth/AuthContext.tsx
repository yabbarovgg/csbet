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

  // 🔹 Восстановление сессии
  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      const saved = localStorage.getItem('csbet_auth');
      if (saved === 'true') {
        const res = await supabase.from('users').select('*').eq('id', 'admin').single();
        if (res.data && !res.error && isMounted) {
          setUser(normalizeUser(res.data));
          setIsAuthenticated(true);
        }
      }
      if (isMounted) setLoading(false);
    };
    checkSession();
    return () => { isMounted = false; };
  }, []);

  // 🔹 Вспомогательная функция: принудительно обновить данные из БД
  const refreshUserData = async () => {
    const res = await supabase.from('users').select('*').eq('id', 'admin').single();
    if (res.data && !res.error) {
      setUser(normalizeUser(res.data));
      return true;
    }
    console.error('❌ [Refresh] Не удалось обновить данные:', res.error);
    return false;
  };

  const login = async (password: string) => {
    if (password !== import.meta.env.VITE_MASTER_PASSWORD) throw new Error('Неверный пароль');

    let userData: any = null;
    const resFind = await supabase.from('users').select('*').eq('id', 'admin').single();
    userData = resFind.data;

    if (!userData) {
      await supabase.from('users').insert({
        id: 'admin',
        balance: 15420,
        settings: {},
        history: [],
        nickname: 'Игрок'
      });
      const resCreate = await supabase.from('users').select('*').eq('id', 'admin').single();
      userData = resCreate.data;
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

  // 🔹 ИСПРАВЛЕНО: ждём ответа от БД + принудительное обновление
  const updateUser = async (updates: Partial<User>) => {
    console.log('💾 [Update] Сохраняю изменения:', updates);
    
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', 'admin');
    
    if (error) {
      console.error('❌ [Update] Ошибка сохранения:', error);
      alert('Не удалось сохранить: ' + error.message);
      return;
    }

    // Принудительно обновляем данные из БД
    await refreshUserData();
    console.log('✅ [Update] Успешно сохранено и обновлено');
  };

  const updateBalance = async (newBalance: number) => {
    console.log('💰 [Balance] Обновляю баланс:', newBalance);
    
    const { error } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', 'admin');
    
    if (error) {
      console.error('❌ [Balance] Ошибка:', error);
      return;
    }

    await refreshUserData();
  };

  const addToHistory = async (bet: any) => {
    console.log('📝 [History] Добавляю ставку:', bet);
    
    // Читаем текущую историю
    const res = await supabase.from('users').select('history').eq('id', 'admin').single();
    if (res.error) {
      console.error('❌ [History] Ошибка чтения:', res.error);
      return;
    }

    const currentHistory = res.data?.history || [];
    const newHistory = [bet, ...currentHistory];

    // Записываем обновлённую историю
    const { error } = await supabase
      .from('users')
      .update({ history: newHistory })
      .eq('id', 'admin');
    
    if (error) {
      console.error('❌ [History] Ошибка записи:', error);
      alert('Не удалось сохранить ставку: ' + error.message);
      return;
    }

    await refreshUserData();
    console.log('✅ [History] Ставка сохранена');
  };

  const updateBetStatus = async (betId: string, status: 'won' | 'lost') => {
    console.log('🎯 [Status] Обновляю статус ставки:', betId, status);
    
    const res = await supabase.from('users').select('history').eq('id', 'admin').single();
    if (res.error || !res.data) {
      console.error('❌ [Status] Ошибка чтения:', res.error);
      return;
    }

    const newHistory = res.data.history.map((b: any) => 
      b.id === betId ? { ...b, status } : b
    );

    const { error } = await supabase
      .from('users')
      .update({ history: newHistory })
      .eq('id', 'admin');
    
    if (error) {
      console.error('❌ [Status] Ошибка записи:', error);
      return;
    }

    await refreshUserData();
    console.log('✅ [Status] Статус обновлён');
  };

  const setAvatar = async (avatarUrl: string) => {
    console.log('🖼️ [Avatar] Сохраняю аватарку');
    
    const currentUser = userRef.current;
    if (!currentUser) return;
    
    const newSettings = { ...(currentUser.settings || {}), avatar: avatarUrl };
    
    const { error } = await supabase
      .from('users')
      .update({ settings: newSettings })
      .eq('id', 'admin');
    
    if (error) {
      console.error('❌ [Avatar] Ошибка:', error);
      alert('Не удалось сохранить аватарку: ' + error.message);
      return;
    }

    await refreshUserData();
    console.log('✅ [Avatar] Аватарка сохранена');
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
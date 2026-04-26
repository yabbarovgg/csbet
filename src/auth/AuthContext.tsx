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

  // 🔹 Нормализация данных из БД (страховка от null/undefined)
  const normalizeUser = (data: any): User => ({
    id: data.id,
    nickname: data.nickname || 'Игрок',
    balance: data.balance ?? 0,
    settings: data.settings || { showGradient: true, avatar: null },
    history: data.history || []
  });

  // Загрузка сессии при старте
  useEffect(() => {
    const checkSession = async () => {
      console.log('🔍 [Auth] Проверка сессии...');
      const saved = localStorage.getItem('csbet_auth');
      if (saved === 'true') {
        const { data, error } = await supabase.from('users').select('*').eq('id', 'admin').single();
        console.log('📥 [Auth] Данные из БД:', data, 'Ошибка:', error);
        
        if (data && !error) {
          setUser(normalizeUser(data));
          setIsAuthenticated(true);
        } else {
          console.warn('⚠️ [Auth] Аккаунт не найден, очищаю сессию');
          localStorage.removeItem('csbet_auth');
        }
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const login = async (password: string) => {
    if (password !== import.meta.env.VITE_MASTER_PASSWORD) throw new Error('Неверный пароль');

    let { data, error } = await supabase.from('users').select('*').eq('id', 'admin').single();

    if (error || !data) {
      console.log('🆕 [Auth] Аккаунт не найден. Создаю новый...');
      const {  newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: 'admin',
          balance: 15420,
          settings: { showGradient: true, avatar: null },
          history: [],
          nickname: 'Игрок'
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ [Auth] Ошибка создания:', insertError);
        throw insertError;
      }
      data = newUser;
    }

    setUser(normalizeUser(data));
    localStorage.setItem('csbet_auth', 'true');
    setIsAuthenticated(true);
    setLoading(false);
    console.log('✅ [Auth] Успешный вход');
  };

  const logout = () => {
    localStorage.removeItem('csbet_auth');
    setUser(null);
    setIsAuthenticated(false);
  };

  // 🔹 НАДЁЖНОЕ обновление пользователя (ник, настройки)
  const updateUser = async (updates: Partial<User>) => {
    const currentUser = userRef.current;
    if (!currentUser) return;

    // 1. Оптимистично обновляем UI
    const updated = { ...currentUser, ...updates };
    setUser(updated);

    // 2. Ждем ответа от Supabase
    const { error } = await supabase.from('users').update(updates).eq('id', 'admin');
    if (error) {
      console.error('❌ [Auth] Ошибка сохранения в БД:', error);
      // Откатываем UI, если база отклонила
      setUser(currentUser);
      alert(`Не удалось сохранить: ${error.message}`);
    } else {
      console.log('✅ [Auth] Успешно сохранено в БД:', updates);
    }
  };

  // 🔹 НАДЁЖНОЕ обновление баланса
  const updateBalance = async (newBalance: number) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    setUser(prev => prev ? { ...prev, balance: newBalance } : null);
    
    const { error } = await supabase.from('users').update({ balance: newBalance }).eq('id', 'admin');
    if (error) {
      console.error('❌ [Auth] Ошибка баланса:', error);
      setUser(prev => prev ? { ...prev, balance: currentUser.balance } : null);
    }
  };

  const addToHistory = async (bet: any) => {
    const { data, error } = await supabase.from('users').select('history').eq('id', 'admin').single();
    if (error) return console.error('❌ [Auth] Чтение истории:', error);
    
    const currentHistory = data?.history || [];
    const newHistory = [bet, ...currentHistory];
    setUser(prev => prev ? { ...prev, history: newHistory } : null);
    
    const { error: updateError } = await supabase.from('users').update({ history: newHistory }).eq('id', 'admin');
    if (updateError) console.error('❌ [Auth] Запись истории:', updateError);
  };

  const updateBetStatus = async (betId: string, status: 'won' | 'lost') => {
    const { data } = await supabase.from('users').select('history').eq('id', 'admin').single();
    if (!data) return;
    
    const newHistory = data.history.map((b: any) => b.id === betId ? { ...b, status } : b);
    setUser(prev => prev ? { ...prev, history: newHistory } : null);
    await supabase.from('users').update({ history: newHistory }).eq('id', 'admin');
  };

  // 🔹 НАДЁЖНОЕ сохранение аватарки
  const setAvatar = async (avatarUrl: string) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    
    const newSettings = { ...(currentUser.settings || {}), avatar: avatarUrl };
    setUser(prev => prev ? { ...prev, settings: newSettings } : null);
    
    const { error } = await supabase.from('users').update({ settings: newSettings }).eq('id', 'admin');
    if (error) {
      console.error('❌ [Auth] Ошибка аватарки:', error);
      setUser(prev => prev ? { ...prev, settings: currentUser.settings } : null);
      alert('Не удалось сохранить аватарку: ' + error.message);
    } else {
      console.log('✅ [Auth] Аватарка сохранена');
    }
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
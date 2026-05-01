import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  nickname: string;
  balance: number;
  settings: { showGradient?: boolean; avatar?: string | null };
  history: any[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
  updateBalance: (newBalance: number) => Promise<void>;
  addToHistory: (bet: any) => Promise<void>;
  updateBetStatus: (betId: string, status: 'won' | 'lost') => Promise<void>;
  setAvatar: (url: string) => Promise<void>;
  setNickname: (nick: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem('csbet_auth');
        if (saved !== 'true') {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', 'admin')
          .single();

        if (error || !data) {
          console.warn('Не удалось загрузить пользователя:', error?.message);
          localStorage.removeItem('csbet_auth');
          setLoading(false);
          return;
        }

        setUser({
          id: data.id,
          nickname: data.nickname || 'Игрок',
          balance: data.balance ?? 0,
          settings: data.settings || { showGradient: true, avatar: null },
          history: data.history || []
        });
      } catch (err) {
        console.error('Ошибка инициализации:', err);
        localStorage.removeItem('csbet_auth');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (password: string) => {
    if (password !== import.meta.env.VITE_MASTER_PASSWORD) {
      throw new Error('Неверный пароль');
    }

    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('id', 'admin')
      .single();

    let userData = existing;

    if (!userData) {
      const { data: created, error } = await supabase
        .from('users')
        .insert({
          id: 'admin',
          nickname: 'Игрок',
          balance: 15420,
          settings: { showGradient: true, avatar: null },
          history: []
        })
        .select()
        .single();

      if (error) throw error;
      userData = created;
    }

    setUser({
      id: userData.id,
      nickname: userData.nickname || 'Игрок',
      balance: userData.balance ?? 0,
      settings: userData.settings || { showGradient: true, avatar: null },
      history: userData.history || []
    });

    localStorage.setItem('csbet_auth', 'true');
  };

  const logout = () => {
    localStorage.removeItem('csbet_auth');
    setUser(null);
  };

  const updateBalance = async (newBalance: number) => {
    if (!user) return;
    const { error } = await supabase.from('users').update({ balance: newBalance }).eq('id', 'admin');
    if (error) throw error;
    setUser({ ...user, balance: newBalance });
  };

  const addToHistory = async (bet: any) => {
    if (!user) return;
    const newHistory = [bet, ...user.history];
    const { error } = await supabase.from('users').update({ history: newHistory }).eq('id', 'admin');
    if (error) throw error;
    setUser({ ...user, history: newHistory });
  };

  const updateBetStatus = async (betId: string, status: 'won' | 'lost') => {
    if (!user) return;
    const newHistory = user.history.map((b: any) => b.id === betId ? { ...b, status } : b);
    const { error } = await supabase.from('users').update({ history: newHistory }).eq('id', 'admin');
    if (error) throw error;
    setUser({ ...user, history: newHistory });
  };

  const setAvatar = async (url: string) => {
    if (!user) return;
    const newSettings = { ...user.settings, avatar: url };
    const { error } = await supabase.from('users').update({ settings: newSettings }).eq('id', 'admin');
    if (error) throw error;
    setUser({ ...user, settings: newSettings });
  };

  const setNickname = async (nick: string) => {
    if (!user) return;
    const { error } = await supabase.from('users').update({ nickname: nick }).eq('id', 'admin');
    if (error) throw error;
    setUser({ ...user, nickname: nick });
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout,
      updateBalance, addToHistory, updateBetStatus, setAvatar, setNickname
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
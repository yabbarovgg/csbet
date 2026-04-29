import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  nickname: string;
  balance: number;
  settings: { 
    showGradient?: boolean; 
    avatar?: string | null;
  };
  history: any[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
  updateBalance: (amount: number) => Promise<void>;
  addToHistory: (bet: any) => Promise<void>;
  updateBetStatus: (betId: string, status: 'won' | 'lost') => Promise<void>;
  setAvatar: (url: string) => Promise<void>;
  setNickname: (nick: string) => Promise<void>;
  toggleGradient: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Загрузка пользователя при старте
  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
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
        console.error('Failed to load user:', error);
        localStorage.removeItem('csbet_auth');
        setLoading(false);
        return;
      }

      setUser({
        id: data.id,
        nickname: data.nickname || 'Игрок',
        balance: data.balance || 0,
        settings: data.settings || { showGradient: true, avatar: null },
        history: data.history || []
      });
    } catch (err) {
      console.error('Error loading user:', err);
      localStorage.removeItem('csbet_auth');
    } finally {
      setLoading(false);
    }
  }

  async function login(password: string) {
    if (password !== import.meta.env.VITE_MASTER_PASSWORD) {
      throw new Error('Неверный пароль');
    }

    // Проверяем, есть ли пользователь
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('id', 'admin')
      .single();

    let userData = existing;

    // Если нет - создаём
    if (!userData) {
      const { data: newUser, error } = await supabase
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
      userData = newUser;
    }

    setUser({
      id: userData.id,
      nickname: userData.nickname || 'Игрок',
      balance: userData.balance || 0,
      settings: userData.settings || { showGradient: true, avatar: null },
      history: userData.history || []
    });

    localStorage.setItem('csbet_auth', 'true');
  }

  function logout() {
    localStorage.removeItem('csbet_auth');
    setUser(null);
  }

  async function updateBalance(newBalance: number) {
    if (!user) return;
    
    const { error } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', 'admin');

    if (error) throw error;
    
    setUser({ ...user, balance: newBalance });
  }

  async function addToHistory(bet: any) {
    if (!user) return;

    const newHistory = [bet, ...user.history];
    
    const { error } = await supabase
      .from('users')
      .update({ history: newHistory })
      .eq('id', 'admin');

    if (error) throw error;
    
    setUser({ ...user, history: newHistory });
  }

  async function updateBetStatus(betId: string, status: 'won' | 'lost') {
    if (!user) return;

    const newHistory = user.history.map((bet: any) => 
      bet.id === betId ? { ...bet, status } : bet
    );

    const { error } = await supabase
      .from('users')
      .update({ history: newHistory })
      .eq('id', 'admin');

    if (error) throw error;
    
    setUser({ ...user, history: newHistory });
  }

  async function setAvatar(url: string) {
    if (!user) return;

    const newSettings = {
      ...user.settings,
      avatar: url
    };

    const { error } = await supabase
      .from('users')
      .update({ settings: newSettings })
      .eq('id', 'admin');

    if (error) throw error;
    
    setUser({ ...user, settings: newSettings });
  }

  async function setNickname(nick: string) {
    if (!user) return;

    const { error } = await supabase
      .from('users')
      .update({ nickname: nick })
      .eq('id', 'admin');

    if (error) throw error;
    
    setUser({ ...user, nickname: nick });
  }

  async function toggleGradient() {
    if (!user) return;

    const newSettings = {
      ...user.settings,
      showGradient: !user.settings.showGradient
    };

    const { error } = await supabase
      .from('users')
      .update({ settings: newSettings })
      .eq('id', 'admin');

    if (error) throw error;
    
    setUser({ ...user, settings: newSettings });
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      updateBalance,
      addToHistory,
      updateBetStatus,
      setAvatar,
      setNickname,
      toggleGradient
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
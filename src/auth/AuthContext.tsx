// src/auth/AuthContext.tsx
import { createContext, useContext, useState } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  balance: number;
  settings: any;
  history: any[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (password: string) => Promise<void>;
  updateBalance: (newBalance: number) => Promise<void>;
  updateHistory: (newHistory: any[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (password: string) => {
    // 1. Проверка мастер-пароля
    if (password !== import.meta.env.VITE_MASTER_PASSWORD) {
      throw new Error('Неверный пароль');
    }

    // 2. Ищем запись в БД
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 'admin')
      .single();

    if (error && error.code === 'PGRST116') {
      // Строка не найдена → создаём новую
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ id: 'admin', balance: 15420, settings: {}, history: [] })
        .select()
        .single();
      
      if (insertError) throw insertError;
      setUser(newUser);
    } else if (error) {
      throw error;
    } else {
      setUser(data);
    }

    setIsAuthenticated(true);
    setLoading(false);
  };

  // Сохранение баланса в облако
  const updateBalance = async (newBalance: number) => {
    setUser(prev => prev ? { ...prev, balance: newBalance } : null);
    await supabase.from('users').update({ balance: newBalance }).eq('id', 'admin');
  };

  // Сохранение истории в облако
  const updateHistory = async (newHistory: any[]) => {
    setUser(prev => prev ? { ...prev, history: newHistory } : null);
    await supabase.from('users').update({ history: newHistory }).eq('id', 'admin');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, updateBalance, updateHistory }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
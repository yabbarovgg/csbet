import React, { useState } from 'react';

interface AuthPageProps {
  onLogin: (email: string, password: string) => { success: boolean; error?: string };
  onRegister: (nickname: string, email: string, password: string) => { success: boolean; error?: string };
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin) {
      if (nickname.trim().length < 4) {
        setError('Ник минимум 4 символа');
        return;
      }
      if (!isValidEmail(email.trim())) {
        setError('Введите корректный email (например: user@mail.ru)');
        return;
      }
      if (password.length < 6) {
        setError('Пароль минимум 6 символов');
        return;
      }
      if (password !== confirmPassword) {
        setError('Пароли не совпадают');
        return;
      }
    } else {
      if (!email.trim()) {
        setError('Введите email');
        return;
      }
      if (password.length < 1) {
        setError('Введите пароль');
        return;
      }
    }

    setLoading(true);
    setTimeout(() => {
      if (isLogin) {
        const result = onLogin(email.trim(), password);
        if (!result.success) setError(result.error || 'Ошибка входа');
      } else {
        const result = onRegister(nickname.trim(), email.trim().toLowerCase(), password);
        if (!result.success) setError(result.error || 'Ошибка регистрации');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-400/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-400 rounded-xl flex items-center justify-center font-black text-black text-lg">
              CS
            </div>
            <span className="text-white font-bold text-2xl">
              CS<span className="text-amber-400">BET</span>
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            {isLogin ? 'Войдите в свой аккаунт' : 'Создайте аккаунт для игры'}
          </p>
        </div>

        <div className="bg-[#141414] rounded-3xl border border-white/5 p-8">
          <form onSubmit={handleSubmit}>
            <div className="flex bg-white/5 rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isLogin ? 'bg-amber-400/20 text-amber-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Вход
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  !isLogin ? 'bg-amber-400/20 text-amber-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Регистрация
              </button>
            </div>

            {error && (
              <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
                {error}
              </div>
            )}

            {!isLogin && (
              <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Никнейм</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ваш никнейм (мин. 4 символа)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium placeholder:text-gray-600 focus:outline-none focus:border-amber-400/30 focus:bg-white/[0.07] transition-all"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isLogin ? "email@example.com" : "user@example.com"}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium placeholder:text-gray-600 focus:outline-none focus:border-amber-400/30 focus:bg-white/[0.07] transition-all"
              />
            </div>

            <div className={`mb-${isLogin ? '0' : '4'}`}>
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium placeholder:text-gray-600 focus:outline-none focus:border-amber-400/30 focus:bg-white/[0.07] transition-all"
              />
            </div>

            {!isLogin && (
              <div className="mt-4 mb-6">
                <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Подтвердите пароль</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите пароль"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium placeholder:text-gray-600 focus:outline-none focus:border-amber-400/30 focus:bg-white/[0.07] transition-all"
                />
                <p className="text-xs text-gray-600 mt-1.5">Минимум 6 символов</p>
              </div>
            )}

            {isLogin && <div className="mb-6" />}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                !loading
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black hover:opacity-90 active:scale-[0.98]'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  {isLogin ? 'Вход...' : 'Регистрация...'}
                </span>
              ) : (
                isLogin ? 'Войти' : 'Зарегистрироваться'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-600">
              {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-amber-400 hover:underline"
              >
                {isLogin ? 'Зарегистрируйтесь' : 'Войдите'}
              </button>
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
            <div className="w-4 h-4 bg-gradient-to-br from-amber-400 to-yellow-400 rounded flex items-center justify-center font-black text-black text-[6px]">
              CS
            </div>
            <span>CSBET © 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

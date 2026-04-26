import React from 'react';
import { formatBalance } from '../utils/format';

interface HeaderProps {
  balance: number;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogoClick: () => void;
  onDepositClick: () => void;
  notifications: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ balance, isDark, onToggleTheme, onLogoClick, onDepositClick, notifications }) => {
  const bg = isDark ? 'bg-[#0d0d0d]' : 'bg-white';
  const border = isDark ? 'border-white/5' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';

  return (
    <header className={`sticky top-0 z-50 ${bg} border-b ${border} transition-colors duration-300`}>
      <div className="flex items-center justify-between h-14 px-6">
        {/* Logo */}
        <button onClick={onLogoClick} className="flex items-center gap-2 shrink-0 cursor-pointer">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-400 rounded-lg flex items-center justify-center font-black text-black text-sm">
            CS
          </div>
          <span className={`${text} font-bold text-lg tracking-tight hidden sm:block`}>
            CS<span className="text-amber-400">BET</span>
          </span>
        </button>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Notifications */}
          {notifications}

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              isDark ? 'bg-white/5 text-amber-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={isDark ? 'Светлая тема' : 'Тёмная тема'}
          >
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Balance */}
          <div className={`flex items-center rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0" />
              <span className={`${text} font-semibold text-sm tabular-nums whitespace-nowrap`}>{formatBalance(balance)} ₽</span>
            </div>
            <button onClick={onDepositClick} className="bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-bold text-xs px-3 py-2 h-full hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer">
              Пополнить
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

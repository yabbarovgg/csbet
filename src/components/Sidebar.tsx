import React, { useState, useEffect } from 'react';
import { BetSelection, PlacedBet } from '../types';
import { formatBalance } from '../utils/format';
import AvatarUpload from './AvatarUpload';
import AvatarCrop from './AvatarCrop';
import LoanBlock from './LoanBlock';
import { useAuth } from '../auth/AuthContext';
import { Loan } from '../types/loan';

interface SidebarProps {
  selections: BetSelection[];
  onRemoveSelection: (matchId: string) => void;
  onClearSelections: () => void;
  onPlaceBet: (stake: number) => void;
  betHistory: PlacedBet[];
  balance: number;
  isDark: boolean;
  showGradient: boolean;
  onToggleGradient: () => void;
  activeLoan: Loan | null;
  onRepayFull: () => void;
  onRepayPartial: (amount: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  selections, onRemoveSelection, onClearSelections, onPlaceBet, betHistory, balance, isDark,
  showGradient, onToggleGradient, activeLoan, onRepayFull, onRepayPartial,
}) => {
  // 🔹 Берём только нужные функции из контекста
  const { user, logout, setAvatar, setNickname } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'betSlip' | 'history'>('betSlip');
  const [stake, setStake] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [ekbTime, setEkbTime] = useState('');
  const [editingNick, setEditingNick] = useState(false);
  const [nickInput, setNickInput] = useState('');
  const [cropImage, setCropImage] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const ekb = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Yekaterinburg' }));
      setEkbTime(ekb.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const stakeNum = parseFloat(stake) || 0;
  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const potentialWin = stakeNum * totalOdds;
  const quickStakes = [100, 500, 1000, 5000];

  const handlePlaceBet = () => {
    if (stakeNum <= 0 || stakeNum > balance + 0.001) return;
    setIsPlacing(true);
    setTimeout(() => { onPlaceBet(stakeNum); setStake(''); setIsPlacing(false); }, 600);
  };

  // 🔹 Сохранение ника через новую функцию контекста
  const handleSaveNick = async () => {
    if (nickInput.trim().length >= 2 && user && nickInput.trim() !== user.nickname) {
      try {
        await setNickname(nickInput.trim());
      } catch (err) {
        console.error('Failed to save nickname:', err);
        alert('Не удалось сохранить никнейм');
      }
    }
    setEditingNick(false);
  };

  const bg = isDark ? 'bg-[#0d0d0d]' : 'bg-white';
  const border = isDark ? 'border-white/5' : 'border-gray-200';
  const textP = isDark ? 'text-white' : 'text-gray-900';
  const textS = isDark ? 'text-gray-500' : 'text-gray-400';
  const bgC = isDark ? 'bg-white/[0.03] border-white/5' : 'bg-gray-50 border-gray-200';
  const inactiveTab = isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600';

  return (
    <aside className={`${bg} border-l ${border} h-full lg:h-[calc(100vh-88px)] lg:sticky lg:top-[88px] flex flex-col overflow-hidden transition-colors duration-300 w-80`}>
      
      {/* 🔹 Модальное окно кропа аватарки */}
      {cropImage && (
        <AvatarCrop
          imageSrc={cropImage}
          isDark={isDark}
          onCrop={async (dataUrl) => {
            try {
              await setAvatar(dataUrl);
            } catch (err) {
              console.error('Failed to save avatar:', err);
              alert('Не удалось сохранить аватарку');
            }
            setCropImage(null);
          }}
          onCancel={() => setCropImage(null)}
        />
      )}

      {/* Профиль */}
      <div className={`px-4 py-4 border-b ${border}`}>
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <AvatarUpload avatar={user?.settings?.avatar || null} onAvatarChange={(url) => setCropImage(url)} size={84} />
          </div>
          <div className="flex-1 min-w-0">
            {editingNick ? (
              <input
                autoFocus
                type="text"
                value={nickInput}
                onChange={(e) => setNickInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNick(); if (e.key === 'Escape') setEditingNick(false); }}
                onBlur={handleSaveNick}
                className={`w-full border border-yellow-400/30 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-yellow-400/50 ${isDark ? 'bg-white/5 text-white' : 'bg-gray-100 text-gray-900'}`}
                maxLength={30}
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold gradient-nickname truncate block">{user?.nickname || 'Игрок'}</span>
                <button
                  onClick={() => { setEditingNick(true); setNickInput(user?.nickname || ''); }}
                  className="shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-yellow-400 transition-colors cursor-pointer"
                  title="Изменить ник"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                </button>
                <button
                  onClick={onToggleGradient}
                  className={`w-4 h-4 rounded shrink-0 transition-all cursor-pointer ${showGradient ? 'bg-gradient-to-r from-yellow-400 via-green-400 to-blue-400 opacity-60 hover:opacity-100' : isDark ? 'bg-white/10 opacity-40 hover:opacity-70' : 'bg-gray-200 opacity-40 hover:opacity-70'}`}
                  title={showGradient ? 'Выключить градиент' : 'Включить градиент'}
                />
              </div>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs font-mono font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>ID: <span className="text-red-500 font-bold">{user?.id}</span></span>
            </div>
            <div className={`text-xs font-mono font-semibold tabular-nums mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{ekbTime}</div>
          </div>
        </div>
      </div>

      {/* Табы */}
      <div className={`flex border-b ${border}`}>
        <button onClick={() => setActiveTab('betSlip')} className={`flex-1 py-3 text-sm font-semibold transition-all relative ${activeTab === 'betSlip' ? textP : inactiveTab}`}>
          <span className="flex items-center justify-center gap-2">Купон {selections.length > 0 && <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{selections.length}</span>}</span>
          {activeTab === 'betSlip' && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-yellow-400 rounded-full" />}
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-sm font-semibold transition-all relative ${activeTab === 'history' ? textP : inactiveTab}`}>
          <span className="flex items-center justify-center gap-2">История {betHistory.length > 0 && <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>{betHistory.length}</span>}</span>
          {activeTab === 'history' && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-yellow-400 rounded-full" />}
        </button>
      </div>

      {/* Контент */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'betSlip' ? (
          <div className="p-4">
            <div className="bg-gradient-to-br from-yellow-400/10 to-amber-400/5 rounded-2xl p-4 border border-yellow-400/20 mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs uppercase tracking-wider font-medium ${textS}`}>Баланс</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
              <div className={`text-2xl font-black tabular-nums ${textP}`}>{formatBalance(balance)} <span className={`text-base ${textS}`}>₽</span></div>
            </div>

            <div className="mb-4"><LoanBlock loan={activeLoan} onRepayFull={onRepayFull} onRepayPartial={onRepayPartial} isDark={isDark} /></div>

            {selections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className={`w-16 h-16 ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded-2xl flex items-center justify-center mb-4`}><span className="text-3xl">🎫</span></div>
                <h3 className={`text-sm font-semibold mb-1 ${textS}`}>Купон пуст</h3>
                <p className={`text-xs ${textS}`}>Выберите исход, чтобы сделать ставку</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold uppercase tracking-wider ${textS}`}>{selections.length} {selections.length === 1 ? 'ставка' : selections.length < 5 ? 'ставки' : 'ставок'}</span>
                  <button onClick={onClearSelections} className="text-xs text-red-400/60 hover:text-red-400 transition-colors cursor-pointer">Очистить</button>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  {selections.map((sel, idx) => (
                    <div key={`${sel.matchId}-${idx}`} className={`${bgC} rounded-xl p-3 border relative group`}>
                      <button onClick={() => onRemoveSelection(sel.matchId)} className="absolute top-2 right-2 w-5 h-5 bg-white/5 rounded-full flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer">×</button>
                      <span className={`text-xs ${textS}`}>{sel.tournament}</span>
                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-sm font-semibold ${textP}`}>{sel.team}</p>
                        <div className="bg-yellow-400/15 text-yellow-400 font-bold text-sm px-3 py-1.5 rounded-lg tabular-nums">{sel.odds.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {selections.length > 1 && (
                  <div className="flex items-center justify-between mb-4 px-1">
                    <span className={`text-xs ${textS}`}>Общий коэффициент</span>
                    <span className="text-sm font-bold text-yellow-400 tabular-nums">{totalOdds.toFixed(2)}</span>
                  </div>
                )}

                <div className="mb-4">
                  <label className={`text-xs uppercase tracking-wider font-medium mb-2 block ${textS}`}>Сумма ставки</label>
                  <div className="relative">
                    <input type="number" value={stake} onChange={(e) => setStake(e.target.value)} placeholder="0 ₽"
                      className={`w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-all tabular-nums ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-yellow-400/30 focus:bg-white/[0.07]' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-yellow-400/50 focus:bg-white'}`} />
                    <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium ${textS}`}>₽</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {quickStakes.map((amount) => (
                      <button key={amount} onClick={() => setStake(amount.toString())}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${stake === amount.toString() ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30' : `${isDark ? 'bg-white/5 border-white/5 text-gray-500 hover:text-white hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}`}>
                        {amount >= 1000 ? `${amount / 1000}к` : amount}
                      </button>
                    ))}
                    <button onClick={() => setStake(balance.toFixed(2))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${stake === balance.toFixed(2) ? 'bg-red-400/20 text-red-400 border-red-400/30' : `${isDark ? 'bg-white/5 border-white/5 text-red-400/80 hover:text-red-400 hover:bg-red-400/10' : 'bg-gray-100 border-gray-200 text-red-400/80 hover:text-red-400 hover:bg-red-400/10'}`}`}>
                      MAX
                    </button>
                  </div>
                </div>

                {stakeNum > 0 && (
                  <div className={`${bgC} rounded-xl p-3 border mb-4`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${textS}`}>Возможный выигрыш</span>
                      <span className="text-lg font-black text-green-400 tabular-nums">{potentialWin.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</span>
                    </div>
                  </div>
                )}

                <button onClick={handlePlaceBet} disabled={stakeNum <= 0 || stakeNum > balance + 0.001 || selections.length === 0 || isPlacing}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${stakeNum > 0 && stakeNum <= balance + 0.001 && selections.length > 0 && !isPlacing ? 'bg-gradient-to-r from-yellow-400 to-amber-400 text-black hover:opacity-90 active:scale-[0.98]' : `${isDark ? 'bg-white/5 text-gray-600' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`}`}>
                  {isPlacing ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Оформление...</span> : 'Сделать ставку'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="p-4">
            {betHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className={`w-16 h-16 ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded-2xl flex items-center justify-center mb-4`}><span className="text-3xl">📋</span></div>
                <h3 className={`text-sm font-semibold mb-1 ${textS}`}>Нет ставок</h3>
                <p className={`text-xs ${textS}`}>История ваших ставок будет здесь</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className={`${bgC} rounded-xl p-3 border`}>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><div className={`text-xs ${textS} mb-0.5`}>Всего</div><div className={`text-sm font-bold ${textP}`}>{betHistory.length}</div></div>
                    <div><div className={`text-xs ${textS} mb-0.5`}>Выиграно</div><div className="text-sm font-bold text-green-400">{betHistory.filter(b => b.status === 'won').length}</div></div>
                    <div><div className={`text-xs ${textS} mb-0.5`}>Проиграно</div><div className="text-sm font-bold text-red-400">{betHistory.filter(b => b.status === 'lost').length}</div></div>
                  </div>
                </div>
                {betHistory.map((bet) => (
                  <div key={bet.id} className={`${bgC} rounded-xl p-3 border`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs ${textS}`}>{bet.timestamp}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bet.status === 'won' ? 'bg-green-400/10 text-green-400' : bet.status === 'lost' ? 'bg-red-400/10 text-red-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                        {bet.status === 'won' ? 'Выиграно' : bet.status === 'lost' ? 'Проиграно' : 'В игре'}
                      </span>
                    </div>
                    {bet.selections.map((sel, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1">
                        <div className={`text-xs ${textS}`}><span className={textP}>{sel.team}</span></div>
                        <span className="text-xs font-medium text-yellow-400 tabular-nums">{sel.odds.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className={`flex items-center justify-between mt-2 pt-2 border-t ${border}`}>
                      <span className={`text-xs ${textS}`}>Ставка: {bet.stake.toLocaleString('ru-RU')} ₽</span>
                      <span className={`text-xs font-bold tabular-nums ${bet.status === 'won' ? 'text-green-400' : bet.status === 'lost' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {bet.status === 'won' ? `+${bet.potentialWin.toLocaleString('ru-RU')} ₽` : bet.status === 'lost' ? `-${bet.stake.toLocaleString('ru-RU')} ₽` : `${bet.potentialWin.toLocaleString('ru-RU')} ₽`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`p-4 border-t ${border}`}>
        <button onClick={logout} className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all border cursor-pointer ${isDark ? 'border-white/5 text-gray-500 hover:text-red-400 hover:border-red-400/20 hover:bg-red-400/5' : 'border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-400/30 hover:bg-red-50'}`}>
          Выйти из аккаунта
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from './auth/AuthContext';
import AuthPage from './auth/AuthPage';
import Header from './components/Header';
import DepositModal from './components/DepositModal';
import DepositSlider from './components/DepositSlider';
import TournamentNav from './components/TournamentNav';
import Sidebar from './components/Sidebar';
import MatchesSection from './components/MatchesSection';
import StatsPage from './components/StatsPage';
import Notifications from './components/Notifications';
import useLoans from './hooks/useLoans';
import { BetSelection, PlacedBet, Match } from './types';
import { liveMatches as initialLive, upcomingMatches as initialUpcoming, tournaments } from './data/matches';

// --- Вспомогательные функции ---

function jitter(odds: number, pct = 0.03): number {
  const delta = odds * pct * (Math.random() * 2 - 1);
  return Math.max(1.01, Math.round((odds + delta) * 100) / 100);
}

function getMatchTime(match: Match): number {
  if (match.isLive) return 0;
  if (!match.startTime) return 999999;
  const [h, m] = match.startTime.split(':').map(Number);
  return (match.date === 'Завтра' ? 1 : 0) * 24 * 60 + h * 60 + m;
}

function formatRelativeTime(match: Match): string {
  if (match.isLive) return '';
  if (!match.startTime) return match.date || '';
  const [h, m] = match.startTime.split(':').map(Number);
  const now = new Date();
  const matchDate = new Date();
  if (match.date === 'Завтра') matchDate.setDate(matchDate.getDate() + 1);
  matchDate.setHours(h, m, 0, 0);
  const diffMs = matchDate.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin <= 0) return 'Начинается';
  if (diffMin < 60) return `через ${diffMin} мин`;
  const diffH = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  return remMin === 0 ? `через ${diffH} ч` : `через ${diffH} ч ${remMin} мин`;
}

const AppContent: React.FC = () => {
  // Контекст авторизации и данных пользователя
  const { user, isAuthenticated, login, register, updateBalance, addToHistory, updateBetStatus, updateUser } = useAuth();
  
  // Локальные состояния UI
  const [isDark, setIsDark] = useState(true);
  const [page, setPage] = useState<'home' | 'stats'>('home');
  const [selections, setSelections] = useState<BetSelection[]>([]);
  
  // Данные из базы (через Context)
  const balance = user?.balance ?? 15420;
  const betHistory = user?.history ?? [];
  
  const [showGradient, setShowGradient] = useState(user?.settings?.showGradient ?? true);
  const [activeTournament, setActiveTournament] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState<'left' | 'right' | null>(null);

  // Состояния депозита/займа
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositStep, setDepositStep] = useState<'modal' | 'loan' | 'card' | 'promo' | null>(null);

  // Хук займов
  const userId = user?.id ? String(user.id) : null;
  const { activeLoan, hasEverHadLoan, totalActiveDebt, notifications, unreadCount, takeLoan, repayOldest, markAllRead, clearNotifications } = useLoans(userId);

  // Состояние матчей
  const [liveData, setLiveData] = useState<Match[]>(initialLive.map(m => ({ ...m, _simTime: 0 })));
  const [upcomingData] = useState<Match[]>(initialUpcoming);

  // Очистка таймеров при размонтировании (чтобы не было утечек и багов)
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  useEffect(() => () => timeoutsRef.current.forEach(clearTimeout), []);

  // Эффекты
  useEffect(() => { document.documentElement.classList.toggle('light', !isDark); }, [isDark]);

  useEffect(() => {
    const h = () => { if (window.innerWidth >= 1024) setMobileMenu(null); };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Симуляция матчей (счет и время)
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData(prev => {
        const updated = prev.map(m => {
          if (!m.isLive) return m;
          const s1 = m.score1 || 0;
          const s2 = m.score2 || 0;
          // Шанс гола 15%
          const newS1 = Math.random() < 0.15 ? s1 + 1 : s1;
          const newS2 = Math.random() < 0.15 ? s2 + 1 : s2;
          const newTime = (m._simTime || 0) + 1;
          
          // Матч заканчивается через 40-60 секунд
          if (newTime >= 40 + Math.random() * 20) {
            return { ...m, isLive: false, score1: newS1, score2: newS2, _simTime: newTime, status: 'finished' };
          }
          return { ...m, score1: newS1, score2: newS2, _simTime: newTime };
        });
        // Удаляем завершенные матчи через время
        return updated.filter(m => m.isLive || (m._simTime || 0) < 60);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Обновление коэффициентов
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData(prev => prev.map(m => ({
        ...m,
        odds1: jitter(m.odds1, 0.02),
        odds2: jitter(m.odds2, 0.02),
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // --- Логика ставок ---

  const handleToggleSelection = useCallback((sel: BetSelection) => {
    setSelections((prev) => {
      const existing = prev.findIndex((s) => s.matchId === sel.matchId && s.selectionType === sel.selectionType);
      if (existing >= 0) {
        if (prev[existing].team === sel.team) return prev.filter((_, i) => i !== existing);
        const u = [...prev]; u[existing] = sel; return u;
      }
      return [...prev, sel];
    });
  }, []);

  const handleRemoveSelection = useCallback((matchId: string) => {
    setSelections((prev) => prev.filter((s) => s.matchId !== matchId));
  }, []);

  // 🔹 ГЛАВНАЯ ФУНКЦИЯ: Оформление ставки
  const handlePlaceBet = useCallback(async (stake: number) => {
    const totalOdds = selections.reduce((a, s) => a * s.odds, 1);
    const potentialWin = Math.round(stake * totalOdds * 100) / 100;
    const newBalance = balance - stake;
    
    const newBet: PlacedBet = {
      id: `bet-${Date.now()}-${Math.random()}`, 
      selections: [...selections], 
      stake, 
      potentialWin,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      status: 'pending',
    };

    // 1. Списываем деньги и добавляем в историю (МГНОВЕННО)
    await updateBalance(newBalance);
    await addToHistory(newBet);
    setSelections([]);

    // 2. Запускаем таймер результата (симуляция)
    const t = setTimeout(async () => {
      const isWin = Math.random() > 0.5; // 50/50 шанс
      
      if (isWin) {
        await updateBalance(newBalance + potentialWin);
      }
      // Обновляем статус ставки в истории
      await updateBetStatus(newBet.id, isWin ? 'won' : 'lost');
    }, 5000 + Math.random() * 10000); // 5-15 секунд

    timeoutsRef.current.push(t);
  }, [selections, balance, updateBalance, addToHistory, updateBetStatus]);

  // --- Логика Займов ---

  const handleTakeLoan = async (amount: number, days: number) => {
    if (!user) return;
    takeLoan(amount, days); // Локальное обновление
    
    // МГНОВЕННО закрываем меню (не ждем ответа от базы для UI)
    setDepositStep(null);
    setShowDeposit(false);
    
    // Обновляем баланс
    await updateBalance(balance + amount);
  };

  const handleRepayFull = async () => {
    if (!activeLoan || !user) return;
    const amount = activeLoan.remaining;
    if (balance >= amount) {
      await updateBalance(balance - amount);
      repayOldest(amount);
    }
  };

  const handleRepayPartial = async (amount: number) => {
    if (!activeLoan || !user) return;
    const pay = Math.min(amount, activeLoan.remaining);
    if (balance >= pay) {
      await updateBalance(balance - pay);
      repayOldest(pay);
    }
  };

  // --- Фильтрация и сортировка матчей ---

  const filterMatches = (matches: Match[]) => {
    let result = matches;
    if (selectedMatchId) return result.filter((m) => m.id === selectedMatchId);
    if (activeTournament) {
      result = result.filter((m) => {
        if (activeTournament === 'iem') return m.tournament.includes('IEM');
        if (activeTournament === 'blast') return m.tournament.includes('BLAST');
        if (activeTournament === 'esl') return m.tournament.includes('ESL');
        return true;
      });
    }
    return [...result].sort((a, b) => getMatchTime(a) - getMatchTime(b));
  };

  const fLive = useMemo(() => filterMatches(liveData), [liveData, activeTournament, selectedMatchId]);
  const fUpcoming = useMemo(() => filterMatches(upcomingData), [upcomingData, activeTournament, selectedMatchId]);

  // --- Рендер ---

  const bgPage = isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50';
  const textP = isDark ? 'text-white' : 'text-gray-900';
  const textS = isDark ? 'text-gray-600' : 'text-gray-400';

  const notificationsComponent = useMemo(() => userId ? (
    <Notifications
      notifications={notifications}
      unreadCount={unreadCount}
      onMarkAllRead={markAllRead}
      onClearAll={clearNotifications}
      isDark={isDark}
    />
  ) : null, [userId, notifications, unreadCount, markAllRead, clearNotifications, isDark]);

  if (!isAuthenticated) return <AuthPage onLogin={login} onRegister={register} />;

  return (
    <div className={`min-h-screen ${bgPage} ${textP} transition-colors duration-300`}>
      <Header
        balance={balance}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        onLogoClick={() => { setPage('home'); setActiveTournament(null); setSelectedMatchId(null); }}
        onDepositClick={() => { setDepositStep('modal'); setShowDeposit(true); }}
        notifications={notificationsComponent}
      />

      {/* Модальные окна депозита/займа */}
      {showDeposit && depositStep === 'modal' && (
        <DepositModal
          isDark={isDark}
          onClose={() => setShowDeposit(false)}
          onSelectCard={() => setDepositStep('card')}
          onSelectLoan={() => setDepositStep('loan')}
          onSelectPromo={() => setDepositStep('promo')}
        />
      )}
      {showDeposit && depositStep === 'loan' && (
        <DepositSlider
          isDark={isDark}
          onClose={() => setShowDeposit(false)}
          onDeposit={handleTakeLoan}
          isFirstLoan={!hasEverHadLoan}
          currentDebt={totalActiveDebt}
        />
      )}
      {showDeposit && (depositStep === 'card' || depositStep === 'promo') && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-2xl border ${isDark ? 'bg-[#141414] border-white/10' : 'bg-white border-gray-200'} p-8 text-center`}>
            <h3 className="text-lg font-bold mb-4">{depositStep === 'card' ? '💳 Банковская карта' : '🎟️ Промокод'}</h3>
            <p className="text-sm text-gray-500 mb-6">Этот способ пополнения скоро будет доступен</p>
            <button onClick={() => setDepositStep('modal')} className="bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-bold text-sm px-6 py-2.5 rounded-xl">Понятно</button>
          </div>
        </div>
      )}

      {/* Мобильные кнопки */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50 flex flex-col gap-3">
        <button onClick={() => setMobileMenu(mobileMenu === 'left' ? null : 'left')}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${isDark ? 'bg-[#1a1a1a] text-white border border-white/10' : 'bg-white text-gray-900 border border-gray-200'}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <button onClick={() => setMobileMenu(mobileMenu === 'right' ? null : 'right')}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-400 text-black flex items-center justify-center shadow-lg shadow-amber-400/30 relative">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20"/></svg>
          {selections.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{selections.length}</span>
          )}
        </button>
      </div>

      {/* Затемнение для мобильного меню */}
      {mobileMenu && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenu(null)} />
      )}

      <div className="flex">
        {/* Левое меню (Турниры) */}
        <div className={`lg:static fixed top-[88px] left-0 bottom-0 z-40 transition-transform duration-300 ${
          mobileMenu === 'left' ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <TournamentNav
            tournaments={tournaments}
            activeTournament={activeTournament}
            onSelect={(id) => { setActiveTournament(id); setSelectedMatchId(null); setMobileMenu(null); setPage('home'); }}
            isDark={isDark}
            allMatches={[...liveData, ...upcomingData]}
            onMatchClick={(matchId) => { setSelectedMatchId(matchId); setActiveTournament(null); setMobileMenu(null); setPage('home'); }}
            selectedMatchId={selectedMatchId}
          />
        </div>

        {/* Основной контент */}
        <main className="flex-1 min-w-0 px-4 lg:px-6 py-6 pb-24 lg:pb-6">
          <div className="flex items-center gap-2 mb-6 overflow-x-auto">
            <button onClick={() => setPage('home')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                page === 'home' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : isDark ? 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
              }`}>🎮 Матчи</button>
            <button onClick={() => setPage('stats')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                page === 'stats' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : isDark ? 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
              }`}>📊 Статистика</button>
          </div>

          {page === 'home' ? (
            <>
              {selectedMatchId && (
                <div className="mb-4 bg-amber-400/5 border border-amber-400/20 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-amber-400">Показан выбранный матч</span>
                  <button onClick={() => { setSelectedMatchId(null); setActiveTournament(null); }} className="text-xs text-gray-500 hover:text-white">Показать все×</button>
                </div>
              )}
              {fLive.length > 0 && (
                <div className="mb-6 bg-gradient-to-r from-red-500/10 via-transparent to-transparent border-l-2 border-red-500 rounded-r-2xl p-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm font-bold text-red-400 uppercase tracking-wide">Live</span>
                  </div>
                  <p className={`text-sm ${textS}`}>
                    {fLive.length} {fLive.length === 1 ? 'матч идёт' : fLive.length < 5 ? 'матча идут' : 'матчей идёт'} прямо сейчас
                  </p>
                </div>
              )}
              <MatchesSection title="LIVE" icon="" matches={fLive} selections={selections} onToggleSelection={handleToggleSelection} isDark={isDark} />
              <MatchesSection title="Предстоящие матчи" icon="📅" matches={fUpcoming} selections={selections} onToggleSelection={handleToggleSelection} isDark={isDark} formatRelativeTime={formatRelativeTime} />
              
              <footer className={`mt-12 pt-6 border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between text-xs ${textS}">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-gradient-to-br from-amber-400 to-yellow-400 rounded flex items-center justify-center font-black text-black text-[8px]">CS</div>
                    <span>CSBET © 2026</span>
                  </div>
                </div>
              </footer>
            </>
          ) : (
            <StatsPage betHistory={betHistory} currentBalance={balance} isDark={isDark} userId={userId} />
          )}
        </main>

        {/* Правое меню (Купон) */}
        <div className={`lg:static fixed top-[88px] right-0 bottom-0 z-40 transition-transform duration-300 ${
          mobileMenu === 'right' ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}>
          <Sidebar
            selections={selections}
            onRemoveSelection={handleRemoveSelection}
            onClearSelections={() => setSelections([])}
            onPlaceBet={handlePlaceBet}
            betHistory={betHistory}
            balance={balance}
            isDark={isDark}
            showGradient={showGradient}
            onToggleGradient={() => { setShowGradient(!showGradient); }}
            activeLoan={activeLoan ?? null}
            onRepayFull={handleRepayFull}
            onRepayPartial={handleRepayPartial}
          />
        </div>
      </div>

      {!showGradient && <style>{`.gradient-nickname { background: none !important; -webkit-background-clip: unset !important; background-clip: unset !important; -webkit-text-fill-color: unset !important; color: ${isDark ? '#fff' : '#111'} !important; animation: none !important; }`}</style>}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <div className="App">
       <AppContent />
    </div>
  );
};

export default App;
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
  return Math.max(1.01, Math.round((odds + odds * pct * (Math.random() * 2 - 1)) * 100) / 100);
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
  const diffMin = Math.round((matchDate.getTime() - now.getTime()) / 60000);
  if (diffMin <= 0) return 'Начинается';
  if (diffMin < 60) return `через ${diffMin} мин`;
  return `через ${Math.floor(diffMin / 60)} ч ${diffMin % 60} мин`;
}

const AppContent: React.FC = () => {
  const { user, isAuthenticated, login, register, updateBalance, addToHistory, updateBetStatus } = useAuth();
  
  const [isDark, setIsDark] = useState(true);
  const [page, setPage] = useState<'home' | 'stats'>('home');
  const [selections, setSelections] = useState<BetSelection[]>([]);
  
  const balance = user?.balance ?? 15420;
  const betHistory = user?.history ?? [];
  
  const [showGradient, setShowGradient] = useState(user?.settings?.showGradient ?? true);
  const [activeTournament, setActiveTournament] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState<'left' | 'right' | null>(null);

  const [showDeposit, setShowDeposit] = useState(false);
  const [depositStep, setDepositStep] = useState<'modal' | 'loan' | 'card' | 'promo' | null>(null);
  
  // Админ панель
  const [showAdmin, setShowAdmin] = useState(false);
  const [newMatch, setNewMatch] = useState({ team1: '', team2: '', tournament: 'Other', date: 'Сегодня', time: '', odds1: '1.80', odds2: '1.90' });

  const userId = user?.id ? String(user.id) : null;
  const { activeLoan, hasEverHadLoan, totalActiveDebt, notifications, unreadCount, takeLoan, repayOldest, markAllRead, clearNotifications } = useLoans(userId);

  const [liveData, setLiveData] = useState<Match[]>(initialLive.map(m => ({ ...m, _simTime: 0 })));
  const [upcomingData, setUpcomingData] = useState<Match[]>(initialUpcoming);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  
  useEffect(() => () => timeoutsRef.current.forEach(clearTimeout), []);
  useEffect(() => { document.documentElement.classList.toggle('light', !isDark); }, [isDark]);
  useEffect(() => {
    const h = () => { if (window.innerWidth >= 1024) setMobileMenu(null); };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Симуляция матчей
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData(prev => prev.map(m => {
        if (!m.isLive) return m;
        const s1 = m.score1 || 0, s2 = m.score2 || 0;
        const newS1 = Math.random() < 0.15 ? s1 + 1 : s1;
        const newS2 = Math.random() < 0.15 ? s2 + 1 : s2;
        const newTime = (m._simTime || 0) + 1;
        if (newTime >= 40 + Math.random() * 20) return { ...m, isLive: false, score1: newS1, score2: newS2, _simTime: newTime, status: 'finished' };
        return { ...m, score1: newS1, score2: newS2, _simTime: newTime };
      }).filter(m => m.isLive || (m._simTime || 0) < 60));
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

  const handleToggleSelection = useCallback((sel: BetSelection) => {
    setSelections(prev => {
      const idx = prev.findIndex(s => s.matchId === sel.matchId && s.selectionType === sel.selectionType);
      if (idx >= 0) return prev[idx].team === sel.team ? prev.filter((_, i) => i !== idx) : prev.map((s, i) => i === idx ? sel : s);
      return [...prev, sel];
    });
  }, []);

  const handleRemoveSelection = useCallback((matchId: string) => setSelections(prev => prev.filter(s => s.matchId !== matchId)), []);

  // Оформление ставки
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
      date: new Date().toISOString()
    };

    await updateBalance(newBalance);
    await addToHistory(newBet);
    setSelections([]);

    const t = setTimeout(async () => {
      const isWin = Math.random() > 0.5;
      if (isWin) await updateBalance(newBalance + potentialWin);
      await updateBetStatus(newBet.id, isWin ? 'won' : 'lost');
    }, 5000 + Math.random() * 10000);
    timeoutsRef.current.push(t);
  }, [selections, balance, updateBalance, addToHistory, updateBetStatus]);

  // Займы
  const handleTakeLoan = async (amount: number, days: number) => {
    if (!user) return;
    takeLoan(amount, days);
    setDepositStep(null);
    setShowDeposit(false);
    await updateBalance(balance + amount);
  };

  const handleRepayFull = async () => {
    if (!activeLoan || !user || balance < activeLoan.remaining) return;
    await updateBalance(balance - activeLoan.remaining);
    repayOldest(activeLoan.remaining);
  };

  const handleRepayPartial = async (amount: number) => {
    if (!activeLoan || !user) return;
    const pay = Math.min(amount, activeLoan.remaining);
    if (balance >= pay) {
      await updateBalance(balance - pay);
      repayOldest(pay);
    }
  };

  // Добавление матча (Админ)
  const addMatch = () => {
    if (!newMatch.team1 || !newMatch.team2 || !newMatch.time) return;
    const id = `m-${Date.now()}`;
    const match: Match = {
      id,
      team1: newMatch.team1,
      team2: newMatch.team2,
      tournament: newMatch.tournament,
      date: newMatch.date,
      startTime: newMatch.time,
      odds1: parseFloat(newMatch.odds1),
      odds2: parseFloat(newMatch.odds2),
      isLive: newMatch.date === 'Сегодня' && newMatch.time <= new Date().toTimeString().slice(0, 5),
      score1: 0,
      score2: 0,
      _simTime: 0,
      status: 'pending'
    };
    if (match.isLive) setLiveData(p => [match, ...p]);
    else setUpcomingData(p => [match, ...p]);
    setNewMatch({ team1: '', team2: '', tournament: 'Other', date: 'Сегодня', time: '', odds1: '1.80', odds2: '1.90' });
    setShowAdmin(false);
  };

  // Фильтрация матчей
  const filterMatches = (matches: Match[]) => {
    let res = matches;
    if (selectedMatchId) return res.filter(m => m.id === selectedMatchId);
    if (activeTournament) res = res.filter(m => m.tournament.toLowerCase().includes(activeTournament.toLowerCase()));
    return [...res].sort((a, b) => getMatchTime(a) - getMatchTime(b));
  };

  const fLive = useMemo(() => filterMatches(liveData), [liveData, activeTournament, selectedMatchId]);
  const fUpcoming = useMemo(() => filterMatches(upcomingData), [upcomingData, activeTournament, selectedMatchId]);

  const bgPage = isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50';
  const textP = isDark ? 'text-white' : 'text-gray-900';
  
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

      {/* Модальные окна */}
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
            <h3 className="text-lg font-bold mb-4">💳 Карта / 🎟️ Промокод</h3>
            <p className="text-sm text-gray-500 mb-6">Скоро будет доступно</p>
            <button onClick={() => setDepositStep('modal')} className="bg-amber-400 text-black font-bold px-6 py-2 rounded-xl">Понятно</button>
          </div>
        </div>
      )}

      {/* Админ панель */}
      {user?.id === 'admin' && (
        <button onClick={() => setShowAdmin(!showAdmin)} className="fixed bottom-20 right-4 z-50 w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-700 transition-colors">⚙️</button>
      )}
      {showAdmin && (
        <div className="fixed bottom-24 right-4 z-50 w-72 p-4 rounded-2xl border border-white/10 bg-[#141414] shadow-2xl backdrop-blur-md">
          <h3 className="text-white font-bold mb-3">Добавить матч</h3>
          <div className="space-y-2">
            <input placeholder="Команда 1" value={newMatch.team1} onChange={e => setNewMatch(p => ({...p, team1: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50" />
            <input placeholder="Команда 2" value={newMatch.team2} onChange={e => setNewMatch(p => ({...p, team2: e.target.value}))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50" />
            <div className="flex gap-2">
              <input type="time" value={newMatch.time} onChange={e => setNewMatch(p => ({...p, time: e.target.value}))} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50" />
              <select value={newMatch.date} onChange={e => setNewMatch(p => ({...p, date: e.target.value}))} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50">
                <option>Сегодня</option>
                <option>Завтра</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input type="number" step="0.01" placeholder="Коэф 1" value={newMatch.odds1} onChange={e => setNewMatch(p => ({...p, odds1: e.target.value}))} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50" />
              <input type="number" step="0.01" placeholder="Коэф 2" value={newMatch.odds2} onChange={e => setNewMatch(p => ({...p, odds2: e.target.value}))} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50" />
            </div>
            <button onClick={addMatch} className="w-full bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-bold py-2 rounded-lg mt-2 hover:opacity-90 transition-opacity">Добавить</button>
          </div>
        </div>
      )}

      {/* Мобильные кнопки */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50 flex flex-col gap-3">
        <button onClick={() => setMobileMenu(mobileMenu === 'left' ? null : 'left')} className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${isDark ? 'bg-[#1a1a1a] text-white border border-white/10' : 'bg-white text-gray-900 border border-gray-200'}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <button onClick={() => setMobileMenu(mobileMenu === 'right' ? null : 'right')} className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-400 text-black flex items-center justify-center shadow-lg shadow-amber-400/30 relative">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20"/></svg>
          {selections.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{selections.length}</span>
          )}
        </button>
      </div>

      {mobileMenu && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenu(null)} />
      )}

      <div className="flex">
        {/* Левое меню */}
        <div className={`lg:static fixed top-[88px] left-0 bottom-0 z-40 transition-transform duration-300 ${mobileMenu === 'left' ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
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
            <button onClick={() => setPage('home')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${page === 'home' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : isDark ? 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100 border border-transparent'}`}>🎮 Матчи</button>
            <button onClick={() => setPage('stats')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${page === 'stats' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : isDark ? 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100 border border-transparent'}`}>📊 Статистика</button>
          </div>

          {page === 'home' ? (
            <>
              {selectedMatchId && (
                <div className="mb-4 bg-amber-400/5 border border-amber-400/20 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-amber-400">Показан выбранный матч</span>
                  <button onClick={() => { setSelectedMatchId(null); setActiveTournament(null); }} className="text-xs text-gray-500 hover:text-white transition-colors">Показать все×</button>
                </div>
              )}
              
              {/* Секция LIVE */}
              <MatchesSection 
                title="LIVE" 
                icon={<span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span><span className="text-red-400 font-bold text-xs">LIVE</span></span>} 
                matches={fLive} 
                selections={selections} 
                onToggleSelection={handleToggleSelection} 
                isDark={isDark} 
              />
              
              {/* Предстоящие матчи */}
              <MatchesSection 
                title="Предстоящие матчи" 
                icon="📅" 
                matches={fUpcoming} 
                selections={selections} 
                onToggleSelection={handleToggleSelection} 
                isDark={isDark} 
                formatRelativeTime={formatRelativeTime} 
              />
              
              <footer className={`mt-12 pt-6 border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between text-xs text-gray-500">
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

        {/* Правое меню */}
        <div className={`lg:static fixed top-[88px] right-0 bottom-0 z-40 transition-transform duration-300 ${mobileMenu === 'right' ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
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
  return <AppContent />;
};

export default App;
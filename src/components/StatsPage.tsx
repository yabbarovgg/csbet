import React, { useState, useMemo } from 'react';

interface StatsPageProps {
  betHistory: any[];
  currentBalance: number;
  isDark: boolean;
  userId: string | null;
}

const StatsPage: React.FC<StatsPageProps> = ({ betHistory, currentBalance, isDark }) => {
  const [filter, setFilter] = useState<'24h' | '7d' | '30d' | '1y' | 'all'>('all');

  const filteredStats = useMemo(() => {
    if (!betHistory?.length) return null;

    const now = new Date();
    const cutoff = (() => {
      if (filter === '24h') return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      if (filter === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (filter === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (filter === '1y') return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return new Date(0);
    })();

    const filtered = betHistory.filter(b => new Date(b.date) >= cutoff);
    
    const totalBets = filtered.length;
    const wins = filtered.filter(b => b.status === 'won').length;
    const losses = filtered.filter(b => b.status === 'lost').length;
    const pending = totalBets - wins - losses;
    
    const totalSpent = filtered.reduce((acc, b) => acc + b.stake, 0);
    const totalWon = filtered.filter(b => b.status === 'won').reduce((acc, b) => acc + b.potentialWin, 0);
    const profit = totalWon - totalSpent;
    const winRate = totalBets ? Math.round((wins / totalBets) * 100) : 0;

    // График: последние 20 ставок из отфильтрованных
    const recent = [...filtered].reverse().slice(0, 20);
    let runningBalance = currentBalance;
    const graphData = recent.map(b => {
      if (b.status === 'won') runningBalance -= b.potentialWin;
      else if (b.status === 'lost') runningBalance += b.stake;
      else runningBalance += b.stake;
      return { date: new Date(b.date), balance: runningBalance };
    }).reverse();

    return { totalBets, wins, losses, pending, profit, winRate, filteredBets: filtered, graphData };
  }, [betHistory, filter, currentBalance]);

  if (!filteredStats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Нет статистики</h3>
        <p className="text-gray-500">Сделай ставку, чтобы увидеть данные</p>
      </div>
    );
  }

  const textP = isDark ? 'text-white' : 'text-gray-900';
  const textS = isDark ? 'text-gray-400' : 'text-gray-500';
  const bgCard = isDark ? 'bg-[#141414] border-white/5' : 'bg-white border-gray-200';
  const filters: { key: typeof filter; label: string }[] = [
    { key: '24h', label: '24ч' }, { key: '7d', label: '7д' },
    { key: '30d', label: '30д' }, { key: '1y', label: '1г' }, { key: 'all', label: 'Все' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${filter === f.key ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' : `${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'} border border-transparent`}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Всего ставок" value={filteredStats.totalBets} isDark={isDark} />
        <StatCard title="Винрейт" value={`${filteredStats.winRate}%`} isDark={isDark} color={filteredStats.winRate >= 50 ? 'text-green-400' : 'text-red-400'} />
        <StatCard title="Прибыль" value={`${filteredStats.profit >= 0 ? '+' : ''}${filteredStats.profit} ₽`} isDark={isDark} color={filteredStats.profit >= 0 ? 'text-green-400' : 'text-red-400'} />
        <StatCard title="Баланс" value={`${currentBalance} ₽`} isDark={isDark} />
      </div>

      <div className={`p-6 rounded-2xl border ${bgCard}`}>
        <h3 className={`text-lg font-bold mb-4 ${textP}`}>Динамика баланса</h3>
        <div className="h-40 flex items-end justify-between gap-1">
          {filteredStats.graphData.map((p, i) => {
            const max = Math.max(...filteredStats.graphData.map(d => d.balance), 1000);
            const h = Math.max(4, (p.balance / max) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col justify-end group relative">
                <div className={`w-full rounded-t transition-all ${p.balance >= currentBalance ? 'bg-green-500' : 'bg-red-500'}`} style={{ height: `${h}%` }} />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {p.balance} ₽
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`p-6 rounded-2xl border ${bgCard}`}>
        <h3 className={`text-lg font-bold mb-4 ${textP}`}>История ставок</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {filteredStats.filteredBets.map(bet => (
            <div key={bet.id} className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex justify-between text-xs mb-1">
                <span className={textS}>{new Date(bet.date).toLocaleDateString('ru-RU')} {new Date(bet.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${bet.status === 'won' ? 'bg-green-400/10 text-green-400' : bet.status === 'lost' ? 'bg-red-400/10 text-red-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                  {bet.status === 'won' ? 'Выигрыш' : bet.status === 'lost' ? 'Проигрыш' : 'В игре'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-medium ${textP}`}>{bet.selections.map(s => s.team).join(' • ')}</span>
                <span className={`text-sm font-bold ${bet.status === 'won' ? 'text-green-400' : 'text-red-400'}`}>
                  {bet.status === 'won' ? `+${bet.potentialWin}` : `-${bet.stake}`} ₽
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, isDark, color }: { title: string; value: string | number; isDark: boolean; color?: string }) => (
  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#141414] border-white/5' : 'bg-white border-gray-200'}`}>
    <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</div>
    <div className={`text-xl font-black ${color || (isDark ? 'text-white' : 'text-gray-900')}`}>{value}</div>
  </div>
);

export default StatsPage;
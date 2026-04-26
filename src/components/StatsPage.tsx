import React, { useMemo } from 'react';

// Простой и быстрый компонент статистики без тяжелых библиотек (чтобы не тормозило)
const StatsPage: React.FC<{
  betHistory: any[];
  currentBalance: number;
  isDark: boolean;
  userId: string | null;
}> = ({ betHistory, currentBalance, isDark }) => {
  
  // 🔹 Оптимизация: считаем данные для графика ТОЛЬКО если изменилась история
  const stats = useMemo(() => {
    if (!betHistory || betHistory.length === 0) return null;

    let totalBets = betHistory.length;
    let wins = betHistory.filter((b) => b.status === 'won').length;
    let losses = betHistory.filter((b) => b.status === 'lost').length;
    let pending = totalBets - wins - losses;
    
    let totalSpent = betHistory.reduce((acc, b) => acc + b.stake, 0);
    let totalWon = betHistory.filter(b => b.status === 'won').reduce((acc, b) => acc + b.potentialWin, 0);
    let profit = totalWon - totalSpent;

    // Формируем точки графика (баланс после каждой ставки)
    // Чтобы график был быстрым, берем только последние 50 ставок
    const recentHistory = [...betHistory].reverse().slice(0, 50);
    
    let currentGraphBalance = currentBalance; // Начинаем с текущего
    const graphPoints = recentHistory.map((bet, index) => {
      // Идем задом наперед, восстанавливая баланс
      if (bet.status === 'won') {
        currentGraphBalance -= bet.potentialWin;
      } else if (bet.status === 'lost') {
        currentGraphBalance += bet.stake;
      } else {
        currentGraphBalance += bet.stake; // Pending
      }
      return { x: index, y: currentGraphBalance };
    }).reverse(); // Разворачиваем обратно, чтобы график шел слева направо

    return {
      totalBets,
      wins,
      losses,
      pending,
      profit,
      graphPoints
    };
  }, [betHistory, currentBalance]);

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Нет статистики</h3>
        <p className="text-gray-500">Сделай первую ставку, чтобы увидеть график</p>
      </div>
    );
  }

  const winRate = Math.round((stats.wins / stats.totalBets) * 100);
  const textP = isDark ? 'text-white' : 'text-gray-900';
  const textS = isDark ? 'text-gray-400' : 'text-gray-500';
  const bgCard = isDark ? 'bg-[#141414] border-white/5' : 'bg-white border-gray-200';

  return (
    <div className="space-y-6">
      {/* Основные цифры */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${bgCard}`}>
          <div className={`text-xs ${textS} mb-1`}>Всего ставок</div>
          <div className={`text-2xl font-black ${textP}`}>{stats.totalBets}</div>
        </div>
        <div className={`p-4 rounded-2xl border ${bgCard}`}>
          <div className={`text-xs ${textS} mb-1`}>Винрейт</div>
          <div className={`text-2xl font-black ${winRate > 50 ? 'text-green-400' : 'text-red-400'}`}>{winRate}%</div>
        </div>
        <div className={`p-4 rounded-2xl border ${bgCard}`}>
          <div className={`text-xs ${textS} mb-1`}>Прибыль</div>
          <div className={`text-2xl font-black ${stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.profit >= 0 ? '+' : ''}{stats.profit} ₽
          </div>
        </div>
        <div className={`p-4 rounded-2xl border ${bgCard}`}>
          <div className={`text-xs ${textS} mb-1`}>Текущий баланс</div>
          <div className={`text-2xl font-black ${textP}`}>{currentBalance} ₽</div>
        </div>
      </div>

      {/* График (CSS Bars - самый быстрый вариант) */}
      <div className={`p-6 rounded-2xl border ${bgCard}`}>
        <h3 className={`text-lg font-bold mb-4 ${textP}`}>Динамика баланса (последние 50 ставок)</h3>
        
        <div className="h-48 flex items-end justify-between gap-1">
          {stats.graphPoints.map((point, i) => {
            // Нормализуем высоту для отображения
            const maxVal = Math.max(...stats.graphPoints.map(p => p.y), 1000);
            const height = Math.max(5, (point.y / maxVal) * 100);
            
            return (
              <div key={i} className="flex-1 flex flex-col justify-end group relative">
                <div 
                  className={`w-full rounded-t-sm transition-all duration-300 ${point.y >= currentBalance ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ height: `${height}%` }}
                />
                {/* Тултип */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {point.y} ₽
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PlacedBet } from '../types';
import { formatCompact } from '../utils/format';
import { getTransactions } from '../hooks/transactions';

interface StatsPageProps {
  betHistory: PlacedBet[];
  currentBalance: number;
  isDark: boolean;
  userId: string | null;
}

type Period = 'day' | 'week' | 'month' | 'year' | 'all';

const StatsPage: React.FC<StatsPageProps> = ({ betHistory, currentBalance, isDark, userId }) => {
  const [period, setPeriod] = useState<Period>('all');
  const textP = isDark ? 'text-white' : 'text-gray-900';
  const textS = isDark ? 'text-gray-500' : 'text-gray-400';
  const textM = isDark ? 'text-gray-600' : 'text-gray-500';
  const bgC = isDark ? 'bg-[#141414] border-white/5' : 'bg-white border-gray-200';
  const bgL = isDark ? 'bg-white/5' : 'bg-gray-100';
  const bgLL = isDark ? 'bg-white/[0.02]' : 'bg-gray-50';
  const border = isDark ? 'border-white/5' : 'border-gray-200';

  const filteredBets = useMemo(() => {
    const now = new Date();
    return betHistory.filter((bet) => {
      if (period === 'all') return true;
      if (bet.timestamp.startsWith('Сегодня')) return period === 'day';
      if (bet.timestamp.startsWith('Вчера')) return period !== 'day';
      const tsParts = bet.timestamp.split(',');
      if (tsParts.length < 2) return true;
      const parts = tsParts[0].trim().split('.');
      if (parts.length === 2) {
        const diffDays = (now.getTime() - new Date(now.getFullYear(), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime()) / 86400000;
        if (period === 'day') return diffDays <= 1;
        if (period === 'week') return diffDays <= 7;
        if (period === 'month') return diffDays <= 30;
        if (period === 'year') return diffDays <= 365;
      }
      return true;
    });
  }, [betHistory, period]);

  const stats = useMemo(() => {
    const won = filteredBets.filter((b) => b.status === 'won');
    const lost = filteredBets.filter((b) => b.status === 'lost');
    const pending = filteredBets.filter((b) => b.status === 'pending');
    const resolved = won.length + lost.length;
    const winRate = resolved > 0 ? (won.length / resolved) * 100 : 0;
    const totalStaked = filteredBets.reduce((a, b) => a + b.stake, 0);
    const totalWon = won.reduce((a, b) => a + b.potentialWin, 0);
    const totalLost = lost.reduce((a, b) => a + b.stake, 0);
    const profit = totalWon - totalLost;
    const profitPercent = totalStaked > 0 ? (profit / totalStaked) * 100 : 0;
    const avgOdds = filteredBets.length > 0
      ? filteredBets.reduce((a, b) => a + b.selections.reduce((x, s) => x * s.odds, 1), 0) / filteredBets.length
      : 0;
    const biggestWin = won.length > 0 ? Math.max(...won.map((b) => b.potentialWin)) : 0;
    const biggestBet = filteredBets.length > 0 ? Math.max(...filteredBets.map((b) => b.stake)) : 0;
    const resolvedAll = filteredBets.filter((b) => b.status !== 'pending');
    const streak = resolvedAll.length === 0 ? { type: '—', count: 0 } : (() => {
      const ct = resolvedAll[0].status; let c = 0;
      for (const b of resolvedAll) { if (b.status === ct) c++; else break; }
      return { type: ct === 'won' ? 'побед' : 'поражений', count: c };
    })();
    return { totalBets: filteredBets.length, wonBets: won.length, lostBets: lost.length, pendingBets: pending.length, winRate, totalStaked, totalWon, totalLost, profit, profitPercent, avgOdds, biggestWin, biggestBet, streak };
  }, [filteredBets]);

  // Chart: build from transactions + bets, starting from initial balance
  const chartData = useMemo(() => {
    const txs = userId ? getTransactions(userId) : [];
    const initialBalance = 15420;

    // Collect all events sorted by time
    type Event = { date: Date; amount: number; label: string; type: string };
    const events: Event[] = [];

    // Bet events
    const sortedBets = [...filteredBets].sort((a, b) => {
      const ta = a.timestamp.split(',')[1]?.trim() || a.timestamp.split(',')[0]?.trim() || '';
      const tb = b.timestamp.split(',')[1]?.trim() || b.timestamp.split(',')[0]?.trim() || '';
      return ta.localeCompare(tb);
    });

    for (const bet of sortedBets) {
      events.push({ date: new Date(bet.timestamp), amount: -bet.stake, label: bet.timestamp, type: 'bet' });
      if (bet.status === 'won') {
        events.push({ date: new Date(bet.timestamp), amount: bet.potentialWin, label: bet.timestamp, type: 'win' });
      }
    }

    // Loan events
    for (const tx of txs) {
      events.push({ date: new Date(tx.createdAt), amount: tx.amount, label: tx.description.split(' ')[0] || tx.createdAt, type: tx.type });
    }

    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    let running = initialBalance;
    const data: Array<{ label: string; balance: number }> = [{ label: 'Старт', balance: initialBalance }];

    for (const ev of events) {
      running += ev.amount;
      data.push({ label: ev.label, balance: Math.round(running) });
    }

    return data;
  }, [filteredBets, userId]);

  const StatCard = ({ icon, label, value, subValue }: { icon: string; label: string; value: string; subValue?: string }) => (
    <div className={`${bgC} rounded-2xl p-4 border`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className={`text-xs font-medium ${textS}`}>{label}</span>
      </div>
      <div className={`text-lg font-black ${textP} leading-tight`}>{value}</div>
      {subValue && <div className={`text-xs mt-1 ${textM}`}>{subValue}</div>}
    </div>
  );

  const isEmpty = filteredBets.length === 0;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <h1 className={`text-xl font-black ${textP}`}>Статистика ставок</h1>
            <p className={`text-xs ${textS}`}>Подробная аналитика вашей игры</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 ${bgL} rounded-xl p-1 border ${border}`}>
          {[{ key: 'day' as Period, label: '24ч' }, { key: 'week' as Period, label: '7д' }, { key: 'month' as Period, label: '30д' }, { key: 'year' as Period, label: '1г' }, { key: 'all' as Period, label: 'Всё' }].map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p.key ? 'bg-amber-400/20 text-amber-400' : isDark ? `${textS} hover:text-white hover:bg-white/5` : `${textS} hover:text-gray-900 hover:bg-gray-200`}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className={`w-20 h-20 ${bgL} rounded-3xl flex items-center justify-center mb-4`}><span className="text-4xl">📈</span></div>
          <h3 className={`text-sm font-semibold mb-1 ${textS}`}>Нет данных</h3>
          <p className={`text-xs ${textM}`}>За выбранный период ставок не найдено</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-gradient-to-br from-amber-400/10 to-yellow-400/10 rounded-2xl p-5 border border-amber-400/10">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Текущий баланс</span>
              <div className={`text-2xl sm:text-3xl font-black ${textP} mt-1 tabular-nums`}>{formatCompact(currentBalance)}</div>
              <div className={`text-xs mt-1 font-medium ${stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.profit >= 0 ? '+' : ''}{formatCompact(stats.profit)} ({stats.profitPercent >= 0 ? '+' : ''}{stats.profitPercent.toFixed(1)}%)
              </div>
            </div>
            <div className={`${bgC} rounded-2xl p-5 border`}>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Всего ставок</span>
              <div className={`text-3xl font-black ${textP} mt-1`}>{stats.totalBets}</div>
              <div className={`text-xs mt-1 ${textM}`}>{stats.wonBets}W / {stats.lostBets}L / {stats.pendingBets}P</div>
            </div>
            <div className={`${bgC} rounded-2xl p-5 border`}>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Винрейт</span>
              <div className={`text-3xl font-black mt-1 ${stats.winRate >= 50 ? 'text-green-400' : stats.winRate >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                {stats.winRate.toFixed(1)}%
              </div>
              <div className={`text-xs mt-1 ${textM}`}>Серия: {stats.streak.count} {stats.streak.type}</div>
            </div>
          </div>

          <div className={`${bgC} rounded-2xl p-5 border mb-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-bold ${textP}`}>График баланса</h3>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-amber-400 rounded-full" />
                <span className={`text-xs ${textS}`}>Баланс</span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#ffffff10' : '#e5e7eb'} vertical={false} />
                  <XAxis dataKey="label" stroke={isDark ? '#555' : '#999'} tick={{ fill: isDark ? '#888' : '#666', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke={isDark ? '#555' : '#999'} tick={{ fill: isDark ? '#888' : '#666', fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: number) => {
                      const a = Math.abs(v);
                      if (a >= 1e9) return `${(v/1e9).toFixed(1)}B`;
                      if (a >= 1e6) return `${(v/1e6).toFixed(1)}M`;
                      if (a >= 1e3) return `${(v/1e3).toFixed(0)}к`;
                      return v.toString();
                    }} />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? '#1a1a1a' : '#fff', border: `1px solid ${isDark ? '#ffffff15' : '#e5e7eb'}`, borderRadius: '12px', color: isDark ? '#fff' : '#111', fontSize: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                    formatter={(value: unknown) => [`${Number(value).toLocaleString('ru-RU')} ₽`, 'Баланс']} />
                  <Area type="monotone" dataKey="balance" stroke="#FBBF24" strokeWidth={2} fill="url(#colorBal)"
                    dot={{ fill: '#FBBF24', strokeWidth: 2, r: 3 }} activeDot={{ fill: '#FBBF24', strokeWidth: 0, r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard icon="💰" label="Поставлено" value={formatCompact(stats.totalStaked)} />
            <StatCard icon="🏆" label="Выиграно" value={formatCompact(stats.totalWon)} subValue={`Сред. коэф: ${stats.avgOdds.toFixed(2)}`} />
            <StatCard icon="📉" label="Проиграно" value={formatCompact(stats.totalLost)} />
            <StatCard icon={stats.biggestWin > 0 ? '🔥' : '—'} label="Макс. выигрыш" value={stats.biggestWin > 0 ? formatCompact(stats.biggestWin) : '—'}
              subValue={stats.biggestBet > 0 ? `Макс. ставка: ${formatCompact(stats.biggestBet)}` : ''} />
          </div>

          <div className={`${bgC} rounded-2xl border overflow-hidden`}>
            <div className={`px-5 py-4 border-b ${border}`}><h3 className={`text-sm font-bold ${textP}`}>Последние ставки</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${border}`}>
                    <th className={`text-left text-xs font-medium ${textS} uppercase tracking-wider px-5 py-3`}>Время</th>
                    <th className={`text-left text-xs font-medium ${textS} uppercase tracking-wider px-5 py-3`}>Исход</th>
                    <th className={`text-left text-xs font-medium ${textS} uppercase tracking-wider px-5 py-3`}>Ставка</th>
                    <th className={`text-left text-xs font-medium ${textS} uppercase tracking-wider px-5 py-3`}>Коэф.</th>
                    <th className={`text-right text-xs font-medium ${textS} uppercase tracking-wider px-5 py-3`}>Результат</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBets.slice(0, 10).map((bet) => {
                    const totalOdds = bet.selections.reduce((a, s) => a * s.odds, 1);
                    return (
                      <tr key={bet.id} className={`border-b ${border} last:border-b-0 ${bgLL}`}>
                        <td className={`px-5 py-3 text-xs ${textS}`}>{bet.timestamp}</td>
                        <td className="px-5 py-3">{bet.selections.map((sel, idx) => (
                          <div key={idx} className={`text-xs ${textP} font-medium`}>{sel.team}</div>
                        ))}</td>
                        <td className={`px-5 py-3 text-xs font-medium tabular-nums ${textP}`}>{bet.stake.toLocaleString('ru-RU')} ₽</td>
                        <td className="px-5 py-3"><span className="text-xs font-bold text-amber-400 tabular-nums">{totalOdds.toFixed(2)}</span></td>
                        <td className="px-5 py-3 text-right">
                          <span className={`text-xs font-bold tabular-nums ${bet.status === 'won' ? 'text-green-400' : bet.status === 'lost' ? 'text-red-400' : 'text-amber-400'}`}>
                            {bet.status === 'won' ? `+${bet.potentialWin.toLocaleString('ru-RU')} ₽` : bet.status === 'lost' ? `-${bet.stake.toLocaleString('ru-RU')} ₽` : 'В игре'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatsPage;
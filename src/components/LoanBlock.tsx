import React, { useState, useEffect } from 'react';
import { Loan, formatDueDate, getTimeRemaining } from '../types/loan';

interface LoanBlockProps {
  loan: Loan | null;
  onRepayFull: () => void;
  onRepayPartial: (amount: number) => void;
  isDark: boolean;
}

const LoanBlock: React.FC<LoanBlockProps> = ({ loan, onRepayFull, onRepayPartial, isDark }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, expired: false });
  const [partialAmount, setPartialAmount] = useState('');
  const [showPartial, setShowPartial] = useState(false);

  useEffect(() => {
    if (!loan) return;
    const update = () => setTimeLeft(getTimeRemaining(loan.dueDate));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [loan]);

  if (!loan) {
    return (
      <div className={`rounded-xl p-4 border ${isDark ? 'bg-green-400/5 border-green-400/10' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">✅</span>
          <span className={`text-sm font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>Долгов нет</span>
        </div>
      </div>
    );
  }

  const isUrgent = timeLeft.hours < 24 && !timeLeft.expired;
  const progress = (() => {
    const total = new Date(loan.dueDate).getTime() - new Date(loan.createdAt).getTime();
    const elapsed = Date.now() - new Date(loan.createdAt).getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  })();

  return (
    <div className={`rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Долг</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            timeLeft.expired
              ? 'bg-red-400/10 text-red-400'
              : isUrgent
                ? 'bg-amber-400/10 text-amber-400'
                : 'bg-green-400/10 text-green-400'
          }`}>
            {timeLeft.expired ? 'Просрочен' : isUrgent ? 'Скоро' : 'Активен'}
          </span>
        </div>

        {/* Amount */}
        <div className={`text-xl font-black mb-1 ${timeLeft.expired ? 'text-red-400' : isUrgent ? 'text-red-400' : 'text-red-400'}`}>
          -{loan.remaining.toLocaleString('ru-RU')} ₽
        </div>

        {/* Due date */}
        <div className={`text-xs mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Погасить до: {formatDueDate(loan.dueDate)}
        </div>

        {/* Progress bar */}
        <div className={`w-full h-1.5 rounded-full mb-4 ${isDark ? 'bg-white/5' : 'bg-gray-200'}`}>
          <div
            className={`h-full rounded-full transition-all ${timeLeft.expired ? 'bg-red-400' : isUrgent ? 'bg-amber-400' : 'bg-green-400'}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onRepayFull}
            disabled={loan.remaining <= 0}
            className="flex-1 py-2 rounded-lg text-xs font-bold bg-green-400/15 text-green-400 border border-green-400/20 hover:bg-green-400/20 transition-colors cursor-pointer disabled:opacity-30"
          >
            Погасить полностью
          </button>
          <button
            onClick={() => setShowPartial(!showPartial)}
            className="flex-1 py-2 rounded-lg text-xs font-bold border border-amber-400/20 text-amber-400 hover:bg-amber-400/10 transition-colors cursor-pointer"
          >
            Частично
          </button>
        </div>

        {/* Partial repayment input */}
        {showPartial && (
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
              placeholder="Сумма"
              className={`flex-1 text-sm rounded-lg px-3 py-2 border ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'} focus:outline-none focus:border-amber-400/30`}
            />
            <button
              onClick={() => {
                const amount = parseFloat(partialAmount);
                if (amount > 0) {
                  onRepayPartial(amount);
                  setPartialAmount('');
                  setShowPartial(false);
                }
              }}
              className="px-4 py-2 rounded-lg bg-amber-400 text-black font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              Внести
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanBlock;

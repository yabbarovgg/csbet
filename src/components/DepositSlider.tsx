import React, { useState, useEffect } from 'react';

interface DepositSliderProps {
  onDeposit: (amount: number, days: number) => void;
  onClose: () => void;
  isDark?: boolean;
  isFirstLoan: boolean;
  currentDebt: number;
}

const MAX_TOTAL_DEBT = 100000;
const MAX_LOAN_AMOUNT = 30000;
const MIN_AMOUNT = 100;
const MIN_DAYS = 1;
const MAX_DAYS = 7;

const DepositSlider: React.FC<DepositSliderProps> = ({ onDeposit, onClose, isDark = true, isFirstLoan, currentDebt }) => {
  // Calculate max available: min of per-loan cap and remaining room under total cap
  const maxAvailable = Math.max(0, Math.min(MAX_LOAN_AMOUNT, MAX_TOTAL_DEBT - currentDebt));
  const hasRoom = maxAvailable >= MIN_AMOUNT;

  const [amount, setAmount] = useState(hasRoom ? Math.min(5000, maxAvailable) : MIN_AMOUNT);
  const [days, setDays] = useState(MIN_DAYS);
  const [error, setError] = useState('');

  // Ensure amount stays valid
  useEffect(() => {
    if (!hasRoom) {
      setAmount(0);
      return;
    }
    if (amount > maxAvailable) setAmount(maxAvailable);
    if (amount < MIN_AMOUNT) setAmount(MIN_AMOUNT);
  }, [maxAvailable, hasRoom, amount]);

  // Validate and clamp on every change
  const setSafeAmount = (val: number) => {
    let v = Math.round(val);
    if (isNaN(v) || v < 0) v = 0;
    if (v > MAX_TOTAL_DEBT) {
      setError(`Максимальная сумма займа — ${MAX_TOTAL_DEBT.toLocaleString('ru-RU')} ₽`);
      v = MAX_TOTAL_DEBT;
    } else if (v > maxAvailable) {
      setError(`Доступно не более ${maxAvailable.toLocaleString('ru-RU')} ₽ (учитывая текущий долг)`);
      v = maxAvailable;
    } else if (v > MAX_LOAN_AMOUNT) {
      setError(`Максимальная сумма одного займа — ${MAX_LOAN_AMOUNT.toLocaleString('ru-RU')} ₽`);
      v = MAX_LOAN_AMOUNT;
    } else if (v < MIN_AMOUNT && v > 0) {
      setError(`Минимальная сумма: ${MIN_AMOUNT} ₽`);
    } else {
      setError('');
    }
    setAmount(Math.min(v, maxAvailable, MAX_TOTAL_DEBT));
  };

  const getAmountPercent = () => {
    if (!hasRoom) return 0;
    return ((amount - MIN_AMOUNT) / (maxAvailable - MIN_AMOUNT)) * 100;
  };

  const getDaysPercent = () => ((days - MIN_DAYS) / (MAX_DAYS - MIN_DAYS)) * 100;

  // Interest calculation
  const rate = isFirstLoan ? 0 : 0.008;
  const interest = Math.round(Math.max(0, amount) * rate * days);
  const totalToReturn = Math.max(0, amount) + interest;

  const isValid = amount >= MIN_AMOUNT && amount <= maxAvailable && !error;

  const inputClass = (hasError: boolean) =>
    `w-24 text-right font-bold rounded-lg px-2 py-1 transition-colors ${
      hasError
        ? 'border-red-500 bg-red-400/5 text-red-400'
        : isDark ? 'bg-black/50 border border-white/20 text-white' : 'bg-gray-100 border border-gray-300 text-gray-900'
    }`;

  if (!hasRoom) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" style={{ overflow: 'hidden' }}>
        <div className={`w-full max-w-sm rounded-2xl border ${isDark ? 'bg-[#141414] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
          <div className="flex items-center justify-between p-6 pb-0">
            <h3 className="text-lg font-bold">Микрозайм</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-xl cursor-pointer">×</button>
          </div>
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-sm text-red-400 font-semibold mb-2">Превышен лимит займов</p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Общая сумма долга не может превышать {MAX_TOTAL_DEBT.toLocaleString('ru-RU')} ₽
            </p>
            <button
              onClick={onClose}
              className="mt-6 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-bold text-sm px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
            >
              Понятно
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" style={{ overflow: 'hidden' }}>
      <div className={`w-full max-w-md rounded-2xl border ${isDark ? 'bg-[#141414] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h3 className="text-lg font-bold">Микрозайм</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl cursor-pointer">×</button>
        </div>

        <div className="p-6" style={{ boxSizing: 'border-box' }}>
          {/* First loan badge */}
          {isFirstLoan && (
            <div className="bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-2 mb-6 text-center">
              <span className="text-green-400 font-bold text-sm">🎉 Первый займ — бесплатно 0%!</span>
            </div>
          )}

          {/* --- СКОЛЬКО ДЕНЕГ --- */}
          <div className="mb-8" style={{ boxSizing: 'border-box', maxWidth: '100%' }}>
            <div className="flex justify-between items-center mb-4">
              <label className="font-semibold text-sm">Сколько вам нужно?</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={MIN_AMOUNT}
                  max={maxAvailable}
                  value={amount}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) setSafeAmount(v);
                    else if (e.target.value === '') setAmount(0);
                  }}
                  className={inputClass(!!error || amount > maxAvailable || amount < MIN_AMOUNT)}
                />
                <span className="text-xs text-gray-500">₽</span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <svg className="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="text-xs text-red-400">{error}</span>
              </div>
            )}

            {/* Slider */}
            <div className="relative h-2 w-full rounded-full bg-gray-700 mb-3" style={{ boxSizing: 'border-box' }}>
              <div
                className="absolute top-0 left-0 h-full rounded-full bg-green-500"
                style={{ width: `${getAmountPercent()}%`, transition: 'width 0.15s' }}
              />
              <input
                type="range"
                min={MIN_AMOUNT}
                max={maxAvailable}
                step={100}
                value={amount}
                onChange={(e) => setSafeAmount(Number(e.target.value))}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                style={{ boxSizing: 'border-box' }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg pointer-events-none transition-all"
                style={{ left: `calc(${getAmountPercent()}% - 10px)` }}
              />
            </div>

            {/* Min/Max labels */}
            <div className="flex justify-between px-1">
              <span className="text-[10px] text-gray-600">{MIN_AMOUNT} ₽</span>
              <span className="text-[10px] text-gray-600">{maxAvailable.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>

          {/* --- СРОК --- */}
          <div className="mb-8" style={{ boxSizing: 'border-box', maxWidth: '100%' }}>
            <div className="flex justify-between items-center mb-4">
              <label className="font-semibold text-sm">На какой срок?</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={MIN_DAYS}
                  max={MAX_DAYS}
                  value={days}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) setDays(Math.max(MIN_DAYS, Math.min(MAX_DAYS, v)));
                  }}
                  className={`w-16 text-right font-bold rounded-lg px-2 py-1 ${isDark ? 'bg-black/50 border border-white/20 text-white' : 'bg-gray-100 border border-gray-300 text-gray-900'}`}
                />
                <span className="text-xs text-gray-500">ДНЕЙ</span>
              </div>
            </div>

            <div className="relative h-2 w-full rounded-full bg-gray-700 mb-3" style={{ boxSizing: 'border-box' }}>
              <div
                className="absolute top-0 left-0 h-full rounded-full bg-green-500"
                style={{ width: `${getDaysPercent()}%`, transition: 'width 0.15s' }}
              />
              <input
                type="range"
                min={MIN_DAYS}
                max={MAX_DAYS}
                step={1}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                style={{ boxSizing: 'border-box' }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg pointer-events-none transition-all"
                style={{ left: `calc(${getDaysPercent()}% - 10px)` }}
              />
            </div>

            <div className="flex justify-between px-1">
              <span className="text-[10px] text-gray-600">{MIN_DAYS} день</span>
              <span className="text-[10px] text-gray-600">{MAX_DAYS} дней</span>
            </div>
          </div>

          {/* --- ИТОГИ --- */}
          <div className={`flex items-center justify-between p-4 rounded-xl mb-6 ${isDark ? 'bg-[#1A1A1A]' : 'bg-gray-50'}`}>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Вы берете</div>
              <div className="text-xl font-bold">{Math.max(0, amount).toLocaleString('ru-RU')} ₽</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Проценты</div>
              <div className={`text-xl font-bold ${interest > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                {interest.toLocaleString('ru-RU')} ₽
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Вы отдаете</div>
              <div className="text-xl font-bold">{totalToReturn.toLocaleString('ru-RU')} ₽</div>
            </div>
          </div>

          {/* --- КНОПКА --- */}
          <button
            onClick={() => { if (isValid) onDeposit(amount, days); }}
            disabled={!isValid}
            className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${
              isValid
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black hover:opacity-90 hover:scale-[1.02] shadow-lg shadow-amber-500/20 cursor-pointer'
                : 'bg-white/5 text-gray-500 cursor-not-allowed'
            }`}
            title={!isValid ? `Доступно: ${maxAvailable.toLocaleString('ru-RU')} ₽` : ''}
          >
            {isValid ? 'Получить бесплатно' : `Доступно: ${maxAvailable.toLocaleString('ru-RU')} ₽`}
          </button>

          <p className="text-[10px] text-gray-500 mt-3 text-center">
            {isFirstLoan
              ? 'Первый заем — абсолютно бесплатно! При условии оплаты в срок.'
              : `Ставка: 0.8% в день. При просрочке — автоматическое списание с баланса.`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DepositSlider;

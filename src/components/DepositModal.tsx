import React from 'react';

interface DepositModalProps {
  onClose: () => void;
  onSelectCard: () => void;
  onSelectLoan: () => void;
  onSelectPromo: () => void;
  isDark?: boolean;
}

const DepositModal: React.FC<DepositModalProps> = ({ onClose, onSelectCard, onSelectLoan, onSelectPromo, isDark = true }) => {
  const bg = isDark ? 'bg-[#141414] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900';
  const cardBg = isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-200 hover:bg-gray-100';
  const label = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" style={{ overflow: 'hidden' }}>
      <div className={`w-full max-w-sm rounded-2xl border ${bg}`}>
        <div className="flex items-center justify-between p-6 pb-0">
          <h3 className="text-lg font-bold">Пополнение</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl cursor-pointer">×</button>
        </div>

        <div className="p-6 space-y-3">
          {/* Bank Card */}
          <button onClick={onSelectCard} className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${cardBg}`}>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-xl shrink-0">
              💳
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Банковская карта</div>
              <div className={`text-xs ${label}`}>Visa, Mastercard, МИР</div>
            </div>
            <span className={`ml-auto text-xs px-2 py-1 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>Скоро</span>
          </button>

          {/* Microloan */}
          <button onClick={onSelectLoan} className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${cardBg}`}>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-xl shrink-0">
              🏦
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Микрозайм</div>
              <div className={`text-xs ${label}`}>Первый займ — 0%!</div>
            </div>
            <span className="ml-auto text-xs px-2 py-1 rounded-full bg-green-400/20 text-green-400">0%</span>
          </button>

          {/* Promo */}
          <button onClick={onSelectPromo} className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${cardBg}`}>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl shrink-0">
              🎟️
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Промокод</div>
              <div className={`text-xs ${label}`}>Введите код для бонуса</div>
            </div>
            <span className={`ml-auto text-xs px-2 py-1 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>Скоро</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepositModal;

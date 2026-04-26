import React, { useState, useRef, useEffect } from 'react';
import { Notification } from '../types/loan';

interface NotificationsProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  isDark: boolean;
}

const Notifications: React.FC<NotificationsProps> = ({ notifications, unreadCount, onMarkAllRead, onClearAll, isDark }) => {
  const [open, setOpen] = useState(false);
  const [justGotNotif, setJustGotNotif] = useState(false);
  const prevUnread = useRef(unreadCount);
  const ref = useRef<HTMLDivElement>(null);

  // Trigger brief bounce when new notification arrives
  useEffect(() => {
    if (unreadCount > prevUnread.current && unreadCount > 0) {
      setJustGotNotif(true);
      const timer = setTimeout(() => setJustGotNotif(false), 2000);
      return () => clearTimeout(timer);
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const bg = isDark ? 'bg-[#141414] border-white/10' : 'bg-white border-gray-200';
  const textP = isDark ? 'text-white' : 'text-gray-900';
  const textS = isDark ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer relative ${
          isDark ? 'bg-white/5 text-amber-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } ${justGotNotif ? 'animate-pulse' : ''}`}
        title="Уведомления"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`absolute right-0 top-12 w-80 max-h-96 overflow-y-auto rounded-2xl border shadow-2xl z-[9998] ${bg}`}>
          <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
            <h4 className={`font-bold text-sm ${textP}`}>Уведомления</h4>
            <div className="flex gap-2">
              <button onClick={onMarkAllRead} className={`text-xs cursor-pointer ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
                Прочитать все
              </button>
              <button onClick={onClearAll} className={`text-xs cursor-pointer ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}>
                Очистить
              </button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className={`p-8 text-center ${textS}`}>
              <div className="text-3xl mb-2">🔔</div>
              <p className="text-sm">Нет уведомлений</p>
            </div>
          ) : (
            notifications.slice().reverse().map((n) => (
              <div
                key={n.id}
                className={`p-4 border-b last:border-b-0 transition-colors ${
                  !n.read
                    ? isDark ? 'bg-amber-400/5' : 'bg-amber-50'
                    : ''
                } ${isDark ? 'border-white/5' : 'border-gray-100'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.read ? 'bg-amber-400' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold mb-0.5 ${textP}`}>{n.title}</div>
                    <div className={`text-xs ${textS}`}>{n.message}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
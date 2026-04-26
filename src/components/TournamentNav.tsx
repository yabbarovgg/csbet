import React, { useState, useMemo, useCallback } from 'react';
import { Match } from '../types';

interface TournamentNavProps {
  tournaments: Array<{ id: string; name: string; icon: string; count: number }>;
  activeTournament: string | null;
  onSelect: (id: string | null) => void;
  isDark: boolean;
  allMatches: Match[];
  onMatchClick: (matchId: string | null) => void;
  selectedMatchId: string | null;
}

const TournamentNav: React.FC<TournamentNavProps> = ({
  tournaments, activeTournament, onSelect, isDark, allMatches, onMatchClick, selectedMatchId,
}) => {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const inactiveHover = isDark ? 'hover:text-white hover:bg-white/5' : 'hover:text-gray-900 hover:bg-gray-100';
  const inactiveText = isDark ? 'text-gray-400' : 'text-gray-500';

  const liveCount = allMatches.filter((m) => m.isLive).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tournaments
      .map((t) => {
        const matches = allMatches.filter((m) => m.tournament === t.name);
        const filteredMatches = q
          ? matches.filter(
              (m) =>
                m.team1.toLowerCase().includes(q) ||
                m.team2.toLowerCase().includes(q) ||
                m.tournament.toLowerCase().includes(q)
            )
          : matches;
        return {
          ...t,
          matches: filteredMatches,
          visible: !q || t.name.toLowerCase().includes(q) || filteredMatches.length > 0,
        };
      })
      .filter((t) => t.visible);
  }, [search, tournaments, allMatches]);

  const handleTournamentClick = useCallback((id: string) => {
    onSelect(id);
    onMatchClick(null);
    if (!expanded.has(tournaments.find((t) => t.id === id)?.name ?? '')) {
      toggleExpand(tournaments.find((t) => t.id === id)?.name ?? '');
    }
  }, [onSelect, onMatchClick, expanded, tournaments]);

  return (
    <nav className={`${isDark ? 'bg-[#0d0d0d]' : 'bg-white'} border-r ${isDark ? 'border-white/5' : 'border-gray-200'} h-full lg:h-[calc(100vh-88px)] lg:sticky lg:top-[88px] flex flex-col overflow-hidden transition-colors duration-300 w-56 shrink-0`}>
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium mb-4 w-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
          <span>🎮</span>
          <span>CS2</span>
          {liveCount > 0 && (
            <span className="text-white text-[10px] font-bold ml-auto flex items-center justify-center shrink-0" style={{ width: 20, height: 20, borderRadius: '9999px', background: '#ef4444 !important' }}>
              {liveCount}
            </span>
          )}
        </div>

        {selectedMatchId && (
          <button
            onClick={() => onMatchClick(null)}
            className="w-full mb-3 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2.5 text-left cursor-pointer hover:bg-amber-400/15 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-400 font-semibold">Выбран матч</span>
              <span className="text-xs text-gray-500 hover:text-white transition-colors cursor-pointer">Сбросить ×</span>
            </div>
          </button>
        )}

        <div className="mb-3">
          <div className="relative">
            <svg className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Команда, турнир..."
              className={`w-full text-xs rounded-lg pl-8 pr-7 py-2 border ${isDark ? 'bg-white/5 border-white/5 text-white placeholder:text-gray-600 focus:border-amber-400/30' : 'bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-400/50'} focus:outline-none transition-colors cursor-text`}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-sm cursor-pointer">×</button>
            )}
          </div>
        </div>

        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Турниры</h3>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => { onSelect(null); onMatchClick(null); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-all duration-200 cursor-pointer ${
              activeTournament === null && !selectedMatchId
                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                : `${inactiveText} border border-transparent ${inactiveHover}`
            }`}
          >
            <span className="text-lg">🎮</span>
            <span className="font-medium">Все турниры</span>
          </button>

          {filtered.map((t) => {
            const isExpanded = expanded.has(t.name);
            const hasMatches = t.matches.length > 0;
            return (
              <div key={t.id}>
                <button
                  onClick={() => handleTournamentClick(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-all duration-200 cursor-pointer ${
                    activeTournament === t.id
                      ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                      : `${inactiveText} border border-transparent ${inactiveHover}`
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium leading-tight truncate">{t.name}</span>
                    <span className={`text-xs mt-0.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {hasMatches ? `${t.matches.length} матчей` : `${t.count} матчей`}
                    </span>
                  </div>
                  {hasMatches && (
                    <svg
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''} ${isDark ? 'text-gray-600' : 'text-gray-400'}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </button>
                {isExpanded && hasMatches && (
                  <div className={`ml-6 mt-1 mb-1 flex flex-col gap-0.5 border-l ${isDark ? 'border-white/5' : 'border-gray-200'} pl-3`}>
                    {t.matches.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { onMatchClick(m.id); onSelect(null); }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                          selectedMatchId === m.id
                            ? 'bg-amber-400/15 text-amber-400 border border-amber-400/20'
                            : isDark ? 'text-gray-300 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {m.isLive && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />}
                          <span className="truncate">
                            {m.team1} <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>vs</span> {m.team2}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="text-2xl mb-2">🔍</span>
              <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Ничего не найдено</p>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default TournamentNav;

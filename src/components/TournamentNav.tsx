import React from 'react';
import { Match } from '../types';

interface TournamentNavProps {
  tournaments: string[];
  activeTournament: string | null;
  onSelect: (id: string) => void;
  isDark: boolean;
  allMatches: Match[];
  onMatchClick: (id: string) => void;
  selectedMatchId: string | null;
}

const TournamentNav: React.FC<TournamentNavProps> = ({
  tournaments, activeTournament, onSelect, isDark, allMatches
}) => {
  // 🔹 Динамический подсчёт матчей для каждого турнира
  const counts: Record<string, number> = {};
  tournaments.forEach(t => {
    counts[t] = allMatches.filter(m => m.tournament === t || m.tournament.includes(t)).length;
  });

  const totalMatches = allMatches.length;

  return (
    <nav className={`w-64 h-full ${isDark ? 'bg-[#0d0d0d] border-r border-white/5' : 'bg-white border-r border-gray-200'} p-4 overflow-y-auto transition-colors duration-300`}>
      <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Турниры</h3>
      
      <button
        onClick={() => onSelect('')}
        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium mb-1.5 transition-all flex items-center justify-between ${
          activeTournament === null
            ? isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-gray-100 text-gray-900 shadow-sm'
            : isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        <span>Все матчи</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>{totalMatches}</span>
      </button>

      {tournaments.map(t => (
        <button
          key={t}
          onClick={() => onSelect(t.toLowerCase())}
          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium mb-1.5 transition-all flex items-center justify-between ${
            activeTournament === t.toLowerCase()
              ? isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-gray-100 text-gray-900 shadow-sm'
              : isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <span>{t}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>{counts[t] || 0}</span>
        </button>
      ))}
    </nav>
  );
};

export default TournamentNav;
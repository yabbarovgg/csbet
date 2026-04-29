import React from 'react';
import { Match } from '../types';

interface MatchesSectionProps {
  title: string | React.ReactNode;
  icon?: React.ReactNode;
  matches: Match[];
  selections: any[];
  onToggleSelection: (sel: any) => void;
  isDark: boolean;
  formatRelativeTime?: (match: Match) => string;
}

const MatchesSection: React.FC<MatchesSectionProps> = ({
  title, icon, matches, selections, onToggleSelection, isDark, formatRelativeTime
}) => {
  if (matches.length === 0) return null;

  const isSelected = (matchId: string, team: string) =>
    selections.some(s => s.matchId === matchId && s.team === team);

  const getTeamClass = (matchId: string, team: string) =>
    isSelected(matchId, team) ? 'text-amber-400 font-bold' : isDark ? 'text-gray-300' : 'text-gray-700';

  const getOddsClass = (matchId: string, team: string) => {
    const active = isSelected(matchId, team);
    return `flex-1 py-2.5 px-3 rounded-xl text-sm font-bold text-center transition-all cursor-pointer border ${
      active
        ? 'bg-amber-400 text-black border-amber-400 shadow-lg shadow-amber-400/20 scale-[1.02]'
        : isDark
        ? 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 hover:text-gray-900'
    }`;
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        {typeof title === 'string' ? (
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
        ) : title}
        {icon}
      </div>
      <div className="space-y-3">
        {matches.map(match => (
          <div key={match.id} className={`p-4 rounded-2xl border transition-colors ${isDark ? 'bg-[#141414] border-white/5 hover:border-white/10' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{match.tournament}</span>
              {match.isLive ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  LIVE • {match.score1} : {match.score2}
                </span>
              ) : (
                formatRelativeTime && <span className={`text-xs font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{formatRelativeTime(match)}</span>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <button onClick={() => onToggleSelection({ matchId: match.id, team: match.team1, odds: match.odds1, tournament: match.tournament, selectionType: '1' })}
                className={getOddsClass(match.id, match.team1)}>
                <div className="text-left"><div className={getTeamClass(match.id, match.team1)}>{match.team1}</div></div>
                <div className="mt-1">{match.odds1.toFixed(2)}</div>
              </button>

              <span className={`text-xs font-medium ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>vs</span>

              <button onClick={() => onToggleSelection({ matchId: match.id, team: match.team2, odds: match.odds2, tournament: match.tournament, selectionType: '2' })}
                className={getOddsClass(match.id, match.team2)}>
                <div className="text-left"><div className={getTeamClass(match.id, match.team2)}>{match.team2}</div></div>
                <div className="mt-1">{match.odds2.toFixed(2)}</div>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchesSection;
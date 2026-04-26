import React from 'react';
import { Match, BetSelection } from '../types';

interface MatchCardProps {
  match: Match;
  selections: BetSelection[];
  onToggleSelection: (selection: BetSelection) => void;
  isDark: boolean;
  formatRelativeTime?: (match: Match) => string;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, selections, onToggleSelection, isDark, formatRelativeTime }) => {
  const isSelected = (team: string) =>
    selections.some((s) => s.matchId === match.id && s.selectionType === 'winner' && s.team === team);

  const bg = isDark ? 'bg-[#141414]' : 'bg-white';
  const border = isDark ? 'border-white/5' : 'border-gray-200';
  const bgHeader = isDark ? 'bg-white/[0.02]' : 'bg-gray-50';
  const textP = isDark ? 'text-white' : 'text-gray-900';
  const bgTeam = isDark ? 'bg-white/5' : 'bg-gray-100';

  const oddBtn = (selected: boolean) => {
    if (selected) return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/40';
    return isDark
      ? 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border-white/5'
      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 border-gray-200';
  };

  return (
    <div className={`${bg} rounded-2xl border ${border} overflow-hidden transition-all duration-300`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${bgHeader} border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm">{match.tournamentIcon}</span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{match.tournament}</span>
        </div>
        {match.isLive ? (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-red-400">LIVE</span>
            {match.liveMinute && <span className="text-xs text-gray-500 ml-1">{match.liveMinute}</span>}
          </div>
        ) : formatRelativeTime && match.startTime ? (
          <span className="text-xs font-medium text-amber-400">{formatRelativeTime(match)}</span>
        ) : (
          <div className="flex items-center gap-2">
            {match.date && <span className="text-xs text-gray-500">{match.date}</span>}
            {match.startTime && <span className="text-xs font-medium text-gray-400">{match.startTime}</span>}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Teams + Score */}
          <div className="flex-1 flex items-center gap-3">
            <div className="flex flex-col gap-3 flex-1">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 ${bgTeam} rounded-lg flex items-center justify-center text-xs font-bold text-gray-400 shrink-0`}>
                  {match.team1.substring(0, 2).toUpperCase()}
                </div>
                <span className={`text-sm font-semibold ${match.score1 !== undefined && match.score1 > (match.score2 ?? 0) ? 'text-green-400' : textP}`}>
                  {match.team1}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 ${bgTeam} rounded-lg flex items-center justify-center text-xs font-bold text-gray-400 shrink-0`}>
                  {match.team2.substring(0, 2).toUpperCase()}
                </div>
                <span className={`text-sm font-semibold ${match.score2 !== undefined && match.score2 > (match.score1 ?? 0) ? 'text-green-400' : textP}`}>
                  {match.team2}
                </span>
              </div>
            </div>

            {/* Score */}
            {match.score1 !== undefined && match.score2 !== undefined && (
              <div className="flex flex-col items-end gap-3 pl-2">
                <span className={`text-lg font-black tabular-nums ${match.score1 > match.score2 ? 'text-green-400' : textP}`}>{match.score1}</span>
                <span className={`text-lg font-black tabular-nums ${match.score2 > match.score1 ? 'text-green-400' : textP}`}>{match.score2}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className={`w-px h-12 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

          {/* Odds */}
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => onToggleSelection({
                matchId: match.id, tournament: match.tournament, team1: match.team1, team2: match.team2,
                selectionType: 'winner', selectionLabel: `П1: ${match.team1}`, team: match.team1,
                odds: match.odds1,
              })}
              className={`flex items-center justify-between w-[100px] px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border cursor-pointer ${oddBtn(isSelected(match.team1))}`}
            >
              <span className="text-[10px] font-bold opacity-60">П1</span>
              <span className="font-bold tabular-nums">{match.odds1.toFixed(2)}</span>
            </button>
            <button
              onClick={() => onToggleSelection({
                matchId: match.id, tournament: match.tournament, team1: match.team1, team2: match.team2,
                selectionType: 'winner', selectionLabel: `П2: ${match.team2}`, team: match.team2,
                odds: match.odds2,
              })}
              className={`flex items-center justify-between w-[100px] px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border cursor-pointer ${oddBtn(isSelected(match.team2))}`}
            >
              <span className="text-[10px] font-bold opacity-60">П2</span>
              <span className="font-bold tabular-nums">{match.odds2.toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchCard;

import React from 'react';
import { Match, BetSelection } from '../types';
import MatchCard from './MatchCard';

interface MatchesSectionProps {
  title: string;
  icon: string;
  matches: Match[];
  selections: BetSelection[];
  onToggleSelection: (selection: BetSelection) => void;
  isDark: boolean;
  formatRelativeTime?: (match: Match) => string;
}

const MatchesSection: React.FC<MatchesSectionProps> = ({ title, icon, matches, selections, onToggleSelection, isDark, formatRelativeTime }) => {
  if (matches.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xl">{icon}</span>
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full tabular-nums ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
          {matches.length}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            selections={selections}
            onToggleSelection={onToggleSelection}
            isDark={isDark}
            formatRelativeTime={formatRelativeTime}
          />
        ))}
      </div>
    </section>
  );
};

export default MatchesSection;

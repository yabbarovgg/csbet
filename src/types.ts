export interface Match {
  id: string;
  tournament: string;
  tournamentIcon?: string;
  team1: string;
  team2: string;
  isLive: boolean;
  liveMinute?: string;
  score1?: number;
  score2?: number;
  odds1: number;
  odds2: number;
  startTime?: string;
  date?: string;
}

export interface BetSelection {
  matchId: string;
  tournament: string;
  team1: string;
  team2: string;
  selectionType: 'winner';
  selectionLabel: string;
  team: string;
  odds: number;
  mapName?: string;
}

export interface PlacedBet {
  id: string;
  selections: BetSelection[];
  stake: number;
  potentialWin: number;
  timestamp: string;
  status: 'pending' | 'won' | 'lost';
}

export type TransactionType = 'bet' | 'bet_win' | 'loan_taken' | 'loan_repaid';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // positive = added, negative = deducted
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface TransactionsDB {
  [userId: string]: Transaction[];
}

function load(): TransactionsDB {
  try {
    const raw = localStorage.getItem('csbet_transactions');
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return {};
}

function save(data: TransactionsDB) {
  localStorage.setItem('csbet_transactions', JSON.stringify(data));
}

export function addTransaction(userId: string, type: TransactionType, amount: number, balanceAfter: number, description: string) {
  const db = load();
  if (!db[userId]) db[userId] = [];
  db[userId].push({
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    amount,
    balanceAfter,
    description,
    createdAt: new Date().toISOString(),
  });
  save(db);
}

export function getTransactions(userId: string): Transaction[] {
  const db = load();
  return db[userId] || [];
}

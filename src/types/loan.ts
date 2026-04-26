export interface Loan {
  id: string;
  amount: number;
  interestRate: number; // 0 или 0.008
  days: number;
  totalToReturn: number;
  remaining: number;
  createdAt: string;
  dueDate: string;
  status: 'active' | 'paid' | 'overdue';
  isFirstLoan: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'loan_created' | 'loan_reminder' | 'loan_overdue' | 'loan_paid' | 'loan_partial';
  read: boolean;
  createdAt: string;
}

export function calculateTotal(amount: number, rate: number, days: number): number {
  return Math.round(amount + amount * rate * days);
}

export function getFirstLoanRate(): number { return 0; }
export function getRepeatLoanRate(): number { return 0.008; }

export function formatDueDate(dueDate: string): string {
  const d = new Date(dueDate);
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month}, ${hours}:${mins}`;
}

export function getDueDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function getTimeRemaining(dueDate: string): { hours: number; minutes: number; expired: boolean } {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  if (diff <= 0) return { hours: 0, minutes: 0, expired: true };
  return {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    expired: false,
  };
}

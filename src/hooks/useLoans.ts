import { useState, useMemo } from 'react';
import { Loan, Notification, calculateTotal, getFirstLoanRate, getRepeatLoanRate, getDueDate } from '../types/loan';
import { addTransaction } from './transactions';

interface LoansData {
  loans: Record<string, Loan[]>;
  notifications: Record<string, Notification[]>;
  hasEverHadLoan: Record<string, boolean>;
}

function load(): LoansData {
  try {
    const raw = localStorage.getItem('csbet_loans');
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return { loans: {}, notifications: {}, hasEverHadLoan: {} };
}

function save(data: LoansData) {
  localStorage.setItem('csbet_loans', JSON.stringify(data));
}

function useLoans(userId: string | null) {
  const [data, setData] = useState<LoansData>(load);

  const activeLoan = useMemo(() => {
    if (!userId) return null;
    const userLoans = data.loans[userId] || [];
    const active = userLoans.filter((l) => l.status === 'active' || l.status === 'overdue');
    if (active.length === 0) return null;
    const totalRemaining = active.reduce((sum, l) => sum + l.remaining, 0);
    const earliestDue = active.reduce((min, l) => l.dueDate < min ? l.dueDate : min, active[0].dueDate);
    const firstActive = active[0];
    return { ...firstActive, remaining: totalRemaining, dueDate: earliestDue, totalToReturn: totalRemaining } as Loan;
  }, [userId, data.loans]);

  const hasEverHadLoan = userId ? (data.hasEverHadLoan[userId] || false) : false;

  const totalActiveDebt = useMemo(() => {
    if (!userId) return 0;
    return (data.loans[userId] || [])
      .filter((l) => l.status === 'active' || l.status === 'overdue')
      .reduce((sum, l) => sum + l.remaining, 0);
  }, [userId, data.loans]);

  const notifications = userId ? (data.notifications[userId] || []) : [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = (title: string, message: string, type: Notification['type']) => {
    if (!userId) return;
    const n: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId, title, message, type, read: false, createdAt: new Date().toISOString(),
    };
    setData((prev) => {
      const next = { ...prev };
      next.notifications = { ...next.notifications, [userId]: [...(next.notifications[userId] || []), n] };
      save(next);
      return next;
    });
  };

  const takeLoan = (amount: number, days: number, currentBalance: number): { loan: Loan | null; newBalance: number } => {
    if (!userId) return { loan: null, newBalance: currentBalance };
    if (totalActiveDebt + amount > 100000) return { loan: null, newBalance: currentBalance };

    const isFirst = !hasEverHadLoan;
    const rate = isFirst ? getFirstLoanRate() : getRepeatLoanRate();
    const total = calculateTotal(amount, rate, days);
    const dueDate = getDueDate(days);

    const loan: Loan = {
      id: `loan_${Date.now()}`, amount, interestRate: rate, days,
      totalToReturn: total, remaining: total, createdAt: new Date().toISOString(),
      dueDate, status: 'active', isFirstLoan: isFirst,
    };

    const newBalance = currentBalance + amount;

    setData((prev) => {
      const next = { ...prev };
      next.loans = { ...next.loans, [userId]: [...(next.loans[userId] || []), loan] };
      next.hasEverHadLoan = { ...next.hasEverHadLoan, [userId]: true };
      save(next);
      return next;
    });

    addTransaction(userId, 'loan_taken', amount, newBalance, `Займ ${amount.toLocaleString('ru-RU')} ₽ на ${days} дн.`);

    const interest = total - amount;
    addNotification(
      'Займ оформлен',
      `Займ на ${amount.toLocaleString('ru-RU')} ₽ сроком на ${days} дн. К возврату: ${total.toLocaleString('ru-RU')} ₽${interest > 0 ? ` (проценты: ${interest.toLocaleString('ru-RU')} ₽)` : ' (бесплатно!)'}`,
      'loan_created'
    );

    return { loan, newBalance };
  };

  const repayOldest = (amount: number, currentBalance: number) => {
    if (!userId) return currentBalance;

    // Calculate actual amount to pay first (before async state update)
    const userLoans = data.loans[userId] || [];
    const sorted = userLoans
      .filter((l) => l.status === 'active' || l.status === 'overdue')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let actualPaid = 0;
    let rem = amount;
    for (const loan of sorted) {
      if (rem <= 0) break;
      const paid = Math.min(rem, loan.remaining);
      actualPaid += paid;
      rem -= paid;
    }

    const newBalance = currentBalance - actualPaid;
    if (actualPaid > 0) {
      addTransaction(userId, 'loan_repaid', -actualPaid, newBalance, `Погашение займа ${actualPaid.toLocaleString('ru-RU')} ₽`);
    }

    setData((prev) => {
      const next = { ...prev };
      const ul = [...(next.loans[userId] || [])];
      let remaining = amount;
      const sl = ul
        .map((l, i) => ({ l, i }))
        .filter(({ l }) => l.status === 'active' || l.status === 'overdue')
        .sort((a, b) => new Date(a.l.createdAt).getTime() - new Date(b.l.createdAt).getTime());
      for (const { i } of sl) {
        if (remaining <= 0) break;
        const loan = ul[i];
        const paid = Math.min(remaining, loan.remaining);
        loan.remaining -= paid;
        remaining -= paid;
        if (loan.remaining <= 0.01) { loan.remaining = 0; loan.status = 'paid'; }
      }
      next.loans = { ...next.loans, [userId]: ul };
      save(next);
      return next;
    });

    return newBalance;
  };

  const checkLoans = () => {
    if (!userId) return;
    const now = new Date();
    setData((prev) => {
      const next = { ...prev };
      const userLoans = [...(next.loans[userId] || [])];
      let changed = false;

      userLoans.forEach((loan) => {
        if (loan.status === 'paid') return;
        const due = new Date(loan.dueDate);
        const diffHours = (due.getTime() - now.getTime()) / 3600000;

        if (diffHours > 0 && diffHours <= 24 && loan.status === 'active') {
          const exists = (next.notifications[userId] || []).some(
            (n) => n.type === 'loan_reminder' && n.message.includes(loan.id)
          );
          if (!exists) {
            changed = true;
            next.notifications = {
              ...next.notifications,
              [userId]: [...(next.notifications[userId] || []), {
                id: `notif_${Date.now()}_rem`,
                userId,
                title: 'Напоминание о займе',
                message: `До погашения займа остался 1 день. Сумма: ${loan.remaining.toLocaleString('ru-RU')} ₽`,
                type: 'loan_reminder',
                read: false,
                createdAt: new Date().toISOString(),
              }],
            };
          }
        }

        if (diffHours <= 0 && loan.status === 'active') {
          loan.status = 'overdue';
          changed = true;
          addNotification('Займ просрочен!', `Срок займа истек. Долг: ${loan.remaining.toLocaleString('ru-RU')} ₽`, 'loan_overdue');
        }
      });

      if (changed) {
        next.loans = { ...next.loans, [userId]: userLoans };
        save(next);
      }
      return next;
    });
  };

  const markAllRead = () => {
    if (!userId) return;
    setData((prev) => {
      const next = { ...prev };
      next.notifications = { ...next.notifications, [userId]: (next.notifications[userId] || []).map((n) => ({ ...n, read: true })) };
      save(next);
      return next;
    });
  };

  const clearNotifications = () => {
    if (!userId) return;
    setData((prev) => {
      const next = { ...prev };
      next.notifications = { ...next.notifications, [userId]: [] };
      save(next);
      return next;
    });
  };

  return {
    activeLoan, hasEverHadLoan, totalActiveDebt, notifications, unreadCount,
    takeLoan, repayOldest, checkLoans, markAllRead, clearNotifications,
  };
}

export default useLoans;

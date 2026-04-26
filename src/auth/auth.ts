export interface User {
  id: number;
  nickname: string;
  email: string;
  password: string;
  balance: number;
  avatar: string | null;
  createdAt: string;
  showGradient: boolean;
}

export interface UserDB {
  users: Record<number, User>;
  nextId: number;
  currentUserId: number | null;
}

function getDB(): UserDB {
  try {
    const raw = localStorage.getItem('csbet_db');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { users: {}, nextId: 1, currentUserId: null };
}

function saveDB(db: UserDB) {
  localStorage.setItem('csbet_db', JSON.stringify(db));
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function register(nickname: string, email: string, password: string): { success: boolean; error?: string; user?: User } {
  const db = getDB();

  if (nickname.length < 4) return { success: false, error: 'Ник минимум 4 символа' };
  if (!isValidEmail(email)) return { success: false, error: 'Введите корректный email' };
  if (password.length < 6) return { success: false, error: 'Пароль минимум 6 символов' };

  const existing = Object.values(db.users).find(
    (u) => u.email.toLowerCase() === email.toLowerCase() || u.nickname.toLowerCase() === nickname.toLowerCase()
  );
  if (existing) {
    return { success: false, error: existing.email.toLowerCase() === email.toLowerCase() ? 'Этот email уже зарегистрирован' : 'Этот ник уже занят' };
  }

  const id = db.nextId;
  db.nextId += 1;

  const user: User = {
    id,
    nickname,
    email,
    password,
    balance: 15420,
    avatar: null,
    createdAt: new Date().toISOString(),
    showGradient: true,
  };
  db.users[id] = user;
  db.currentUserId = id;
  saveDB(db);
  return { success: true, user };
}

export function login(email: string, password: string): { success: boolean; error?: string; user?: User } {
  const db = getDB();
  const user = Object.values(db.users).find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) return { success: false, error: 'Неверный email или пароль' };
  db.currentUserId = user.id;
  saveDB(db);
  return { success: true, user };
}

export function logout() {
  const db = getDB();
  db.currentUserId = null;
  saveDB(db);
}

export function getCurrentUser(): User | null {
  const db = getDB();
  if (!db.currentUserId || !db.users[db.currentUserId]) return null;
  return db.users[db.currentUserId];
}

export function updateUser(id: number, updates: Partial<User>) {
  const db = getDB();
  if (!db.users[id]) return;
  db.users[id] = { ...db.users[id], ...updates };
  saveDB(db);
}

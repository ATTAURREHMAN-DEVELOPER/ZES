import { supabase } from './supabase';

interface User {
  username: string;
  role: 'owner' | 'shopkeeper';
  name: string;
}

type StoredUser = User & { password: string };

const STORAGE_KEY = 'electric-store-auth';
const USERS_KEY = 'electric-store-users';
const DEFAULT_USERS: Record<string, StoredUser> = {
  owner: { username: 'owner', password: 'owner123', role: 'owner', name: 'Store Owner' },
  shop: { username: 'shop', password: 'shop123', role: 'shopkeeper', name: 'Shopkeeper' },
};

function getUsers(): Record<string, StoredUser> {
  const data = localStorage.getItem(USERS_KEY);
  if (data) return JSON.parse(data);
  localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  return { ...DEFAULT_USERS };
}

function saveUsers(users: Record<string, StoredUser>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function login(usernameOrEmail: string, password: string): Promise<User | null> {
  // Try Supabase auth first (email/password)
  const { data, error } = await supabase.auth.signInWithPassword({ email: usernameOrEmail, password });
  if (!error && data.user) {
    const { data: profile } = await supabase.from('profiles').select('role,name').eq('id', data.user.id).single();
    if (!profile) return null;
    const userData = { username: usernameOrEmail, role: profile.role, name: profile.name } as User;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    return userData;
  }
  // Fallback to local demo users (optional)
  const user = Object.values(getUsers()).find(u => u.username === usernameOrEmail && u.password === password);
  if (user) {
    const userData = { username: user.username, role: user.role, name: user.name };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    return userData;
  }
  return null;
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
  supabase.auth.signOut();
}

export function getCurrentUser(): User | null {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function requireAuth(): boolean {
  return isAuthenticated();
}

export function changePassword(username: string, newPassword: string) {
  const users = getUsers();
  const u = Object.values(users).find((x) => x.username === username);
  if (!u) throw new Error('User not found');
  u.password = newPassword;
  saveUsers(users);
}

export function addShopkeeper(username: string, name: string, password: string) {
  const users = getUsers();
  if (users[username]) throw new Error('Username already exists');
  users[username] = { username, name, password, role: 'shopkeeper' };
  saveUsers(users);
}

export function listUsers(): User[] {
  return Object.values(getUsers()).map(({ password, ...u }) => u);
}

export function updateUsername(oldUsername: string, newUsername: string) {
  const users = getUsers();
  const existing = Object.values(users).find((u) => u.username === oldUsername);
  if (!existing) throw new Error('User not found');
  if (users[newUsername]) throw new Error('New username already exists');
  // delete old key and re-add
  delete users[oldUsername];
  users[newUsername] = { ...existing, username: newUsername } as any;
  saveUsers(users);
  const current = getCurrentUser();
  if (current && current.username === oldUsername) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, username: newUsername }));
  }
}

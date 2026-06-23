const NS = 'trip-atlas';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage unavailable (private mode etc) — ignore
  }
}

export function isChecklistItemBooked(slug: string, itemId: string): boolean {
  return safeGet(`${NS}:${slug}:checklist:${itemId}`) === 'true';
}

export function setChecklistItemBooked(slug: string, itemId: string, booked: boolean) {
  safeSet(`${NS}:${slug}:checklist:${itemId}`, booked ? 'true' : 'false');
}

export function readAllChecklistState(slug: string): Record<string, boolean> {
  return readPrefix(`${NS}:${slug}:checklist:`);
}

export function isActivityDone(slug: string, activityId: string): boolean {
  return safeGet(`${NS}:${slug}:done:${activityId}`) === 'true';
}

export function setActivityDone(slug: string, activityId: string, done: boolean) {
  safeSet(`${NS}:${slug}:done:${activityId}`, done ? 'true' : 'false');
}

export function readAllDoneState(slug: string): Record<string, boolean> {
  return readPrefix(`${NS}:${slug}:done:`);
}

export function getActivityNote(slug: string, activityId: string): string {
  return safeGet(`${NS}:${slug}:note:${activityId}`) ?? '';
}

export function setActivityNote(slug: string, activityId: string, note: string) {
  if (note.trim()) safeSet(`${NS}:${slug}:note:${activityId}`, note);
  else
    try {
      localStorage.removeItem(`${NS}:${slug}:note:${activityId}`);
    } catch {
      /* no-op */
    }
}

export function getChecklistAssigneeFilter(slug: string): string {
  return safeGet(`${NS}:${slug}:checklist-filter`) ?? 'all';
}

export function setChecklistAssigneeFilter(slug: string, value: string) {
  safeSet(`${NS}:${slug}:checklist-filter`, value);
}

export function getMapsAppPreference(): 'google' | 'apple' {
  const v = safeGet(`${NS}:maps-app`);
  return v === 'apple' ? 'apple' : 'google';
}

export function setMapsAppPreference(v: 'google' | 'apple') {
  safeSet(`${NS}:maps-app`, v);
}

import type { Category } from '../types/trip';

export interface UserIdea {
  id: string;
  city: string;
  title: string;
  category: Category;
  description?: string;
  address?: string;
  link?: string;
  lat?: number;
  lng?: number;
  createdAt: string;
}

const USER_IDEAS_KEY = (slug: string) => `${NS}:${slug}:user-ideas`;

export function getUserIdeas(slug: string): UserIdea[] {
  const raw = safeGet(USER_IDEAS_KEY(slug));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUserIdea(slug: string, idea: UserIdea): void {
  const all = getUserIdeas(slug);
  const idx = all.findIndex((i) => i.id === idea.id);
  if (idx >= 0) all[idx] = idea;
  else all.push(idea);
  safeSet(USER_IDEAS_KEY(slug), JSON.stringify(all));
}

export function deleteUserIdea(slug: string, id: string): void {
  const all = getUserIdeas(slug).filter((i) => i.id !== id);
  safeSet(USER_IDEAS_KEY(slug), JSON.stringify(all));
}

export function importUserIdeas(slug: string, incoming: UserIdea[]): number {
  const all = getUserIdeas(slug);
  let added = 0;
  for (const idea of incoming) {
    // Dedupe by title+city
    if (all.some((e) => e.title === idea.title && e.city === idea.city)) continue;
    all.push(idea);
    added++;
  }
  safeSet(USER_IDEAS_KEY(slug), JSON.stringify(all));
  return added;
}

export function newIdeaId(): string {
  return 'ui-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

// Rejected ideas — both JSON-defined and user-added share the same reject set.
// Stored as a sorted JSON array of ids so the export-for-Claude string is stable.
const REJECTED_IDEAS_KEY = (slug: string) => `${NS}:${slug}:rejected-ideas`;

export function getRejectedIdeas(slug: string): string[] {
  const raw = safeGet(REJECTED_IDEAS_KEY(slug));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function rejectIdea(slug: string, id: string): void {
  const all = new Set(getRejectedIdeas(slug));
  all.add(id);
  safeSet(REJECTED_IDEAS_KEY(slug), JSON.stringify([...all].sort()));
}

export function unrejectIdea(slug: string, id: string): void {
  const all = getRejectedIdeas(slug).filter((x) => x !== id);
  safeSet(REJECTED_IDEAS_KEY(slug), JSON.stringify(all));
}

function readPrefix(prefix: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        out[k.slice(prefix.length)] = localStorage.getItem(k) === 'true';
      }
    }
  } catch {
    // no-op
  }
  return out;
}

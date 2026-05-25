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

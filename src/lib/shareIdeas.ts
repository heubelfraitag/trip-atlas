import type { UserIdea } from './storage';

/**
 * Encode a list of user ideas to a URL-safe base64 string and produce a
 * shareable link with the payload in the hash (so the receiving device's
 * service worker can intercept and route into the app).
 */
export function encodeIdeasForUrl(ideas: UserIdea[]): string {
  const compact = ideas.map((i) => ({
    t: i.title,
    c: i.city,
    k: i.category,
    d: i.description,
    a: i.address,
    l: i.link,
    y: i.lat,
    x: i.lng,
  }));
  const json = JSON.stringify(compact);
  // btoa requires ASCII; use TextEncoder for unicode safety
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Reverse of encodeIdeasForUrl. Returns [] on any decode failure. */
export function decodeIdeasFromUrl(payload: string): Omit<UserIdea, 'id' | 'createdAt'>[] {
  try {
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.map((o) => ({
      title: o.t,
      city: o.c,
      category: o.k,
      description: o.d,
      address: o.a,
      link: o.l,
      lat: o.y,
      lng: o.x,
    }));
  } catch {
    return [];
  }
}

export function buildShareUrl(slug: string, payload: string): string {
  const origin = window.location.origin;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${origin}${base}/${slug}?ideas=${payload}`;
}

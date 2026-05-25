import type { Activity, Category } from '../types/trip';

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

export interface ParsedReservation {
  title: string;
  date?: string;
  time?: string;
  address?: string;
  description?: string;
  category: Category;
  bookingUrl?: string;
}

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  food: ['restaurant', 'ramen', 'sushi', 'kaiseki', 'omakase', 'cafe', 'bistro', 'bbq', 'dining', 'eatery', 'gastropub', 'noodle'],
  bar: ['bar', 'cocktail', 'sake bar', 'whisky'],
  hotel: ['hotel', 'ryokan', 'check-in', 'check in', 'reservation confirmation'],
  shop: ['shop', 'store', 'boutique'],
  temple: ['temple', 'shrine', 'pagoda', 'taisha'],
  art: ['museum', 'gallery', 'theater', 'kabuki', 'concert', 'theatre'],
  nature: ['park', 'garden', 'mountain', 'lake', 'forest', 'pond'],
  experience: ['tour', 'experience', 'workshop', 'class', 'tea ceremony', 'onsen', 'massage'],
  transit: ['station', 'train', 'shinkansen', 'bus stop'],
  airport: ['airport', 'flight', 'airline'],
  walk: ['walk', 'stroll'],
};

export function parseReservation(input: string, defaultYear?: number): ParsedReservation {
  const text = input.trim();
  const lowered = text.toLowerCase();

  const dateIso = pickDate(text, defaultYear);
  const time = pickTime(text);
  const title = pickTitle(text);
  const address = pickAddress(text);
  const bookingUrl = pickUrl(text);
  const category = pickCategory(lowered);

  return {
    title: title || 'New reservation',
    date: dateIso,
    time,
    address,
    description: pickFirstSentence(text),
    category,
    bookingUrl,
  };
}

function pickTime(text: string): string | undefined {
  // 7:30 PM | 19:30 | 7pm
  const re = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?\b/g;
  let best: { h: number; m: number } | undefined;
  let match;
  while ((match = re.exec(text))) {
    const h = Number(match[1]);
    const m = match[2] ? Number(match[2]) : 0;
    const ampm = match[3]?.toLowerCase();
    if (!ampm && match[2] === undefined) continue; // bare digit, ignore
    let hh = h;
    if (ampm === 'pm' && h < 12) hh += 12;
    if (ampm === 'am' && h === 12) hh = 0;
    if (hh < 0 || hh > 23 || m < 0 || m > 59) continue;
    if (!best) best = { h: hh, m };
  }
  if (!best) return undefined;
  return `${pad2(best.h)}:${pad2(best.m)}`;
}

function pickDate(text: string, defaultYear?: number): string | undefined {
  // "November 27, 2025" | "Nov 27 2025" | "11/27/2025" | "2025-11-27" | "Nov 27"
  const isoRe = /\b(\d{4})-(\d{2})-(\d{2})\b/;
  let m = isoRe.exec(text);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  const slashRe = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
  m = slashRe.exec(text);
  if (m) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    let y = m[3] ? Number(m[3]) : defaultYear ?? new Date().getFullYear();
    if (y < 100) y += 2000;
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${y}-${pad2(mo)}-${pad2(d)}`;
  }

  const wordRe = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{2,4}))?/i;
  m = wordRe.exec(text);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()];
    const d = Number(m[2]);
    let y = m[3] ? Number(m[3]) : defaultYear ?? new Date().getFullYear();
    if (y < 100) y += 2000;
    if (mo && d >= 1 && d <= 31) return `${y}-${pad2(mo)}-${pad2(d)}`;
  }

  return undefined;
}

function pickTitle(text: string): string | undefined {
  // First non-empty short line that doesn't look like a header
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/(confirmation|receipt|hello|hi |dear |thank you)/i.test(line)) continue;
    if (line.length > 4 && line.length < 80) return line.replace(/[.!?]+$/, '');
  }
  return lines[0];
}

function pickAddress(text: string): string | undefined {
  // Lines containing common address-y patterns
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/\b(street|st\.|avenue|ave|chome|chōme|ku|machi|ward|prefecture|tokyo|kyoto|osaka)\b/i.test(line)) {
      if (line.length > 8 && line.length < 200) return line;
    }
    if (/^\d+[-\d]*\s+\w/.test(line) && line.length < 200) return line;
  }
  return undefined;
}

function pickUrl(text: string): string | undefined {
  const m = /https?:\/\/\S+/i.exec(text);
  return m ? m[0].replace(/[).,;]+$/, '') : undefined;
}

function pickCategory(loweredText: string): Category {
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS) as [Category, string[]][]) {
    for (const kw of kws) if (loweredText.includes(kw)) return cat;
  }
  return 'experience';
}

function pickFirstSentence(text: string): string | undefined {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length < 30) return undefined;
  const m = /[^.!?]{20,200}[.!?]/.exec(cleaned);
  return m ? m[0].trim() : cleaned.slice(0, 160);
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

/** Build an Activity JSON object (without lat/lng — user supplies separately). */
export function toActivityJson(p: ParsedReservation, idHint: string, defaults: { lat: number; lng: number }): Partial<Activity> & { id: string; title: string; lat: number; lng: number; category: Category; time: string } {
  return {
    id: idHint,
    time: p.time || '12:00',
    title: p.title,
    description: p.description,
    address: p.address,
    lat: defaults.lat,
    lng: defaults.lng,
    category: p.category,
    bookingUrl: p.bookingUrl,
  };
}

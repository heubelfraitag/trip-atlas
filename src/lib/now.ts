import { useEffect, useState } from 'react';
import type { Trip, Day, Activity } from '../types/trip';

/** Reactive Date that updates every 60s. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** YYYY-MM-DD for the given date in the given IANA timezone. */
export function ymdInZone(date: Date, timezone?: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(date);
}

/** HH:MM (24h) for the given date in the given IANA timezone. */
export function hmInZone(date: Date, timezone?: string): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone || undefined,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return fmt.format(date);
}

/** "planning" before start; "active" within range; "completed" after end. JSON status is ignored if dates disagree. */
export function deriveStatus(trip: Trip, now: Date): Trip['meta']['status'] {
  const today = ymdInZone(now, trip.meta.timezone);
  if (today < trip.meta.startDate) return 'planning';
  if (today > trip.meta.endDate) return 'completed';
  return 'active';
}

/** Returns the Day whose date matches today in the trip's timezone, or null. */
export function getCurrentDay(trip: Trip, now: Date): Day | null {
  const today = ymdInZone(now, trip.meta.timezone);
  return trip.days.find((d) => d.date === today) ?? null;
}

/** Returns {current, next} activity. Current = most recent one whose time ≤ now; next = first whose time > now. */
export function getCurrentAndNext(
  day: Day,
  now: Date,
  timezone?: string
): { current: Activity | null; next: Activity | null } {
  const hm = hmInZone(now, timezone);
  let current: Activity | null = null;
  let next: Activity | null = null;
  for (const a of day.activities) {
    if (a.time <= hm) current = a;
    else if (!next) next = a;
  }
  return { current, next };
}

/** All activities across the trip flattened with day context, ordered by date+time. */
export function flattenActivities(trip: Trip) {
  const out: { day: Day; activity: Activity }[] = [];
  for (const day of trip.days) for (const activity of day.activities) out.push({ day, activity });
  return out;
}

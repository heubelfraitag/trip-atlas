import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Trip, Activity, Day } from '../types/trip';
import CategoryBadge from './CategoryBadge';
import { formatTime12 } from '../lib/format';

interface Props {
  trip: Trip;
}

interface Hit {
  day: Day;
  activity: Activity;
  score: number;
}

export default function TripSearch({ trip }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // close on outside click + Esc
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // keyboard "/" shortcut to focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const input = ref.current?.querySelector('input');
        input?.focus();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const tokens = query.split(/\s+/);
    const out: Hit[] = [];
    for (const day of trip.days) {
      for (const a of day.activities) {
        const hay =
          `${a.title} ${a.description ?? ''} ${a.address ?? ''} ${a.category} ${day.theme} ${day.city}`.toLowerCase();
        let score = 0;
        let matchedAll = true;
        for (const tok of tokens) {
          if (!hay.includes(tok)) {
            matchedAll = false;
            break;
          }
          // title hits weighted higher
          if (a.title.toLowerCase().includes(tok)) score += 3;
          else if ((a.description ?? '').toLowerCase().includes(tok)) score += 1;
          else score += 0.5;
        }
        if (matchedAll) out.push({ day, activity: a, score });
      }
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 20);
  }, [q, trip]);

  return (
    <div className="relative" ref={ref}>
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search activities… (press /)"
        className="w-full px-3 py-2 text-sm rounded-md bg-paper-soft border border-line focus:border-vermillion focus:outline-none text-ink placeholder:text-ink-faint"
      />
      {open && q.trim() && (
        <div className="absolute z-[1500] mt-1 left-0 right-0 bg-paper border border-line rounded-md shadow-card overflow-hidden max-h-[60vh] overflow-y-auto">
          {hits.length === 0 ? (
            <div className="px-3 py-3 text-xs text-ink-faint">No matches.</div>
          ) : (
            <ul className="divide-y divide-line">
              {hits.map((h) => (
                <li key={h.activity.id}>
                  <Link
                    to={`/${trip.slug}/day/${h.day.dayNumber}`}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2 hover:bg-paper-soft no-underline"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-ink-faint tracking-wider uppercase">
                          Day {h.day.dayNumber} · {formatTime12(h.activity.time)} · {h.day.city}
                        </p>
                        <p className="font-display text-sm text-ink truncate">{h.activity.title}</p>
                        {h.activity.description && (
                          <p className="text-[11px] text-ink-faint truncate">
                            {h.activity.description}
                          </p>
                        )}
                      </div>
                      <CategoryBadge category={h.activity.category} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import type { ChecklistItem, ChecklistPriority } from '../types/trip';
import {
  isChecklistItemBooked,
  readAllChecklistState,
  setChecklistItemBooked,
} from '../lib/storage';

interface Props {
  slug: string;
  items: ChecklistItem[];
}

const PRIORITY_LABEL: Record<ChecklistPriority, string> = {
  asap: 'This week',
  'weeks-2': '2 weeks out',
  closer: 'Closer to trip',
};
const PRIORITY_ORDER: ChecklistPriority[] = ['asap', 'weeks-2', 'closer'];

export default function BookingChecklist({ slug, items }: Props) {
  const [state, setState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setState(readAllChecklistState(slug));
  }, [slug]);

  function toggle(id: string) {
    const next = !state[id];
    setChecklistItemBooked(slug, id, next);
    setState((s) => ({ ...s, [id]: next }));
  }

  const grouped = useMemo(() => {
    const m: Record<ChecklistPriority, ChecklistItem[]> = {
      asap: [],
      'weeks-2': [],
      closer: [],
    };
    items.forEach((it) => m[it.priority].push(it));
    return m;
  }, [items]);

  const totalDone = items.filter((it) => state[it.id]).length;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-2xl sm:text-3xl text-ink">Booking checklist</h2>
        <span className="text-xs text-ink-faint tabular-nums">
          {totalDone} / {items.length} done
        </span>
      </div>

      <div className="space-y-6">
        {PRIORITY_ORDER.map((p) => {
          const list = grouped[p];
          if (!list.length) return null;
          return (
            <section key={p}>
              <h3 className="font-display text-sm uppercase tracking-widest text-gold mb-2">
                {PRIORITY_LABEL[p]}
              </h3>
              <ul className="divide-y divide-line">
                {list.map((it) => {
                  const done = !!state[it.id] || !!isChecklistItemBooked(slug, it.id);
                  return (
                    <li key={it.id} className="py-3 flex gap-3 items-start">
                      <button
                        onClick={() => toggle(it.id)}
                        aria-pressed={done}
                        className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 transition-colors ${
                          done
                            ? 'bg-vermillion border-vermillion'
                            : 'bg-paper border-ink-faint hover:border-vermillion'
                        }`}
                      >
                        {done && (
                          <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
                            <path
                              d="M5 10.5L8.5 14L15 7"
                              stroke="#f5ede0"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => toggle(it.id)}
                          className={`text-left text-sm font-medium ${
                            done ? 'text-ink-faint line-through' : 'text-ink'
                          }`}
                        >
                          {it.title}
                        </button>
                        {it.detail && (
                          <p className="text-xs text-ink-faint mt-0.5">{it.detail}</p>
                        )}
                        {it.bookingUrl && (
                          <a
                            href={it.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-vermillion hover:underline"
                          >
                            Booking link ↗
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

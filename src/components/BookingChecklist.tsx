import { useEffect, useMemo, useState } from 'react';
import type { ChecklistItem, ChecklistPriority } from '../types/trip';
import {
  getChecklistAssigneeFilter,
  isChecklistItemBooked,
  readAllChecklistState,
  setChecklistAssigneeFilter,
  setChecklistItemBooked,
} from '../lib/storage';

interface Props {
  slug: string;
  items: ChecklistItem[];
  /** Optional named parties to seed filter chips even before items have assignees. */
  parties?: string[];
}

const PRIORITY_LABEL: Record<ChecklistPriority, string> = {
  asap: 'This week',
  'weeks-2': '2 weeks out',
  closer: 'Closer to trip',
};
const PRIORITY_ORDER: ChecklistPriority[] = ['asap', 'weeks-2', 'closer'];

export default function BookingChecklist({ slug, items, parties }: Props) {
  const [state, setState] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    setState(readAllChecklistState(slug));
    setFilter(getChecklistAssigneeFilter(slug));
  }, [slug]);

  function toggle(id: string) {
    const next = !state[id];
    setChecklistItemBooked(slug, id, next);
    setState((s) => ({ ...s, [id]: next }));
  }

  function applyFilter(v: string) {
    setFilter(v);
    setChecklistAssigneeFilter(slug, v);
  }

  const assignees = useMemo(() => {
    const set = new Set<string>();
    for (const p of parties ?? []) set.add(p);
    for (const it of items) if (it.assignee) set.add(it.assignee);
    return Array.from(set);
  }, [items, parties]);

  const visibleItems = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === '_unassigned') return items.filter((it) => !it.assignee);
    return items.filter((it) => it.assignee === filter);
  }, [items, filter]);

  const grouped = useMemo(() => {
    const m: Record<ChecklistPriority, ChecklistItem[]> = { asap: [], 'weeks-2': [], closer: [] };
    visibleItems.forEach((it) => m[it.priority].push(it));
    return m;
  }, [visibleItems]);

  const totalDone = items.filter((it) => state[it.id]).length;
  const hasAssignees = assignees.length > 0;
  const someUnassigned = items.some((it) => !it.assignee);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-2xl sm:text-3xl text-ink">Booking checklist</h2>
        <span className="text-xs text-ink-faint tabular-nums">
          {totalDone} / {items.length} done
        </span>
      </div>

      {hasAssignees && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {(['all', ...assignees, ...(someUnassigned ? ['_unassigned'] : [])]).map((v) => {
            const label = v === 'all' ? 'All' : v === '_unassigned' ? 'Unassigned' : v;
            const active = filter === v;
            return (
              <button
                key={v}
                onClick={() => applyFilter(v)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase border transition-colors ${
                  active
                    ? 'bg-ink text-paper border-ink'
                    : 'bg-paper-soft text-ink-soft border-line hover:border-ink'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

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
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => toggle(it.id)}
                            className={`text-left text-sm font-medium ${
                              done ? 'text-ink-faint line-through' : 'text-ink'
                            }`}
                          >
                            {it.title}
                          </button>
                          {it.assignee && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium tracking-wider uppercase bg-gold/15 text-gold">
                              {it.assignee}
                            </span>
                          )}
                        </div>
                        {it.detail && <p className="text-xs text-ink-faint mt-0.5">{it.detail}</p>}
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

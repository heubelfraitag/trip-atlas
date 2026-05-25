import { useMemo, useState } from 'react';
import type { Activity, Trip } from '../types/trip';
import CategoryBadge from './CategoryBadge';
import OpenInMapsButton from './OpenInMapsButton';
import { cityColor } from '../lib/maps';
import { formatCurrency } from '../lib/format';

interface Props {
  trip: Trip;
}

export default function WishlistSection({ trip }: Props) {
  const [openCity, setOpenCity] = useState<string | null>(null);

  // Group wishlist by city; include cities with empty buckets so the empty-state shows
  const grouped = useMemo(() => {
    const m: Record<string, Activity[]> = {};
    for (const c of trip.meta.cities) m[c] = [];
    for (const a of trip.wishlist ?? []) {
      const c = a.city ?? 'Other';
      if (!m[c]) m[c] = [];
      m[c].push(a);
    }
    return m;
  }, [trip.wishlist, trip.meta.cities]);

  const totalIdeas = Object.values(grouped).reduce((s, list) => s + list.length, 0);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-2xl sm:text-3xl text-ink">Considering</h2>
        <span className="text-xs text-ink-faint tabular-nums">
          {totalIdeas} {totalIdeas === 1 ? 'idea' : 'ideas'}
        </span>
      </div>
      <p className="text-xs text-ink-faint mb-4">
        Inspo gathered but not yet slotted. Add via "Paste reservation" → choose "Wishlist for [city]", or hand-edit{' '}
        <code className="bg-paper-deep px-1 rounded">wishlist[]</code> in the trip JSON.
      </p>

      <div className="space-y-3">
        {trip.meta.cities.map((city) => {
          const ideas = grouped[city] || [];
          const isOpen = openCity === city;
          const color = cityColor(city);
          return (
            <div
              key={city}
              className="rounded-xl border border-line bg-paper-soft overflow-hidden"
              style={{ borderLeftWidth: 4, borderLeftColor: color }}
            >
              <button
                onClick={() => setOpenCity(isOpen ? null : city)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] tracking-widest uppercase font-semibold"
                    style={{ color }}
                  >
                    {city}
                  </span>
                  <span className="text-xs text-ink-faint">
                    {ideas.length === 0
                      ? 'no ideas yet'
                      : `${ideas.length} ${ideas.length === 1 ? 'idea' : 'ideas'}`}
                  </span>
                </div>
                <span className="text-ink-faint text-xs">{isOpen ? '−' : '+'}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4">
                  {ideas.length === 0 ? (
                    <div className="text-xs text-ink-faint italic">
                      Nothing here yet. Paste a reservation email or add to{' '}
                      <code className="bg-paper-deep px-1 rounded">wishlist[]</code> in the JSON
                      with <code className="bg-paper-deep px-1 rounded">"city": "{city}"</code>.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {ideas.map((a) => (
                        <li
                          key={a.id}
                          className="rounded-lg bg-paper border border-line p-3"
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <CategoryBadge category={a.category} />
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium tracking-wider uppercase bg-ink/10 text-ink-soft italic">
                                  Idea
                                </span>
                              </div>
                              <h4 className="font-display text-base text-ink leading-snug">
                                {a.title}
                              </h4>
                              {a.description && (
                                <p className="text-xs text-ink-soft mt-1 leading-snug">
                                  {a.description}
                                </p>
                              )}
                              {a.address && (
                                <p className="text-[11px] text-ink-faint mt-1">{a.address}</p>
                              )}
                              {typeof a.costPerPerson === 'number' && (
                                <p className="text-[11px] text-ink-faint mt-0.5">
                                  ~{formatCurrency(a.costPerPerson, a.currency ?? trip.meta.currency)} pp
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {!a.noNavigate && (
                              <OpenInMapsButton lat={a.lat} lng={a.lng} name={a.title} />
                            )}
                            {a.bookingUrl && (
                              <a
                                href={a.bookingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md bg-paper-deep text-ink px-2.5 py-1.5 text-[11px] font-semibold tracking-wider uppercase no-underline hover:bg-gold-soft hover:text-paper transition-colors"
                              >
                                Link ↗
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

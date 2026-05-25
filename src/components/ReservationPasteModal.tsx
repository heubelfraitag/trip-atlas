import { useMemo, useState } from 'react';
import type { Trip } from '../types/trip';
import { parseReservation, toActivityJson, type ParsedReservation } from '../lib/parseReservation';

interface Props {
  trip: Trip;
  open: boolean;
  onClose: () => void;
}

export default function ReservationPasteModal({ trip, open, onClose }: Props) {
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<ParsedReservation | null>(null);
  const [copied, setCopied] = useState(false);
  const [targetMode, setTargetMode] = useState<'day' | 'wishlist'>('day');
  const [wishlistCity, setWishlistCity] = useState<string>(trip.meta.cities[0] ?? '');

  const startYear = useMemo(
    () => new Date(trip.meta.startDate).getFullYear(),
    [trip.meta.startDate]
  );

  function handleParse() {
    const p = parseReservation(raw, startYear);
    setParsed(p);
    setCopied(false);
    // If parsed date matches a trip day, default to day mode. Otherwise leave as-is.
    if (p.date && trip.days.find((d) => d.date === p.date)) setTargetMode('day');
  }

  function snippet(): string {
    if (!parsed) return '';
    if (targetMode === 'day') {
      const day = trip.days.find((d) => d.date === parsed.date);
      const dayNum = day?.dayNumber ?? '?';
      const idHint = `d${dayNum}-NEW`;
      const fallback = day?.activities[0] ?? { lat: 35.6762, lng: 139.6503 };
      const json = toActivityJson(parsed, idHint, {
        lat: fallback.lat,
        lng: fallback.lng,
      });
      return JSON.stringify(json, null, 2);
    } else {
      // wishlist item
      const idHint = `wl-${wishlistCity.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(
        36
      )}`;
      const baseDay = trip.days.find((d) => d.city === wishlistCity);
      const fallback = baseDay?.activities[0] ?? { lat: 35.6762, lng: 139.6503 };
      const json = {
        id: idHint,
        title: parsed.title,
        description: parsed.description,
        address: parsed.address,
        category: parsed.category,
        city: wishlistCity,
        bookingUrl: parsed.bookingUrl,
        lat: fallback.lat,
        lng: fallback.lng,
        time: '',
        status: 'idea',
      };
      return JSON.stringify(json, null, 2);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  }

  function reset() {
    setRaw('');
    setParsed(null);
    setCopied(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2500] bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-paper rounded-2xl shadow-card border border-line overflow-hidden flex flex-col max-h-[90vh]"
      >
        <header className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-ink">Paste a reservation or idea</h2>
            <p className="text-xs text-ink-faint mt-0.5">
              We'll guess date, time, place, category. Decide: schedule it, or stash it as an idea.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-ink-faint hover:text-ink text-xl px-2">
            ×
          </button>
        </header>

        <div className="p-5 overflow-y-auto space-y-4">
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={6}
            placeholder="Paste an email, a Reddit comment, a restaurant blurb…"
            className="w-full px-3 py-2 text-sm rounded-md bg-paper-soft border border-line focus:border-vermillion focus:outline-none text-ink placeholder:text-ink-faint resize-y"
          />
          <div className="flex gap-2">
            <button
              onClick={handleParse}
              disabled={!raw.trim()}
              className="rounded-md bg-vermillion text-paper px-3 py-1.5 text-xs font-semibold tracking-wider uppercase disabled:opacity-40 hover:bg-vermillion-soft"
            >
              Parse
            </button>
            <button onClick={reset} className="text-xs text-ink-faint hover:text-vermillion">
              Clear
            </button>
          </div>

          {parsed && (
            <>
              <section className="rounded-xl border border-line bg-paper-soft p-3 text-sm space-y-1">
                <div>
                  <span className="text-xs text-ink-faint tracking-wider uppercase">Title</span>
                  <p className="font-display text-base text-ink">{parsed.title}</p>
                </div>
                <Row label="Date">{parsed.date ?? '—'}</Row>
                <Row label="Time">{parsed.time ?? '—'}</Row>
                <Row label="Category">{parsed.category}</Row>
                {parsed.address && <Row label="Address">{parsed.address}</Row>}
                {parsed.bookingUrl && <Row label="URL">{parsed.bookingUrl}</Row>}
                {parsed.description && <Row label="Description">{parsed.description}</Row>}
              </section>

              <section className="rounded-xl border border-line bg-paper-soft p-3 space-y-3">
                <p className="text-xs tracking-widest uppercase font-semibold text-ink-faint">
                  Where does this go?
                </p>
                <div className="flex gap-2 flex-wrap">
                  <label
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold tracking-wider uppercase border transition-colors ${
                      targetMode === 'day'
                        ? 'bg-ink text-paper border-ink'
                        : 'bg-paper text-ink-soft border-line hover:border-ink'
                    }`}
                  >
                    <input
                      type="radio"
                      name="target"
                      checked={targetMode === 'day'}
                      onChange={() => setTargetMode('day')}
                      className="sr-only"
                    />
                    Schedule on a day
                  </label>
                  <label
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold tracking-wider uppercase border transition-colors ${
                      targetMode === 'wishlist'
                        ? 'bg-ink text-paper border-ink'
                        : 'bg-paper text-ink-soft border-line hover:border-ink'
                    }`}
                  >
                    <input
                      type="radio"
                      name="target"
                      checked={targetMode === 'wishlist'}
                      onChange={() => setTargetMode('wishlist')}
                      className="sr-only"
                    />
                    Stash as idea
                  </label>
                </div>

                {targetMode === 'wishlist' && (
                  <div>
                    <label className="text-xs text-ink-faint block mb-1">City:</label>
                    <select
                      value={wishlistCity}
                      onChange={(e) => setWishlistCity(e.target.value)}
                      className="text-sm rounded-md bg-paper border border-line px-2 py-1 focus:border-vermillion focus:outline-none"
                    >
                      {trip.meta.cities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </section>

              <section>
                <p className="text-xs text-ink-faint mb-1">
                  JSON snippet — add lat/lng for the real location, then paste into{' '}
                  <code>trips/{trip.slug}.json</code>{' '}
                  {targetMode === 'day' ? (
                    <>
                      under the day's <code>activities</code> array
                    </>
                  ) : (
                    <>
                      into the top-level <code>wishlist</code> array
                    </>
                  )}
                  :
                </p>
                <pre className="text-[11px] bg-paper-soft border border-line rounded-md p-3 overflow-x-auto whitespace-pre">
{snippet()}
                </pre>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleCopy}
                    className="rounded-md bg-ink text-paper px-3 py-1.5 text-xs font-semibold tracking-wider uppercase hover:bg-ink-soft"
                  >
                    {copied ? '✓ Copied' : 'Copy snippet'}
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-xs text-ink-faint tracking-wider uppercase pt-0.5 w-20 shrink-0">{label}</span>
      <span className="text-ink-soft break-all">{children}</span>
    </div>
  );
}

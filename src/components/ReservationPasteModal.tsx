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

  const startYear = useMemo(() => new Date(trip.meta.startDate).getFullYear(), [trip.meta.startDate]);

  function handleParse() {
    setParsed(parseReservation(raw, startYear));
    setCopied(false);
  }

  function snippet(): string {
    if (!parsed) return '';
    const day = trip.days.find((d) => d.date === parsed.date);
    const dayNum = day?.dayNumber ?? '?';
    const idHint = `d${dayNum}-NEW`;
    // Use first activity's coords in that day as a default fallback
    const fallback = day?.activities[0] ?? { lat: 35.6762, lng: 139.6503 };
    const json = toActivityJson(parsed, idHint, { lat: fallback.lat, lng: fallback.lng });
    return JSON.stringify(json, null, 2);
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
            <h2 className="font-display text-xl text-ink">Paste a reservation</h2>
            <p className="text-xs text-ink-faint mt-0.5">
              Paste a confirmation email — we'll guess date, time, place, category.
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
            placeholder="Paste the email body or details here…"
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

              <section>
                <p className="text-xs text-ink-faint mb-1">
                  JSON snippet — add lat/lng for the place, paste into the day's <code>activities</code> array in <code>trips/{trip.slug}.json</code>:
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

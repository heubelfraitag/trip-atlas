import { Link } from 'react-router-dom';
import { trips } from '../data/trips';
import { formatRange } from '../lib/format';

export default function TripList() {
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-16">
      <header className="mb-10">
        <p className="font-display italic text-gold text-sm tracking-wider uppercase">
          Trip Atlas
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-ink mt-2 leading-tight">
          Where are we going?
        </h1>
        <p className="text-ink-soft mt-3 max-w-xl">
          Itineraries, maps, and bookings — one tap to navigate on the ground.
        </p>
      </header>

      {trips.length === 0 ? (
        <div className="border border-line rounded-2xl p-8 text-center text-ink-faint">
          No trips yet. Add a JSON file to <code>/trips</code> to get started.
        </div>
      ) : (
        <ul className="space-y-4">
          {trips.map((t) => {
            const accent = t.meta.accents?.primary ?? '#b5391f';
            return (
              <li key={t.slug}>
                <Link
                  to={`/${t.slug}`}
                  className="block bg-paper-soft hover:bg-paper-deep transition-colors rounded-2xl border border-line shadow-card p-6 no-underline"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs uppercase tracking-widest font-semibold"
                        style={{ color: accent }}
                      >
                        {t.meta.status}
                      </p>
                      <h2
                        className={`${
                          t.meta.useScriptAccent ? 'font-accent' : 'font-display'
                        } text-2xl sm:text-3xl text-ink mt-1`}
                      >
                        {t.meta.name}
                      </h2>
                      {t.meta.subtitle && (
                        <p className="text-ink-soft text-sm mt-1">{t.meta.subtitle}</p>
                      )}
                      <p className="text-ink-faint text-xs mt-2 tracking-wide">
                        {formatRange(t.meta.startDate, t.meta.endDate)} ·{' '}
                        {t.days.length} days
                      </p>
                    </div>
                    <div className="text-vermillion text-2xl shrink-0">→</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="mt-16 text-xs text-ink-faint">
        Drop a JSON file in <code className="bg-paper-deep px-1 rounded">trips/</code>. See{' '}
        <code className="bg-paper-deep px-1 rounded">trips/README.md</code> for schema.
      </footer>
    </div>
  );
}

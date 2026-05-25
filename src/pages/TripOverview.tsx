import { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { getTrip } from '../data/trips';
import TripMap from '../components/TripMap';
import BookingChecklist from '../components/BookingChecklist';
import CategoryBadge from '../components/CategoryBadge';
import { formatDateMid, formatRange } from '../lib/format';
import { cityColor } from '../lib/maps';

export default function TripOverview() {
  const { slug } = useParams<{ slug: string }>();
  const trip = slug ? getTrip(slug) : undefined;
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showSolo, setShowSolo] = useState(true);

  if (!trip) return <Navigate to="/" replace />;

  const accent = trip.meta.accents?.primary ?? '#b5391f';
  const headlineFont = trip.meta.useScriptAccent ? 'font-accent' : 'font-display';

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 sm:py-10">
      <nav className="mb-4 text-xs text-ink-faint">
        <Link to="/" className="hover:text-vermillion no-underline">
          ← All trips
        </Link>
      </nav>

      {/* Hero */}
      <header className="mb-8">
        <p
          className="text-xs uppercase tracking-widest font-semibold"
          style={{ color: accent }}
        >
          {trip.meta.status} · {trip.days.length} days
        </p>
        <h1
          className={`${headlineFont} text-5xl sm:text-7xl text-ink mt-2 leading-[0.95]`}
        >
          {trip.meta.name}
        </h1>
        {trip.meta.subtitle && (
          <p className="font-display italic text-gold text-lg sm:text-xl mt-3">
            {trip.meta.subtitle}
          </p>
        )}
        <p className="text-ink-soft mt-2 text-sm sm:text-base">
          {formatRange(trip.meta.startDate, trip.meta.endDate)}
        </p>
      </header>

      {/* Day filter chips */}
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedDay(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase border transition-colors ${
            selectedDay === null
              ? 'bg-ink text-paper border-ink'
              : 'bg-paper-soft text-ink-soft border-line hover:border-ink'
          }`}
        >
          Whole trip
        </button>
        {trip.days.map((d) => (
          <button
            key={d.dayNumber}
            onClick={() => setSelectedDay(d.dayNumber)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase border transition-colors ${
              selectedDay === d.dayNumber
                ? 'text-paper border-transparent'
                : 'bg-paper-soft text-ink-soft border-line hover:border-ink'
            }`}
            style={
              selectedDay === d.dayNumber
                ? { backgroundColor: cityColor(d.city) }
                : undefined
            }
          >
            Day {d.dayNumber}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap text-xs">
        <label className="flex items-center gap-2 text-ink-soft cursor-pointer">
          <input
            type="checkbox"
            checked={showSolo}
            onChange={(e) => setShowSolo(e.target.checked)}
            className="accent-vermillion"
          />
          Show solo-only activities
        </label>
        <div className="flex items-center gap-3 text-ink-faint">
          {trip.meta.cities.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: cityColor(c) }}
              />
              {c}
            </span>
          ))}
        </div>
      </div>

      <TripMap
        trip={trip}
        selectedDay={selectedDay}
        showSolo={showSolo}
        heightClass="h-[55vh] min-h-[420px]"
      />

      {/* Days list */}
      <section className="mt-12">
        <h2 className="font-display text-3xl text-ink mb-6">Itinerary</h2>
        <ul className="space-y-3">
          {trip.days.map((d) => {
            const cc = cityColor(d.city);
            return (
              <li key={d.dayNumber}>
                <Link
                  to={`/${trip.slug}/day/${d.dayNumber}`}
                  className="block group bg-paper-soft hover:bg-paper-deep border border-line rounded-xl p-4 sm:p-5 no-underline transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-ink-faint tracking-wider uppercase">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: cc }}
                        />
                        Day {d.dayNumber} · {formatDateMid(d.date)} · {d.city}
                      </div>
                      <h3 className="font-display text-xl sm:text-2xl text-ink mt-1.5 leading-snug">
                        {d.theme}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {d.activities.slice(0, 6).map((a) => (
                          <CategoryBadge key={a.id} category={a.category} />
                        ))}
                        {d.activities.length > 6 && (
                          <span className="text-[10px] text-ink-faint px-1.5 py-0.5">
                            +{d.activities.length - 6}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-vermillion text-xl shrink-0 group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Checklist */}
      <section className="mt-16">
        <BookingChecklist slug={trip.slug} items={trip.checklist} />
      </section>

      <footer className="mt-16 text-xs text-ink-faint border-t border-line pt-6">
        {trip.hotels.length} hotels · {trip.airports.length} airport touches ·{' '}
        {trip.intercityTransit.length} intercity legs ·{' '}
        {trip.days.reduce((s, d) => s + d.activities.length, 0)} activities
      </footer>
    </div>
  );
}

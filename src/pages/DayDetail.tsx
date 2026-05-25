import { Link, Navigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { getTrip } from '../data/trips';
import TripMap from '../components/TripMap';
import ActivityCard from '../components/ActivityCard';
import { formatDateLong } from '../lib/format';
import { cityColor } from '../lib/maps';

export default function DayDetail() {
  const { slug, dayNumber } = useParams<{ slug: string; dayNumber: string }>();
  const trip = slug ? getTrip(slug) : undefined;
  const [showSolo, setShowSolo] = useState(true);

  if (!trip) return <Navigate to="/" replace />;
  const day = trip.days.find((d) => d.dayNumber === Number(dayNumber));
  if (!day) return <Navigate to={`/${trip.slug}`} replace />;

  const prev = trip.days.find((d) => d.dayNumber === day.dayNumber - 1);
  const next = trip.days.find((d) => d.dayNumber === day.dayNumber + 1);
  const cc = cityColor(day.city);

  const filteredActivities = day.activities.filter((a) => showSolo || !a.soloOnly);

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-6 sm:py-10">
      <nav className="mb-4 text-xs text-ink-faint flex items-center justify-between gap-3">
        <Link to={`/${trip.slug}`} className="hover:text-vermillion no-underline">
          ← {trip.meta.name}
        </Link>
        <div className="flex gap-3">
          {prev && (
            <Link to={`/${trip.slug}/day/${prev.dayNumber}`} className="hover:text-vermillion no-underline">
              ← Day {prev.dayNumber}
            </Link>
          )}
          {next && (
            <Link to={`/${trip.slug}/day/${next.dayNumber}`} className="hover:text-vermillion no-underline">
              Day {next.dayNumber} →
            </Link>
          )}
        </div>
      </nav>

      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs text-ink-faint tracking-wider uppercase">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: cc }} />
          Day {day.dayNumber} · {day.city}
        </div>
        <h1 className="font-display text-4xl sm:text-5xl text-ink mt-2 leading-tight">
          {day.theme}
        </h1>
        <p className="text-ink-soft mt-2 text-sm">{formatDateLong(day.date)}</p>
      </header>

      <TripMap
        trip={trip}
        selectedDay={day.dayNumber}
        showSolo={showSolo}
        heightClass="h-[40vh] min-h-[320px]"
      />

      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap text-xs">
        <label className="flex items-center gap-2 text-ink-soft cursor-pointer">
          <input
            type="checkbox"
            checked={showSolo}
            onChange={(e) => setShowSolo(e.target.checked)}
            className="accent-vermillion"
          />
          Show solo-only
        </label>
        <span className="text-ink-faint">{filteredActivities.length} stops</span>
      </div>

      <section className="mt-8">
        {filteredActivities.map((a, i) => (
          <ActivityCard
            key={a.id}
            activity={a}
            isLast={i === filteredActivities.length - 1}
            currency={trip.meta.currency}
          />
        ))}
      </section>

      <div className="mt-8 flex justify-between gap-3 border-t border-line pt-6">
        {prev ? (
          <Link
            to={`/${trip.slug}/day/${prev.dayNumber}`}
            className="text-sm text-ink-soft hover:text-vermillion no-underline"
          >
            ← Day {prev.dayNumber} · {prev.theme}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to={`/${trip.slug}/day/${next.dayNumber}`}
            className="text-sm text-ink-soft hover:text-vermillion no-underline text-right"
          >
            Day {next.dayNumber} · {next.theme} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

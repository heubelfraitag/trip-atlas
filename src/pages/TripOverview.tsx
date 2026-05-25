import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { getTrip } from '../data/trips';
import TripMap from '../components/TripMap';
import BookingChecklist from '../components/BookingChecklist';
import CategoryBadge from '../components/CategoryBadge';
import ShareTripBar from '../components/ShareTripBar';
import { formatCurrency, formatDateMid, formatRange, formatTime12 } from '../lib/format';
import { cityColor } from '../lib/maps';
import {
  deriveStatus,
  getCurrentAndNext,
  getCurrentDay,
  useNow,
} from '../lib/now';
import { dayCost, tripCost } from '../lib/cost';
import { readAllDoneState } from '../lib/storage';

export default function TripOverview() {
  const { slug } = useParams<{ slug: string }>();
  const trip = slug ? getTrip(slug) : undefined;
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showSolo, setShowSolo] = useState(true);
  const now = useNow();
  const [doneState, setDoneState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (slug) setDoneState(readAllDoneState(slug));
    // re-read on focus (e.g. after marking on day detail)
    const onFocus = () => slug && setDoneState(readAllDoneState(slug));
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [slug]);

  if (!trip) return <Navigate to="/" replace />;

  const status = deriveStatus(trip, now);
  const accent = trip.meta.accents?.primary ?? '#b5391f';
  const headlineFont = trip.meta.useScriptAccent ? 'font-accent' : 'font-display';
  const totals = tripCost(trip);
  const totalActivities = trip.days.reduce((s, d) => s + d.activities.length, 0);
  const doneCount = trip.days.reduce(
    (s, d) => s + d.activities.filter((a) => doneState[a.id]).length,
    0
  );

  const todayDay = status === 'active' ? getCurrentDay(trip, now) : null;
  const currentNext = todayDay
    ? getCurrentAndNext(todayDay, now, trip.meta.timezone)
    : { current: null, next: null };

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 sm:py-10">
      <nav className="mb-4 text-xs text-ink-faint">
        <Link to="/" className="hover:text-vermillion no-underline">
          ← All trips
        </Link>
      </nav>

      {/* Hero */}
      <header className="mb-6">
        <p
          className="text-xs uppercase tracking-widest font-semibold"
          style={{ color: status === 'completed' ? '#6b6e7e' : accent }}
        >
          {status === 'active' && '● '}
          {status} · {trip.days.length} days
        </p>
        <h1
          className={`${headlineFont} text-5xl sm:text-7xl mt-2 leading-[0.95] ${
            status === 'completed' ? 'text-ink-faint' : 'text-ink'
          }`}
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

        <div className="mt-4">
          <ShareTripBar trip={trip} />
        </div>
      </header>

      {/* Live "right now / next up" panel */}
      {status === 'active' && todayDay && (currentNext.current || currentNext.next) && (
        <div className="mb-6 border-2 border-vermillion rounded-2xl p-4 bg-paper-soft">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-vermillion">
            Today · Day {todayDay.dayNumber} · {todayDay.theme}
          </p>
          {currentNext.current && (
            <Link
              to={`/${trip.slug}/day/${todayDay.dayNumber}`}
              className="block mt-1 no-underline"
            >
              <p className="font-display text-xs uppercase tracking-wider text-ink-soft">
                Right now
              </p>
              <p className="font-display text-xl text-ink leading-tight">
                {formatTime12(currentNext.current.time)} · {currentNext.current.title}
              </p>
            </Link>
          )}
          {currentNext.next && (
            <Link
              to={`/${trip.slug}/day/${todayDay.dayNumber}`}
              className="block mt-3 no-underline"
            >
              <p className="font-display text-xs uppercase tracking-wider text-gold">Next up</p>
              <p className="font-display text-base text-ink-soft leading-tight">
                {formatTime12(currentNext.next.time)} · {currentNext.next.title}
              </p>
            </Link>
          )}
        </div>
      )}

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
        {trip.days.map((d) => {
          const isToday = todayDay?.dayNumber === d.dayNumber;
          return (
            <button
              key={d.dayNumber}
              onClick={() => setSelectedDay(d.dayNumber)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase border transition-colors ${
                selectedDay === d.dayNumber
                  ? 'text-paper border-transparent'
                  : isToday
                  ? 'bg-paper-deep text-vermillion border-vermillion'
                  : 'bg-paper-soft text-ink-soft border-line hover:border-ink'
              }`}
              style={
                selectedDay === d.dayNumber ? { backgroundColor: cityColor(d.city) } : undefined
              }
            >
              {isToday && '● '}Day {d.dayNumber}
            </button>
          );
        })}
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
            const isToday = todayDay?.dayNumber === d.dayNumber;
            const cost = dayCost(d, trip);
            const doneInDay = d.activities.filter((a) => doneState[a.id]).length;
            return (
              <li key={d.dayNumber}>
                <Link
                  to={`/${trip.slug}/day/${d.dayNumber}`}
                  className={`block group bg-paper-soft hover:bg-paper-deep border rounded-xl p-4 sm:p-5 no-underline transition-colors ${
                    isToday ? 'border-vermillion ring-2 ring-vermillion/30' : 'border-line'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-ink-faint tracking-wider uppercase flex-wrap">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: cc }}
                        />
                        {isToday && (
                          <span className="font-bold text-vermillion">Today ·</span>
                        )}
                        Day {d.dayNumber} · {formatDateMid(d.date)} · {d.city}
                        {cost.perPerson > 0 && (
                          <span className="text-gold">
                            · ~{formatCurrency(cost.perPerson, cost.currency)} pp
                          </span>
                        )}
                        {doneInDay > 0 && (
                          <span className="text-vermillion">
                            · {doneInDay}/{d.activities.length} done
                          </span>
                        )}
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

      {/* Checklist OR completed retrospective */}
      <section className="mt-16">
        {status === 'completed' ? (
          <div className="border border-line rounded-2xl p-6 bg-paper-soft">
            <h2 className="font-display text-2xl sm:text-3xl text-ink mb-2">Trip complete</h2>
            <p className="text-ink-soft text-sm">
              {trip.days.length} days · {totalActivities} activities · {doneCount} marked done ·
              ~{formatCurrency(totals.perPerson, totals.currency)} pp activities + transit.
            </p>
          </div>
        ) : (
          <BookingChecklist slug={trip.slug} items={trip.checklist} />
        )}
      </section>

      <footer className="mt-16 text-xs text-ink-faint border-t border-line pt-6">
        {trip.hotels.length} hotels · {trip.airports.length} airport touches ·{' '}
        {trip.intercityTransit.length} intercity legs · {totalActivities} activities
        {totals.perPerson > 0 && (
          <> · est. ~{formatCurrency(totals.perPerson, totals.currency)} pp (activities + transit)</>
        )}
      </footer>
    </div>
  );
}

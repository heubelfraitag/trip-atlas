import { useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getTrip } from '../data/trips';
import TripMap from '../components/TripMap';
import ActivityCard from '../components/ActivityCard';
import OpenInMapsButton from '../components/OpenInMapsButton';
import CityNoteCard from '../components/CityNoteCard';
import { formatCurrency, formatDateLong } from '../lib/format';
import { cityColor } from '../lib/maps';
import { deriveStatus, getCurrentAndNext, getCurrentDay, useNow } from '../lib/now';
import { dayCost } from '../lib/cost';
import type { Activity, Hotel, Trip } from '../types/trip';

function findStartHotel(trip: Trip, dayDate: string): Hotel | undefined {
  return (
    trip.hotels.find((h) => h.checkOut === dayDate) ||
    trip.hotels.find((h) => h.checkIn <= dayDate && dayDate < h.checkOut)
  );
}
function findEndHotel(trip: Trip, dayDate: string): Hotel | undefined {
  return (
    trip.hotels.find((h) => h.checkIn === dayDate) ||
    trip.hotels.find((h) => h.checkIn <= dayDate && dayDate < h.checkOut)
  );
}
function sameSpot(a: { lat: number; lng: number }, b: { lat: number; lng: number }): boolean {
  return Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lng - b.lng) < 1e-4;
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(((total + 1440) % 1440) / 60);
  const mm = (total + 1440) % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function synthHotelStart(hotel: Hotel, firstAct: Activity, dayNumber: number): Activity {
  const time = addMinutes(firstAct.time, -30);
  return {
    id: `synth-d${dayNumber}-hotel-start`,
    time,
    title: `Wake up at ${hotel.name}`,
    description: `${hotel.notes ? hotel.notes + ' · ' : ''}Heading to ${firstAct.title}.`,
    address: hotel.address || hotel.neighborhood,
    category: 'hotel',
    lat: hotel.lat,
    lng: hotel.lng,
  };
}

function synthHotelEnd(hotel: Hotel, lastAct: Activity, dayNumber: number): Activity {
  const time = addMinutes(lastAct.time, 90);
  return {
    id: `synth-d${dayNumber}-hotel-end`,
    time,
    title: `Back at ${hotel.name}`,
    description: `End of Day ${dayNumber}.`,
    address: hotel.address || hotel.neighborhood,
    category: 'hotel',
    lat: hotel.lat,
    lng: hotel.lng,
  };
}

export default function DayDetail() {
  const { slug, dayNumber } = useParams<{ slug: string; dayNumber: string }>();
  const trip = slug ? getTrip(slug) : undefined;
  const now = useNow();
  const mapWrapRef = useRef<HTMLDivElement | null>(null);
  const [focusOn, setFocusOn] = useState<{ lat: number; lng: number; key: string } | null>(null);

  if (!trip) return <Navigate to="/" replace />;
  const day = trip.days.find((d) => d.dayNumber === Number(dayNumber));
  if (!day) return <Navigate to={`/${trip.slug}`} replace />;

  const prev = trip.days.find((d) => d.dayNumber === day.dayNumber - 1);
  const next = trip.days.find((d) => d.dayNumber === day.dayNumber + 1);
  const cc = cityColor(day.city);
  const status = deriveStatus(trip, now);
  const todayDay = status === 'active' ? getCurrentDay(trip, now) : null;
  const isToday = todayDay?.dayNumber === day.dayNumber;
  const currentNext = isToday ? getCurrentAndNext(day, now, trip.meta.timezone) : { current: null, next: null };
  const cost = dayCost(day, trip);

  // Synthesize "Wake up at [hotel]" + "Back at [hotel]" entries when the day
  // doesn't start/end at the hotel already.
  const startHotel = findStartHotel(trip, day.date);
  const endHotel = findEndHotel(trip, day.date);
  const firstReal = day.activities[0];
  const lastReal = day.activities[day.activities.length - 1];
  const prependStart =
    firstReal && startHotel && !sameSpot(startHotel, firstReal)
      ? synthHotelStart(startHotel, firstReal, day.dayNumber)
      : null;
  const appendEnd =
    lastReal && endHotel && !sameSpot(endHotel, lastReal)
      ? synthHotelEnd(endHotel, lastReal, day.dayNumber)
      : null;

  const filteredActivities: Activity[] = [
    ...(prependStart ? [prependStart] : []),
    ...day.activities,
    ...(appendEnd ? [appendEnd] : []),
  ];

  function liveState(a: Activity): 'current' | 'next' | 'past' | 'future' | null {
    if (!isToday) return null;
    if (currentNext.current?.id === a.id) return 'current';
    if (currentNext.next?.id === a.id) return 'next';
    if (currentNext.current && a.time < currentNext.current.time) return 'past';
    return 'future';
  }

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
        <div className="flex items-center gap-2 text-xs text-ink-faint tracking-wider uppercase flex-wrap">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: cc }} />
          {isToday && <span className="font-bold text-vermillion">Today ·</span>}
          Day {day.dayNumber} · {day.city}
          {cost.perPerson > 0 && (
            <span className="text-gold">· ~{formatCurrency(cost.perPerson, cost.currency)} pp</span>
          )}
        </div>
        <h1 className="font-display text-4xl sm:text-5xl text-ink mt-2 leading-tight">
          {day.theme}
        </h1>
        <p className="text-ink-soft mt-2 text-sm">{formatDateLong(day.date)}</p>

        {isToday && currentNext.current && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-vermillion text-paper px-3 py-1 text-xs font-semibold tracking-wider uppercase">
            ● Live · {currentNext.current.title}
          </div>
        )}
      </header>

      <div ref={mapWrapRef}>
        <TripMap
          trip={trip}
          selectedDay={day.dayNumber}
          heightClass="h-[40vh] min-h-[320px]"
          focusOn={focusOn ?? undefined}
        />
      </div>

      <div className="mt-3 flex items-center justify-end gap-3 flex-wrap text-xs">
        <span className="text-ink-faint">{filteredActivities.length} stops</span>
      </div>

      {trip.meta.cityNotes?.[day.city] && (
        <div className="mt-6">
          <CityNoteCard
            city={day.city}
            tldr={trip.meta.cityNotes[day.city].tldr}
            tips={trip.meta.cityNotes[day.city].tips}
          />
        </div>
      )}

      <section className="mt-8">
        {filteredActivities.map((a, i) => (
          <ActivityCard
            key={a.id}
            activity={a}
            isLast={i === filteredActivities.length - 1}
            currency={trip.meta.currency}
            slug={trip.slug}
            liveState={liveState(a)}
            onFocusOnMap={() => {
              setFocusOn({ lat: a.lat, lng: a.lng, key: a.id });
              mapWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        ))}
      </section>

      <div className="mt-8 flex justify-between items-center gap-3 border-t border-line pt-6">
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
        <OpenInMapsButton
          lat={day.activities[0]?.lat ?? 0}
          lng={day.activities[0]?.lng ?? 0}
          name={`Day ${day.dayNumber}: ${day.activities[0]?.title ?? day.theme}`}
          label="Start day in Maps"
          size="md"
        />
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

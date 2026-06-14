#!/usr/bin/env node
/**
 * Pre-compute route geometries for:
 *   1. consecutive same-day activities (act → next-act)
 *   2. each day's hotel → first activity (morning departure)
 *   3. each day's last activity → hotel (evening return)
 *
 * Usage:
 *   node scripts/precompute-routes.mjs trips/japan-honeymoon-2025.json
 *
 *   ≤ 2km:    OSRM foot profile  (real walking, mode='walk')
 *   ≤ 300km:  OSRM car profile   (surface-street route, mode='subway')
 *   > 300km:  skipped (true intercity — handled by intercityTransit)
 *
 * Hotel legs use the same thresholds.
 *
 * Public OSRM demo server. Rate-limited to 1 req/sec to be polite.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/precompute-routes.mjs <trip.json>');
  process.exit(1);
}

const WALK_THRESHOLD_M = 2000;
const DRIVE_THRESHOLD_M = 500_000;
const SLEEP_MS = 1100;

function hav(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function osrm(profile, from, to) {
  const url = `https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=polyline`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM ${profile} ${res.status}`);
  const data = await res.json();
  if (!data.routes?.[0]) return null;
  return data.routes[0];
}

// Public OSRM demo's `foot` profile is broken: it returns driving-speed
// durations (~37 km/h) AND inflated path distances (e.g. 2.4km route for what
// is actually a 300m walk across the street). We keep the polyline geometry
// for the map but compute walk distance + duration from haversine × 1.25
// (typical city-street padding) at 5 km/h.
const WALK_M_PER_MIN = 83.33;
const WALK_PATH_FACTOR = 1.25;

async function buildRoute(profile, from, to, mode) {
  const route = await osrm(profile, from, to);
  if (!route) return null;
  let distanceM, durationMin;
  if (mode === 'walk') {
    distanceM = Math.round(hav(from, to) * WALK_PATH_FACTOR);
    durationMin = Math.max(1, Math.round(distanceM / WALK_M_PER_MIN));
  } else {
    distanceM = Math.round(route.distance);
    durationMin = Math.round(route.duration / 60);
  }
  return {
    format: 'polyline',
    data: route.geometry,
    durationMin,
    distanceM,
    mode,
  };
}

/** Hotel where you slept LAST night (i.e. where the morning starts). */
function findStartHotel(trip, dayDate) {
  return trip.hotels?.find((h) => h.checkIn < dayDate && dayDate <= h.checkOut);
}

/** Hotel where you're sleeping TONIGHT (i.e. where the evening ends). */
function findEndHotel(trip, dayDate) {
  return trip.hotels?.find((h) => h.checkIn <= dayDate && dayDate < h.checkOut);
}

function sameSpot(a, b) {
  return Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lng - b.lng) < 1e-4;
}

async function computeLeg(from, to, label) {
  const d = hav(from, to);
  let profile, mode, modeLabel;
  if (d <= WALK_THRESHOLD_M) {
    profile = 'foot';
    mode = 'walk';
    modeLabel = 'walk';
  } else if (d <= DRIVE_THRESHOLD_M) {
    profile = 'driving';
    mode = 'subway';
    modeLabel = 'drive→subway';
  } else {
    console.log(`${label} (${(d / 1000).toFixed(1)}km) ... skipped (too far)`);
    return { result: null, mode: null };
  }
  process.stdout.write(`${label} (${(d / 1000).toFixed(1)}km, ${modeLabel}) ... `);
  try {
    const geom = await buildRoute(profile, from, to, mode);
    if (geom) {
      console.log(`ok (${geom.distanceM}m, ${geom.durationMin}min)`);
      return { result: geom, mode };
    }
    console.log('no route');
  } catch (e) {
    console.log(`FAIL ${e.message}`);
  }
  return { result: null, mode: null };
}

const trip = JSON.parse(readFileSync(file, 'utf-8'));
let walked = 0;
let driven = 0;
let hotelLegs = 0;
let skipped = 0;
let failed = 0;

for (const day of trip.days) {
  // Activity → next activity
  for (let i = 0; i < day.activities.length - 1; i++) {
    const a = day.activities[i];
    const b = day.activities[i + 1];
    if (a.lat === b.lat && a.lng === b.lng) {
      skipped++;
      continue;
    }
    if (a.routeToNext) {
      skipped++;
      continue;
    }
    const { result, mode } = await computeLeg(
      a,
      b,
      `Day ${day.dayNumber} · ${a.title} → ${b.title}`
    );
    if (result) {
      a.routeToNext = result;
      if (mode === 'walk') walked++;
      else driven++;
    } else {
      failed++;
    }
    await sleep(SLEEP_MS);
  }

  // Hotel → first activity
  if (day.activities.length > 0 && !day.routeFromHotel) {
    const startHotel = findStartHotel(trip, day.date);
    const first = day.activities[0];
    if (startHotel && !sameSpot(startHotel, first)) {
      const { result } = await computeLeg(
        startHotel,
        first,
        `Day ${day.dayNumber} HOTEL · ${startHotel.name} → ${first.title}`
      );
      if (result) {
        day.routeFromHotel = result;
        hotelLegs++;
      } else {
        failed++;
      }
      await sleep(SLEEP_MS);
    }
  }

  // Last activity → hotel
  if (day.activities.length > 0 && !day.routeToHotel) {
    const endHotel = findEndHotel(trip, day.date);
    const last = day.activities[day.activities.length - 1];
    if (endHotel && !sameSpot(endHotel, last)) {
      const { result } = await computeLeg(
        last,
        endHotel,
        `Day ${day.dayNumber} HOTEL · ${last.title} → ${endHotel.name}`
      );
      if (result) {
        day.routeToHotel = result;
        hotelLegs++;
      } else {
        failed++;
      }
      await sleep(SLEEP_MS);
    }
  }
}

writeFileSync(file, JSON.stringify(trip, null, 2));
console.log(
  `\nDone. walked=${walked} driven=${driven} hotelLegs=${hotelLegs} skipped=${skipped} failed=${failed}`
);
console.log(`Wrote ${file}`);

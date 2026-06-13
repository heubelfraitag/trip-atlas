#!/usr/bin/env node
/**
 * Pre-compute route geometries between consecutive same-day activities.
 *
 * Usage:
 *   node scripts/precompute-routes.mjs trips/japan-honeymoon-2025.json
 *
 *   ≤ 2km:  OSRM foot profile (real walking path, mode='walk')
 *   ≤ 25km: OSRM car profile  (surface-street route approximating a
 *                              subway/cross-town hop, mode='subway')
 *   > 25km: skipped (handled by intercityTransit + fetch-rail-geometries)
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
const DRIVE_THRESHOLD_M = 25_000;
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

async function buildRoute(profile, from, to, mode) {
  const route = await osrm(profile, from, to);
  if (!route) return null;
  return {
    format: 'polyline',
    data: route.geometry,
    durationMin: Math.round(route.duration / 60),
    distanceM: Math.round(route.distance),
    mode,
  };
}

const trip = JSON.parse(readFileSync(file, 'utf-8'));
let walked = 0;
let driven = 0;
let skipped = 0;
let failed = 0;

for (const day of trip.days) {
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
    const d = hav(a, b);

    let profile, mode, label;
    if (d <= WALK_THRESHOLD_M) {
      profile = 'foot';
      mode = 'walk';
      label = 'walk';
    } else if (d <= DRIVE_THRESHOLD_M) {
      profile = 'driving';
      mode = 'subway';
      label = 'drive→subway';
    } else {
      skipped++;
      continue;
    }

    process.stdout.write(
      `Day ${day.dayNumber} · ${a.title} → ${b.title} (${(d / 1000).toFixed(1)}km, ${label}) ... `
    );
    try {
      const geom = await buildRoute(profile, a, b, mode);
      if (geom) {
        a.routeToNext = geom;
        if (mode === 'walk') walked++;
        else driven++;
        console.log(`ok (${geom.distanceM}m, ${geom.durationMin}min)`);
      } else {
        failed++;
        console.log('no route');
      }
    } catch (e) {
      failed++;
      console.log(`FAIL ${e.message}`);
    }
    await sleep(SLEEP_MS);
  }
}

writeFileSync(file, JSON.stringify(trip, null, 2));
console.log(`\nDone. walked=${walked} driven=${driven} skipped=${skipped} failed=${failed}`);
console.log(`Wrote ${file}`);

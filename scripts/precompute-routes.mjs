#!/usr/bin/env node
/**
 * Pre-compute walking-route geometries for consecutive same-day activities.
 *
 * Usage:
 *   node scripts/precompute-routes.mjs trips/japan-honeymoon-2025.json
 *
 * Writes routeToNext (encoded polyline) for any pair within 2km on foot.
 * Skips pairs further than 2km — those get the styled transit line at runtime.
 * Uses the public OSRM demo server. Rate-limited to 1 req/sec to be polite.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/precompute-routes.mjs <trip.json>');
  process.exit(1);
}

const WALK_THRESHOLD_M = 2000;
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

async function osrmFoot(from, to) {
  const url = `https://router.project-osrm.org/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=polyline`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  if (!data.routes?.[0]) return null;
  const route = data.routes[0];
  return {
    format: 'polyline',
    data: route.geometry,
    durationMin: Math.round(route.duration / 60),
    distanceM: Math.round(route.distance),
    mode: 'walk',
  };
}

const trip = JSON.parse(readFileSync(file, 'utf-8'));
let computed = 0;
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
    const d = hav(a, b);
    if (d > WALK_THRESHOLD_M) {
      // too far — leave to runtime transit-style line
      skipped++;
      continue;
    }
    if (a.routeToNext) {
      skipped++;
      continue;
    }
    process.stdout.write(`Day ${day.dayNumber} · ${a.title} → ${b.title} (${Math.round(d)}m) ... `);
    try {
      const geom = await osrmFoot(a, b);
      if (geom) {
        a.routeToNext = geom;
        computed++;
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
console.log(`\nDone. computed=${computed} skipped=${skipped} failed=${failed}`);
console.log(`Wrote ${file}`);

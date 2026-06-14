#!/usr/bin/env node
/**
 * Bake real route geometries into intercityTransit[].routeGeometry.
 *
 * Strategy:
 *  - For known rail lines (Tokaido Shinkansen, Fuji Excursion, etc.) use
 *    hardcoded corridor waypoints (station coordinates) and trim to the
 *    segment between the leg's from/to stations.
 *  - For bus/car/taxi, use OSRM driving via the public demo server.
 *  - Leaves already-set routeGeometry alone (idempotent).
 *
 * Add new corridors at the bottom of CORRIDORS as needed for other trips.
 *
 * Usage:
 *   node scripts/fetch-rail-geometries.mjs trips/japan-honeymoon-2025.json
 */
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/fetch-rail-geometries.mjs <trip.json>');
  process.exit(1);
}

// =========================================================================
// Known rail corridors. Each is an ordered list of [lat, lng] waypoints
// at major stations. Match keys against IntercityTransit.line (case-insensitive
// substring match). For a new trip, add a corridor here.
// =========================================================================
const CORRIDORS = {
  // Tokyo ↔ Shin-Osaka via Tokaido Shinkansen
  'Tokaido': [
    [35.6812, 139.7671], // Tokyo
    [35.5066, 139.6171], // Shin-Yokohama
    [35.2563, 139.1554], // Odawara
    [35.1058, 139.0772], // Atami
    [35.1281, 138.9117], // Mishima
    [35.2225, 138.5836], // Shin-Fuji
    [34.9719, 138.3892], // Shizuoka
    [34.7037, 137.7350], // Hamamatsu
    [34.7625, 137.3849], // Toyohashi
    [34.9697, 137.0791], // Mikawa-Anjo
    [35.1709, 136.8819], // Nagoya
    [35.3175, 136.2864], // Maibara
    [34.9858, 135.7585], // Kyoto
    [34.7339, 135.5003], // Shin-Osaka
  ],

  // Fuji Excursion / JR Chuo + Fujikyu (Shinjuku ↔ Kawaguchiko)
  'Fuji Excursion': [
    [35.6896, 139.7006], // Shinjuku
    [35.6987, 139.4138], // Tachikawa
    [35.6111, 138.9382], // Otsuki
    [35.4869, 138.8002], // Mt Fuji Station
    [35.5009, 138.7592], // Kawaguchiko
  ],
};

// =========================================================================
// Helpers
// =========================================================================

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

function findCorridor(lineName) {
  if (!lineName) return null;
  const lower = lineName.toLowerCase();
  for (const key of Object.keys(CORRIDORS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return { key, points: CORRIDORS[key] };
    }
  }
  return null;
}

function nearestIndex(corridor, lat, lng) {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < corridor.length; i++) {
    const d = hav({ lat: corridor[i][0], lng: corridor[i][1] }, { lat, lng });
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return { idx: bestIdx, dist: bestDist };
}

/**
 * Slice the corridor between the nearest waypoints to from/to. If the
 * `to` waypoint comes before `from` in the corridor order, reverse.
 * Always include the exact from/to station coords as the endpoints so
 * the line meets the station markers.
 */
function corridorSegment(corridor, t) {
  const fromN = nearestIndex(corridor, t.fromLat, t.fromLng);
  const toN = nearestIndex(corridor, t.toLat, t.toLng);
  const start = Math.min(fromN.idx, toN.idx);
  const end = Math.max(fromN.idx, toN.idx);
  let slice = corridor.slice(start, end + 1).map(([lat, lng]) => [lat, lng]);
  if (fromN.idx > toN.idx) slice = slice.reverse();
  // Anchor exact endpoints
  slice[0] = [t.fromLat, t.fromLng];
  slice[slice.length - 1] = [t.toLat, t.toLng];
  return slice;
}

async function osrmDrive(from, to) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=polyline`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM driving ${res.status}`);
  const data = await res.json();
  if (!data.routes?.[0]) return null;
  return data.routes[0];
}

/** Decode Google encoded polyline (precision 5) → [[lat,lng], ...]. */
function decodePolyline(str, precision = 5) {
  let index = 0,
    lat = 0,
    lng = 0;
  const coordinates = [];
  const factor = Math.pow(10, precision);
  while (index < str.length) {
    let shift = 0,
      result = 0,
      byte;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
}

/**
 * Bridge each consecutive pair of corridor waypoints via OSRM driving.
 * Produces a road-following polyline that visits every station-stop and follows
 * expressway corridors (which parallel Shinkansen lines reasonably well).
 */
async function osrmBridgeCorridor(waypoints) {
  const allLatLngs = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = { lat: waypoints[i][0], lng: waypoints[i][1] };
    const to = { lat: waypoints[i + 1][0], lng: waypoints[i + 1][1] };
    let segment = null;
    try {
      const route = await osrmDrive(from, to);
      if (route) segment = decodePolyline(route.geometry);
    } catch (e) {
      console.log(`    bridge ${i} fail: ${e.message}`);
    }
    if (!segment || segment.length === 0) {
      // Fallback: just the two endpoints
      if (i === 0) allLatLngs.push([from.lat, from.lng]);
      allLatLngs.push([to.lat, to.lng]);
    } else {
      if (i > 0) segment.shift(); // avoid duplicating the connection point
      allLatLngs.push(...segment);
    }
    await sleep(1100);
  }
  return allLatLngs;
}

// =========================================================================
// Main
// =========================================================================
const trip = JSON.parse(readFileSync(file, 'utf-8'));
let rail = 0;
let drive = 0;
let skipped = 0;
let failed = 0;

for (const t of trip.intercityTransit || []) {
  if (t.routeGeometry) {
    skipped++;
    console.log(`${t.id} (${t.line || t.mode}): already has geometry — skip`);
    continue;
  }

  const isRail = ['shinkansen', 'limited-express', 'train', 'subway'].includes(t.mode);

  if (isRail) {
    const corridor = findCorridor(t.line);
    if (!corridor) {
      console.log(`${t.id} (${t.line}): no hardcoded corridor — skip (add to CORRIDORS to fix)`);
      skipped++;
      continue;
    }
    const segment = corridorSegment(corridor.points, t);
    console.log(
      `${t.id} (${t.line}): corridor "${corridor.key}" · bridging ${segment.length} waypoints via OSRM driving...`
    );
    const bridged = await osrmBridgeCorridor(segment);
    // Convert to GeoJSON [lng, lat] tuples
    t.routeGeometry = {
      format: 'geojson',
      data: bridged.map(([lat, lng]) => [lng, lat]),
      mode: t.mode,
      line: t.line,
    };
    rail++;
    console.log(`  ✓ ${bridged.length} points along expressway corridor`);
  } else {
    // bus / taxi / car: OSRM driving
    try {
      const route = await osrmDrive(
        { lat: t.fromLat, lng: t.fromLng },
        { lat: t.toLat, lng: t.toLng }
      );
      if (route) {
        t.routeGeometry = {
          format: 'polyline',
          data: route.geometry,
          durationMin: Math.round(route.duration / 60),
          distanceM: Math.round(route.distance),
          mode: t.mode,
          line: t.line,
        };
        drive++;
        console.log(
          `${t.id} (${t.mode} via "${t.line || '?'}"): OSRM driving ${(
            route.distance / 1000
          ).toFixed(1)}km, ${Math.round(route.duration / 60)}min`
        );
      } else {
        failed++;
        console.log(`${t.id}: no driving route`);
      }
    } catch (e) {
      failed++;
      console.log(`${t.id}: FAIL ${e.message}`);
    }
    await sleep(1100);
  }
}

writeFileSync(file, JSON.stringify(trip, null, 2));
console.log(`\nDone. rail=${rail} drive=${drive} skipped=${skipped} failed=${failed}`);
console.log(`Wrote ${file}`);

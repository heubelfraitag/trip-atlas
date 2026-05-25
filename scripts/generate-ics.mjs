#!/usr/bin/env node
/**
 * Reads every trips/*.json and writes public/calendar/<slug>.ics so it
 * ends up in dist/calendar/<slug>.ics — subscribable at
 *   webcal://heubelfraitag.github.io/trip-atlas/calendar/<slug>.ics
 *
 * Run automatically via "prebuild" / "predev".
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const tripsDir = join(repoRoot, 'trips');
const outDir = join(repoRoot, 'public', 'calendar');

if (!existsSync(tripsDir)) {
  console.log('[ics] no trips/ dir, skipping');
  process.exit(0);
}
mkdirSync(outDir, { recursive: true });

const files = readdirSync(tripsDir).filter((f) => f.endsWith('.json'));
for (const f of files) {
  const trip = JSON.parse(readFileSync(join(tripsDir, f), 'utf-8'));
  const ics = buildICS(trip);
  const out = join(outDir, f.replace(/\.json$/, '.ics'));
  writeFileSync(out, ics);
  console.log(`[ics] wrote ${out}`);
}

// === Inline ICS builder (same logic as src/lib/ics.ts; kept in sync manually) ===

function buildICS(trip) {
  const tz = trip.meta.timezone || 'UTC';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Trip Atlas//${trip.slug}//EN`,
    'METHOD:PUBLISH',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${esc(trip.meta.name)}`,
    `X-WR-TIMEZONE:${tz}`,
  ];
  if (trip.meta.subtitle) lines.push(`X-WR-CALDESC:${esc(trip.meta.subtitle)}`);

  const stamp = nowStamp();

  for (const day of trip.days) {
    for (let i = 0; i < day.activities.length; i++) {
      const a = day.activities[i];
      const next = day.activities[i + 1];
      const endTime = computeEnd(a.time, next?.time);
      pushEvent(lines, {
        uid: `${trip.slug}-${a.id}@trip-atlas`,
        stamp,
        startDate: day.date,
        startTime: a.time,
        endDate: day.date,
        endTime,
        summary: `${a.title}${a.soloOnly ? ' (solo)' : ''}`,
        description: buildDescription(a, trip),
        location: a.address || `${a.lat},${a.lng}`,
        url: gMapsHref(a.lat, a.lng, a.title),
        timezone: tz,
        geo: `${a.lat};${a.lng}`,
      });
    }
  }

  for (const t of trip.intercityTransit) {
    const dep = t.departureTime || '00:00';
    const dur = t.durationMin || 60;
    const arr = t.arrivalTime || addMinutes(dep, dur);
    pushEvent(lines, {
      uid: `${trip.slug}-${t.id}@trip-atlas`,
      stamp,
      startDate: t.date,
      startTime: dep,
      endDate: t.date,
      endTime: arr,
      summary: `${labelMode(t)} ${t.from} → ${t.to}`,
      description: transitDescription(t),
      location: `${t.from} → ${t.to}`,
      url: gMapsHref(t.fromLat, t.fromLng, t.from),
      timezone: tz,
    });
  }

  for (const h of trip.hotels) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${trip.slug}-${h.id}@trip-atlas`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${h.checkIn.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${h.checkOut.replace(/-/g, '')}`,
      `SUMMARY:Hotel · ${esc(h.name)}`,
      h.notes ? `DESCRIPTION:${esc(h.notes)}` : '',
      `LOCATION:${esc(h.address || h.neighborhood || h.name)}`,
      `URL:${gMapsHref(h.lat, h.lng, h.name)}`,
      `GEO:${h.lat};${h.lng}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).join('\r\n') + '\r\n';
}

function pushEvent(lines, opts) {
  const startUTC = localToUTC(opts.startDate, opts.startTime, opts.timezone);
  const endUTC = localToUTC(opts.endDate, opts.endTime, opts.timezone);
  lines.push(
    'BEGIN:VEVENT',
    `UID:${opts.uid}`,
    `DTSTAMP:${opts.stamp}`,
    `DTSTART:${startUTC}`,
    `DTEND:${endUTC}`,
    `SUMMARY:${esc(opts.summary)}`
  );
  if (opts.description) lines.push(`DESCRIPTION:${esc(opts.description)}`);
  if (opts.location) lines.push(`LOCATION:${esc(opts.location)}`);
  if (opts.url) lines.push(`URL:${opts.url}`);
  if (opts.geo) lines.push(`GEO:${opts.geo}`);
  lines.push('END:VEVENT');
}

function nowStamp() {
  const d = new Date();
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

function localToUTC(date, time, timezone) {
  const [Y, Mo, D] = date.split('-').map(Number);
  const [h, m] = time.split(':').map(Number);
  const guess = Date.UTC(Y, (Mo || 1) - 1, D || 1, h || 0, m || 0, 0);
  const offset = tzOffsetMinutes(new Date(guess), timezone);
  const u = new Date(guess - offset * 60_000);
  return (
    u.getUTCFullYear().toString() +
    pad(u.getUTCMonth() + 1) +
    pad(u.getUTCDate()) +
    'T' +
    pad(u.getUTCHours()) +
    pad(u.getUTCMinutes()) +
    pad(u.getUTCSeconds()) +
    'Z'
  );
}

function tzOffsetMinutes(at, timezone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return Math.round((asUTC - at.getTime()) / 60_000);
}

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function gMapsHref(lat, lng, name) {
  return `https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=${encodeURIComponent(
    name + ', ' + lat + ',' + lng
  )}`;
}

function buildDescription(a, trip) {
  const bits = [];
  if (a.description) bits.push(a.description);
  if (typeof a.costPerPerson === 'number')
    bits.push(`~${a.costPerPerson} ${a.currency || trip.meta.currency} pp`);
  if (a.bookingUrl) bits.push(`Booking: ${a.bookingUrl}`);
  bits.push(gMapsHref(a.lat, a.lng, a.title));
  return bits.join('\n');
}

function transitDescription(t) {
  const bits = [];
  if (t.line) bits.push(t.line);
  if (typeof t.costPerPerson === 'number') bits.push(`${t.costPerPerson} ${t.currency || 'JPY'} pp`);
  if (t.notes) bits.push(t.notes);
  return bits.join('\n');
}

function labelMode(t) {
  const m = t.mode.replace('-', ' ');
  return m.charAt(0).toUpperCase() + m.slice(1);
}

function computeEnd(start, nextStart) {
  if (!nextStart) return addMinutes(start, 60);
  if (nextStart <= start) return addMinutes(start, 60);
  const diff = diffMinutes(start, nextStart);
  return addMinutes(start, Math.min(120, Math.max(15, diff - 5)));
}

function diffMinutes(a, b) {
  const [h1, m1] = a.split(':').map(Number);
  const [h2, m2] = b.split(':').map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(((total + 1440) % 1440) / 60);
  const mm = (total + 1440) % 60;
  return `${pad(hh)}:${pad(mm)}`;
}

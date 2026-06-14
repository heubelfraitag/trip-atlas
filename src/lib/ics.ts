import type { Trip, Activity, IntercityTransit } from '../types/trip';

/**
 * Build an iCalendar (RFC 5545) string for a trip.
 *
 * Times are converted from the trip's local timezone to UTC and emitted with a Z suffix.
 * Calendar apps then display in the viewer's local zone — which matches phone-clock-in-Japan
 * during the trip, and shows correct absolute time when planning from elsewhere.
 */
export function buildICS(trip: Trip): string {
  const tz = trip.meta.timezone || 'UTC';
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Trip Atlas//${trip.slug}//EN`,
    'METHOD:PUBLISH',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escape(trip.meta.name)}`,
    `X-WR-TIMEZONE:${tz}`,
  ];
  if (trip.meta.subtitle) lines.push(`X-WR-CALDESC:${escape(trip.meta.subtitle)}`);

  const stamp = nowStamp();

  // Activities
  for (const day of trip.days) {
    for (let i = 0; i < day.activities.length; i++) {
      const a = day.activities[i];
      const next = day.activities[i + 1];
      const endTime = computeEnd(a.time, next?.time);
      lines.push(...event({
        uid: `${trip.slug}-${a.id}@trip-atlas`,
        stamp,
        startDate: day.date,
        startTime: a.time,
        endDate: day.date,
        endTime,
        summary: `${a.title}${a.soloOnly ? ' (solo)' : ''}`,
        description: buildDescription(a, trip),
        location: a.address || `${a.lat},${a.lng}`,
        url: googleMapsHref(a.lat, a.lng, a.title),
        timezone: tz,
        geo: `${a.lat};${a.lng}`,
      }));
    }
  }

  // Intercity transit
  for (const t of trip.intercityTransit) {
    const dep = t.departureTime || '00:00';
    const dur = t.durationMin || 60;
    const arr = t.arrivalTime || addMinutes(dep, dur);
    lines.push(...event({
      uid: `${trip.slug}-${t.id}@trip-atlas`,
      stamp,
      startDate: t.date,
      startTime: dep,
      endDate: t.date,
      endTime: arr,
      summary: `${labelMode(t)} ${t.from} → ${t.to}`,
      description: transitDescription(t),
      location: `${t.from} → ${t.to}`,
      url: googleMapsHref(t.fromLat, t.fromLng, t.from),
      timezone: tz,
    }));
  }

  // Hotel check-ins as all-day events on the check-in date
  for (const h of trip.hotels) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${trip.slug}-${h.id}@trip-atlas`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${h.checkIn.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${h.checkOut.replace(/-/g, '')}`,
      `SUMMARY:Hotel · ${escape(h.name)}`,
      h.notes ? `DESCRIPTION:${escape(h.notes)}` : '',
      `LOCATION:${escape(h.address || h.neighborhood || h.name)}`,
      `URL:${googleMapsHref(h.lat, h.lng, h.name)}`,
      `GEO:${h.lat};${h.lng}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).join('\r\n') + '\r\n';
}

function event(opts: {
  uid: string;
  stamp: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  timezone: string;
  geo?: string;
}): string[] {
  const startUTC = localToUTC(opts.startDate, opts.startTime, opts.timezone);
  const endUTC = localToUTC(opts.endDate, opts.endTime, opts.timezone);
  const block = [
    'BEGIN:VEVENT',
    `UID:${opts.uid}`,
    `DTSTAMP:${opts.stamp}`,
    `DTSTART:${startUTC}`,
    `DTEND:${endUTC}`,
    `SUMMARY:${escape(opts.summary)}`,
  ];
  if (opts.description) block.push(`DESCRIPTION:${escape(opts.description)}`);
  if (opts.location) block.push(`LOCATION:${escape(opts.location)}`);
  if (opts.url) block.push(`URL:${opts.url}`);
  if (opts.geo) block.push(`GEO:${opts.geo}`);
  block.push('END:VEVENT');
  return block;
}

function nowStamp(): string {
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

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

/** Convert an `YYYY-MM-DD` + `HH:MM` interpreted in `timezone` → UTC `YYYYMMDDTHHMMSSZ`. */
function localToUTC(date: string, time: string, timezone: string): string {
  const [Y, Mo, D] = date.split('-').map(Number);
  const [h, m] = time.split(':').map(Number);
  // `guess` is the UTC instant whose UTC wall-time matches the (date,time) input.
  const guess = Date.UTC(Y, (Mo || 1) - 1, D || 1, h || 0, m || 0, 0);
  // offset = minutes the target zone is ahead of UTC (JST → +540, EST → -300).
  const offset = tzOffsetMinutes(new Date(guess), timezone);
  // Subtract that offset to get the actual UTC ms whose zone-wall matches the input.
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

/** Minutes that `timezone` is offset from UTC at the given instant (positive = ahead of UTC). */
function tzOffsetMinutes(at: Date, timezone: string): number {
  // Format the instant in the target timezone, then compute the diff.
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

function escape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function googleMapsHref(lat: number, lng: number, name: string): string {
  // Place-card link so the calendar event opens photos/reviews, not directions
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    name + ', ' + lat + ',' + lng
  )}`;
}

function buildDescription(a: Activity, trip: Trip): string {
  const bits: string[] = [];
  if (a.description) bits.push(a.description);
  if (typeof a.costPerPerson === 'number')
    bits.push(`~${a.costPerPerson} ${a.currency ?? trip.meta.currency} pp`);
  if (a.bookingUrl) bits.push(`Booking: ${a.bookingUrl}`);
  bits.push(googleMapsHref(a.lat, a.lng, a.title));
  return bits.join('\n');
}

function transitDescription(t: IntercityTransit): string {
  const bits: string[] = [];
  if (t.line) bits.push(t.line);
  if (typeof t.costPerPerson === 'number')
    bits.push(`${t.costPerPerson} ${t.currency ?? 'JPY'} pp`);
  if (t.notes) bits.push(t.notes);
  return bits.join('\n');
}

function labelMode(t: IntercityTransit): string {
  const m = t.mode.replace('-', ' ');
  return m.charAt(0).toUpperCase() + m.slice(1);
}

function computeEnd(start: string, nextStart: string | undefined): string {
  if (!nextStart) return addMinutes(start, 60);
  if (nextStart <= start) return addMinutes(start, 60); // next day, just use 1h
  return addMinutes(start, Math.min(120, diffMinutes(start, nextStart) - 5)) || addMinutes(start, 60);
}

function diffMinutes(a: string, b: string): number {
  const [h1, m1] = a.split(':').map(Number);
  const [h2, m2] = b.split(':').map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor((total + 1440) % 1440 / 60);
  const mm = (total + 1440) % 60;
  return `${pad(hh)}:${pad(mm)}`;
}

/** Trigger a browser download for an ICS string. */
export function downloadICS(filename: string, ics: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

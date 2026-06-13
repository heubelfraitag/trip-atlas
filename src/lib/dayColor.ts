/**
 * Shared per-day color helper used by TripMap (polyline gradient) and
 * TripOverview (day chip / day card accents) so the map and list match.
 */
export function dayHue(dayNumber: number, totalDays: number): number {
  const step = 360 / Math.max(1, totalDays);
  const offset = 14;
  return Math.round((offset + (dayNumber - 1) * step) % 360);
}

export function dayColor(
  dayNumber: number,
  totalDays: number,
  opts?: { lightness?: number; saturation?: number }
): string {
  const h = dayHue(dayNumber, totalDays);
  const s = opts?.saturation ?? 68;
  const l = opts?.lightness ?? 42;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

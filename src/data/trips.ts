import type { Trip } from '../types/trip';

// Vite glob-imports all trip JSON files at build time.
// Drop a new file in /trips and it'll appear automatically.
const tripModules = import.meta.glob<Trip>('../../trips/*.json', {
  eager: true,
  import: 'default',
});

export const trips: Trip[] = Object.values(tripModules).sort((a, b) =>
  a.meta.startDate.localeCompare(b.meta.startDate)
);

export function getTrip(slug: string): Trip | undefined {
  return trips.find((t) => t.slug === slug);
}

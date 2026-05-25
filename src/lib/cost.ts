import type { Trip, Day } from '../types/trip';

export interface CostSummary {
  /** Sum of per-person activity + intercity costs. Hotels excluded (no nightly cost in schema yet). */
  perPerson: number;
  currency: string;
}

export function dayCost(day: Day, trip: Trip): CostSummary {
  let sum = 0;
  for (const a of day.activities) if (typeof a.costPerPerson === 'number') sum += a.costPerPerson;
  for (const t of trip.intercityTransit)
    if (t.date === day.date && typeof t.costPerPerson === 'number') sum += t.costPerPerson;
  return { perPerson: sum, currency: trip.meta.currency };
}

export function tripCost(trip: Trip): CostSummary {
  let sum = 0;
  for (const d of trip.days) for (const a of d.activities) if (typeof a.costPerPerson === 'number') sum += a.costPerPerson;
  for (const t of trip.intercityTransit) if (typeof t.costPerPerson === 'number') sum += t.costPerPerson;
  return { perPerson: sum, currency: trip.meta.currency };
}

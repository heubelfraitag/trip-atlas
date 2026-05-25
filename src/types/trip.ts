export type Category =
  | 'hotel'
  | 'transit'
  | 'airport'
  | 'food'
  | 'bar'
  | 'shop'
  | 'temple'
  | 'art'
  | 'nature'
  | 'experience'
  | 'walk';

export type TripStatus = 'planning' | 'active' | 'completed';

export type TransitMode =
  | 'walk'
  | 'subway'
  | 'train'
  | 'shinkansen'
  | 'limited-express'
  | 'bus'
  | 'taxi'
  | 'plane'
  | 'ferry';

export type ChecklistPriority = 'asap' | 'weeks-2' | 'closer';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Encoded polyline (Google's polyline algorithm, precision 5) or GeoJSON LineString coordinates. */
export interface RouteGeometry {
  /** "polyline" = Google encoded polyline 5; "geojson" = [[lng,lat], ...] */
  format: 'polyline' | 'geojson';
  data: string | [number, number][];
  durationMin?: number;
  distanceM?: number;
  mode: TransitMode;
  /** Optional named transit line for color coding (e.g. "JR Yamanote", "Tokyo Metro Ginza"). */
  line?: string;
}

export interface Hotel {
  id: string;
  name: string;
  neighborhood?: string;
  address?: string;
  lat: number;
  lng: number;
  checkIn: string;
  checkOut: string;
  bookingUrl?: string;
  booked?: boolean;
  notes?: string;
}

export interface Airport {
  code: string;
  name: string;
  lat: number;
  lng: number;
  role: 'arrival' | 'departure';
  datetime: string;
}

export interface IntercityTransit {
  id: string;
  date: string;
  from: string;
  to: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  mode: TransitMode;
  line?: string;
  departureTime?: string;
  arrivalTime?: string;
  durationMin?: number;
  costPerPerson?: number;
  currency?: string;
  notes?: string;
  routeGeometry?: RouteGeometry;
}

export interface Activity {
  id: string;
  time: string;
  title: string;
  description?: string;
  address?: string;
  lat: number;
  lng: number;
  category: Category;
  bookingUrl?: string;
  costPerPerson?: number;
  currency?: string;
  /** Tagged solo activities filtered by toggle. */
  soloOnly?: boolean;
  /**
   * If true, no "Open in Maps" button is shown. Use for activities without a
   * specific destination (e.g. "neighborhood walk", "free time").
   */
  noNavigate?: boolean;
  /** Pre-computed route to the next activity (or null if last). */
  routeToNext?: RouteGeometry;
  photoUrl?: string;
}

export interface Day {
  date: string;
  dayNumber: number;
  theme: string;
  city: string;
  activities: Activity[];
}

export interface ChecklistItem {
  id: string;
  title: string;
  detail?: string;
  priority: ChecklistPriority;
  deadline?: string;
  bookingUrl?: string;
}

export interface TripMeta {
  name: string;
  subtitle?: string;
  startDate: string;
  endDate: string;
  cities: string[];
  status: TripStatus;
  currency: string;
  coverImageUrl?: string;
  /** Per-trip accent palette overrides; defaults to vermillion/gold. */
  accents?: {
    primary?: string;
    secondary?: string;
  };
  /** Optional script accent (e.g. Shippori Mincho for Japan). */
  useScriptAccent?: boolean;
}

export interface Trip {
  slug: string;
  meta: TripMeta;
  airports: Airport[];
  hotels: Hotel[];
  intercityTransit: IntercityTransit[];
  days: Day[];
  checklist: ChecklistItem[];
}

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

/** Structured booking record for the Stays / confirmations page. */
export interface StayRecord {
  /** Property actually holding the booking, when it differs from Hotel.name (e.g. a backup). */
  propertyName?: string;
  /** Shown under the name when propertyName overrides it. */
  alternateNote?: string;
  /** Which platform holds the booking, e.g. "Booking.com", "Chase Travel", "Agoda". */
  platform?: string;
  /** The number you give at the front desk. */
  confirmation?: string;
  /** Secondary reference, e.g. a Chase Travel Trip ID. */
  tripId?: string;
  /** Booking.com-style PIN. Confidential - can modify or cancel the booking. */
  pin?: string;
  /** Name the reservation is held under. */
  guestName?: string;
  /** Loyalty membership number, if the stay is an award booking. */
  membership?: string;
  city?: string;
  /** English address, when it differs from Hotel.address (e.g. a backup property). */
  addressEn?: string;
  /** Address in Japanese, to show a taxi driver. */
  addressJa?: string;
  /** Hotel phone — also what a Japanese taxi's navigation can search by. */
  phone?: string;
  email?: string;
  /** Check-in window, e.g. "15:00-19:30". */
  checkInTime?: string;
  checkOutTime?: string;
  /** What was paid and how. */
  payment?: string;
  paid?: boolean;
  /** Free-cancellation deadline, in plain words. */
  cancelBy?: string;
  /** Which meals are included. */
  meals?: string;
  /** Which mailbox the confirmation email is in. */
  confirmationLocation?: string;
  /** Deep link to manage the booking. */
  manageUrl?: string;
  /** Google Maps link for your own directions. */
  mapsUrl?: string;
  /** Caveat about the phone number, e.g. when there's no front-desk line. */
  phoneNote?: string;
  /** Things that need attention or could go wrong at check-in. */
  warnings?: string[];
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
  /** Short text for the synthesized "Wake up at …" card. Replaces the full notes there. */
  wakeNote?: string;
  /** Structured confirmation details, surfaced on the Stays page. */
  stay?: StayRecord;
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

export type ActivityStatus = 'confirmed' | 'tentative' | 'idea';
export type ActivityKind = 'event' | 'free-time';

export interface Activity {
  id: string;
  /** HH:MM in trip-local time. Optional for wishlist items and free-time blocks. */
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
  /**
   * Commitment level. Defaults to "tentative" if omitted.
   * - confirmed: reservation or booking is locked in, don't swap.
   * - tentative: penciled in, open to swapping.
   * - idea: just a candidate from inspo gathering.
   */
  status?: ActivityStatus;
  /** Short note explaining why it's confirmed: "Reservation 7pm", "Train booked". */
  lockReason?: string;
  /**
   * "event" (default) = an actual activity with a place + time.
   * "free-time" = an intentional unscheduled block. No map pin, no Open-in-Maps button.
   */
  kind?: ActivityKind;
  /**
   * For wishlist items only — which city this idea is for.
   * Ignored for scheduled activities (they inherit their day's city).
   */
  city?: string;
}

/** An unscheduled fallback shown under a day's timeline. Not on the route, map, calendar or cost. */
export interface DayBackup {
  id: string;
  title: string;
  description?: string;
  address?: string;
  lat: number;
  lng: number;
  category: Category;
  /** Group label, e.g. the neighborhood the backup belongs to. */
  hub?: string;
}

export interface Day {
  date: string;
  dayNumber: number;
  theme: string;
  city: string;
  activities: Activity[];
  /** Morning route: hotel → first activity. Populated by precompute-routes.mjs. */
  routeFromHotel?: RouteGeometry;
  /** Evening route: last activity → hotel. Populated by precompute-routes.mjs. */
  routeToHotel?: RouteGeometry;
  /** Fallback stops if the day diverges from the schedule. Listed below the timeline only. */
  backups?: DayBackup[];
}

export interface ChecklistItem {
  id: string;
  title: string;
  detail?: string;
  priority: ChecklistPriority;
  deadline?: string;
  bookingUrl?: string;
  /** Free-text owner tag (e.g. "Brian", "Carl", "Both"). Used for filter chips. */
  assignee?: string;
}

export interface TripMeta {
  name: string;
  /** Private (login-only) page holding confirmation numbers, PINs and names. Never put those in this public file. */
  privateConfirmationsUrl?: string;
  subtitle?: string;
  startDate: string;
  endDate: string;
  cities: string[];
  status: TripStatus;
  currency: string;
  /** IANA timezone for "current day / current activity" detection and ICS export. */
  timezone?: string;
  coverImageUrl?: string;
  /** Practical, what-to-know briefing per city. Surfaced on the first day in that city. */
  cityNotes?: Record<string, { tldr?: string; tips?: string[] }>;
  /** Named parties for splitting the booking checklist. Free text. */
  parties?: string[];
  /** Per-trip accent palette overrides; defaults to vermillion/gold. */
  accents?: {
    primary?: string;
    secondary?: string;
  };
  /** Optional script accent (e.g. Shippori Mincho for Japan). */
  useScriptAccent?: boolean;
}

/** One leg of a flight booking. Times are local to each airport. */
export interface FlightSegment {
  flight: string;
  airline: string;
  /** Operating carrier when different from the marketing airline. */
  operatedBy?: string;
  /** Departure date, YYYY-MM-DD, local. */
  date: string;
  from: string;
  fromTerminal?: string;
  /** HH:MM local. */
  depart: string;
  to: string;
  toTerminal?: string;
  arrive: string;
  /** Arrival date if it differs from the departure date. */
  arriveDate?: string;
  cabin?: string;
  seats?: string;
}

/** A flight booking (one record locator), shown on the Flights tab. */
export interface FlightBooking {
  id: string;
  /** e.g. "Outbound" / "Return". */
  label: string;
  /** Omit in public data — lives on the private page. */
  bookingRef?: string;
  platform?: string;
  /** Separate record locator at a partner airline, if any. */
  partnerRef?: string;
  passengers?: string[];
  ticketNumbers?: string[];
  segments: FlightSegment[];
  baggage?: string;
  checkIn?: string;
  phone?: string;
  manageUrl?: string;
  confirmationLocation?: string;
  warnings?: string[];
}

/** A titled block of guidance inside a train leg. */
export interface TrainSection {
  heading: string;
  items: string[];
  /** Render as numbered steps. */
  ordered?: boolean;
  /** Render the leg's Japanese glossary in this section. */
  showGlossary?: boolean;
}

/** One rail (or connecting bus) leg, shown on the Trains tab. */
export interface TrainLeg {
  id: string;
  /** YYYY-MM-DD, local. */
  date: string;
  title: string;
  service: string;
  departs?: string;
  durationMin?: number;
  price?: string;
  status: 'booked' | 'not-booked' | 'buy-on-the-day';
  statusNote?: string;
  sections?: TrainSection[];
  /** Japanese text you'll see on the ticket, with English. */
  glossary?: { ja: string; en: string }[];
}

/** One step of moving the big bags, shown on the Luggage tab. */
export interface LuggageStep {
  id: string;
  /** YYYY-MM-DD, local: the day you hand over (or carry) the bags. */
  date: string;
  title: string;
  /** Where / how you hand them over. */
  how: string;
  notes?: string[];
  /** Text to show a front desk: Japanese lines plus what they mean. */
  card?: { label: string; ja: string[]; en: string };
  mapsUrl?: string;
  /** Official page backing up the details. */
  sourceUrl?: string;
}

export interface Trip {
  slug: string;
  /** Luggage-forwarding plan for the Luggage tab. */
  luggage?: LuggageStep[];
  /** Rail legs for the Trains tab. */
  trains?: TrainLeg[];
  /** Flight bookings for the Flights tab. */
  flights?: FlightBooking[];
  meta: TripMeta;
  airports: Airport[];
  hotels: Hotel[];
  intercityTransit: IntercityTransit[];
  days: Day[];
  checklist: ChecklistItem[];
  /**
   * Candidate activities — places you've gathered as inspo but haven't slotted
   * into a specific day. Each item must have `city` set. No `time` required.
   */
  wishlist?: Activity[];
}

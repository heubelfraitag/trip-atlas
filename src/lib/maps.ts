import type { Category, TransitMode } from '../types/trip';

/** Tap-to-open in native Google Maps with directions queued from current location. */
export function googleMapsDirUrl(
  lat: number,
  lng: number,
  travelmode: 'transit' | 'walking' | 'driving' = 'transit',
  destinationName?: string
): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${lat},${lng}`,
    travelmode,
  });
  if (destinationName) {
    params.set('destination', `${destinationName}, ${lat},${lng}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Open a single place card (no directions). */
export function googleMapsPlaceUrl(lat: number, lng: number, name?: string): string {
  if (name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      name
    )}&query_lat=${lat}&query_lng=${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  hotel: 'Hotel',
  transit: 'Station',
  airport: 'Airport',
  food: 'Food',
  bar: 'Bar',
  shop: 'Shop',
  temple: 'Temple',
  art: 'Art',
  nature: 'Nature',
  experience: 'Experience',
  walk: 'Walk',
};

export const CATEGORY_GLYPH: Record<Category, string> = {
  hotel: '✦',
  transit: '◈',
  airport: '✈',
  food: '◉',
  bar: '◐',
  shop: '◇',
  temple: '⛩',
  art: '◬',
  nature: '❖',
  experience: '★',
  walk: '✣',
};

export const CATEGORY_COLOR: Record<Category, string> = {
  hotel: '#b5391f',
  transit: '#3a425a',
  airport: '#1a2238',
  food: '#c46a3d',
  bar: '#5d3a6e',
  shop: '#a07a3a',
  temple: '#b5391f',
  art: '#2a4d6e',
  nature: '#3d6b3d',
  experience: '#c4a370',
  walk: '#6b6e7e',
};

export const CITY_COLOR: Record<string, string> = {
  Tokyo: '#2a4d6e',
  Kawaguchiko: '#3d6b3d',
  'Mt Fuji': '#3d6b3d',
  Kyoto: '#5d3a6e',
  Osaka: '#c46a3d',
};

export function cityColor(city: string): string {
  return CITY_COLOR[city] ?? '#1a2238';
}

/** Stroke styles per transit mode — Google Maps-ish. */
export const TRANSIT_STYLE: Record<
  TransitMode,
  { color: string; weight: number; dashArray?: string; opacity: number }
> = {
  walk:            { color: '#3a425a', weight: 3, dashArray: '2 6',  opacity: 0.85 },
  subway:          { color: '#b5391f', weight: 4,                      opacity: 0.85 },
  train:           { color: '#2a4d6e', weight: 4,                      opacity: 0.85 },
  shinkansen:      { color: '#2a4d6e', weight: 5,                      opacity: 0.95 },
  'limited-express': { color: '#a07a3a', weight: 4,                    opacity: 0.9 },
  bus:             { color: '#3d6b3d', weight: 4,                      opacity: 0.85 },
  taxi:            { color: '#1a2238', weight: 3,                      opacity: 0.85 },
  plane:           { color: '#1a2238', weight: 3, dashArray: '8 8',   opacity: 0.85 },
  ferry:           { color: '#2a4d6e', weight: 3, dashArray: '4 8',   opacity: 0.85 },
};

/** Haversine distance in meters. */
export function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

/** Decode Google encoded polyline (precision 5) → [lat,lng] tuples. */
export function decodePolyline(str: string, precision = 5): [number, number][] {
  let index = 0,
    lat = 0,
    lng = 0;
  const coordinates: [number, number][] = [];
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

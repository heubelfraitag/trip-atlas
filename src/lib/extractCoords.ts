/**
 * Try to pull a lat/lng out of a Google Maps URL.
 * Returns null if no coords are detectable (shortened maps.app.goo.gl URLs
 * can't be unfurled client-side without a backend).
 */
export function extractCoordsFromUrl(input: string): { lat: number; lng: number } | null {
  if (!input) return null;
  const trimmed = input.trim();

  // 1. /@lat,lng,zoom pattern (full Google Maps URLs)
  const at = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(trimmed);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };

  // 2. ?q=lat,lng or &q=lat,lng
  const q = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/.exec(trimmed);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };

  // 3. !3dLAT!4dLNG (Google Maps "place" deep URLs)
  const dms = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(trimmed);
  if (dms) return { lat: parseFloat(dms[1]), lng: parseFloat(dms[2]) };

  // 4. ll=lat,lng (older Maps + Apple Maps share URLs)
  const ll = /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/.exec(trimmed);
  if (ll) return { lat: parseFloat(ll[1]), lng: parseFloat(ll[2]) };

  // 5. Bare "lat,lng" pasted text
  const bare = /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/.exec(trimmed);
  if (bare) return { lat: parseFloat(bare[1]), lng: parseFloat(bare[2]) };

  return null;
}

# Trip files

Drop a new `<slug>.json` in this directory and `npm run dev` (or rebuild) — it will appear on the home screen.

The schema lives in [`src/types/trip.ts`](../src/types/trip.ts). What follows is the human cheat sheet.

## Top-level

```jsonc
{
  "slug": "japan-honeymoon-2025",        // matches filename
  "meta": { ... },                        // trip metadata
  "airports": [ ... ],                    // arrival/departure
  "hotels": [ ... ],                      // one entry per stay
  "intercityTransit": [ ... ],            // bus/shinkansen/plane between cities
  "days": [ ... ],                        // ordered day list
  "checklist": [ ... ]                    // booking to-dos
}
```

## `meta`

| field             | required | notes                                                           |
| ----------------- | -------- | --------------------------------------------------------------- |
| `name`            | yes      | Display name                                                    |
| `subtitle`        |          | Hero subtitle (e.g. "Tokyo · Fuji · Kyoto · Osaka · Tokyo")     |
| `startDate`       | yes      | ISO `YYYY-MM-DD`                                                |
| `endDate`         | yes      | ISO `YYYY-MM-DD`                                                |
| `cities`          | yes      | Array of city names (used for filter chips + map color coding)  |
| `status`          | yes      | `"planning"` \| `"active"` \| `"completed"`                     |
| `currency`        | yes      | ISO 4217 (e.g. `"JPY"`, `"USD"`)                                |
| `coverImageUrl`   |          | Optional hero background                                        |
| `accents`         |          | `{ primary, secondary }` hex overrides for trip accent          |
| `useScriptAccent` |          | `true` → use Shippori Mincho for display text (Japan flavor)    |

## `hotels[]`

```jsonc
{
  "id": "hotel-tokyo-start",
  "name": "TRUNK Hotel Yoyogi Park",
  "neighborhood": "Harajuku / Yoyogi",
  "address": "5-31 Jingumae, Shibuya City",
  "lat": 35.6707, "lng": 139.6957,
  "checkIn":  "2025-11-24",
  "checkOut": "2025-11-27",
  "bookingUrl": "https://...",
  "booked": false,
  "notes": "Shortlist — replace once booked."
}
```

## `airports[]`

```jsonc
{ "code": "HND", "name": "Haneda Airport",
  "lat": 35.5494, "lng": 139.7798,
  "role": "arrival",            // or "departure"
  "datetime": "2025-11-24T16:30:00+09:00" }
```

## `intercityTransit[]`

```jsonc
{
  "id": "ic-1",
  "date": "2025-11-27",
  "from": "Shinjuku", "to": "Kawaguchiko",
  "fromLat": 35.6896, "fromLng": 139.7006,
  "toLat":   35.5009, "toLng":   138.7592,
  "mode": "limited-express",     // walk | subway | train | shinkansen | limited-express | bus | taxi | plane | ferry
  "line": "Fuji Excursion",
  "durationMin": 120,
  "costPerPerson": 4130,
  "currency": "JPY",
  "notes": "Reserved seats."
}
```

Mode determines stroke color/style on the map. Bold solid lines for `shinkansen`, gold for `limited-express` and `bus`, dashed for `walk`.

## `days[]`

```jsonc
{
  "date": "2025-11-25",        // ISO
  "dayNumber": 2,              // 1-indexed
  "theme": "Old Tokyo · Asakusa + Yanaka",
  "city": "Tokyo",             // must appear in meta.cities
  "activities": [ ... ]
}
```

## `activities[]` (inside a day)

```jsonc
{
  "id": "d2-2",                                  // unique within trip
  "time": "10:15",                               // 24h HH:MM
  "title": "Senso-ji Temple",
  "description": "Tokyo's oldest temple.",
  "address": "2 Chome-3-1 Asakusa, Taito",       // optional
  "lat": 35.7148, "lng": 139.7967,
  "category": "temple",                          // see categories below
  "bookingUrl": "https://...",                   // optional
  "costPerPerson": 500, "currency": "JPY",       // optional
  "soloOnly": true,                              // filtered by toggle
  "noNavigate": true,                            // hides "Open in Maps"
  "photoUrl": "https://...",                    // optional
  "status": "confirmed",                         // confirmed | tentative (default) | idea
  "lockReason": "Reservation 7pm",              // optional, shown under confirmed activities
  "kind": "free-time",                           // event (default) | free-time (no map pin, no destination)
  "routeToNext": {                               // optional, pre-computed
    "format": "polyline",
    "data": "encoded_polyline_string",
    "durationMin": 8,
    "distanceM": 600,
    "mode": "walk"
  }
}
```

### Status field

- **`confirmed`** — locked in (reservation, ticket purchased). Solid vermillion left-border + 🔒 badge.
- **`tentative`** *(default)* — penciled in, open to swapping. No badge.
- **`idea`** — collected as inspo, not committed. Dashed border + italic.

### Free-time blocks

Set `"kind": "free-time"` to render an intentional gap in the day timeline. No map pin, no Open-in-Maps button. Useful for "improvise" afternoons or rest blocks.

```jsonc
{ "id": "d5-rest", "time": "14:00", "title": "Lazy lake afternoon",
  "kind": "free-time", "category": "experience", "lat": 0, "lng": 0 }
```

### Categories (each gets its own map icon + color)

`hotel · transit · airport · food · bar · shop · temple · art · nature · experience · walk`

## `checklist[]`

```jsonc
{
  "id": "c1",
  "title": "Kozantei Ubuya · 3 nights (Nov 27–29)",
  "detail": "Direct booking or Relux.",
  "priority": "asap",          // "asap" | "weeks-2" | "closer"
  "deadline": "2025-09-15",    // optional
  "bookingUrl": "https://..."  // optional
}
```

Booked state is persisted in `localStorage` keyed `trip-atlas:{slug}:checklist:{id}` — not stored in the JSON.

## `wishlist[]` (top-level on Trip)

Candidate activities you've gathered as inspo but haven't slotted into a day yet. Each item must have `city`. No `time` required. Surfaced on the trip overview under "Considering," grouped by city. Renders smaller dashed pins on the map.

```jsonc
"wishlist": [
  {
    "id": "wl-tokyo-teamlab",
    "title": "teamLab Planets",
    "description": "Immersive digital art in Toyosu.",
    "address": "6-1-16 Toyosu, Koto-ku",
    "category": "art",
    "city": "Tokyo",                              // must match a meta.cities entry
    "bookingUrl": "https://...",
    "lat": 35.6489, "lng": 139.7906,
    "time": "",                                  // empty for unscheduled
    "status": "idea"
  }
]
```

Add ideas quickly via "Paste reservation" on the trip overview — pick "Stash as idea" and choose the city.

## Pre-computing routes

```bash
npm run precompute-routes -- trips/japan-honeymoon-2025.json
```

Runs OSRM walking-router for every consecutive same-city activity pair within ≤2km, writes `routeToNext` back into the JSON file. Re-run after editing the itinerary.

## Adding a new trip

1. Copy `japan-honeymoon-2025.json` to `your-slug.json`.
2. Wipe content, fill in your data.
3. (Optional) Pre-compute walking routes.
4. `npm run dev` — it'll show up on the landing page.

That's it. No code changes needed.

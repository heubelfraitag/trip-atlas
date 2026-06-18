import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Trip, Activity, Day } from '../types/trip';
import {
  CATEGORY_GLYPH,
  CATEGORY_LABEL,
  TRANSIT_STYLE,
  decodePolyline,
  haversineM,
  googleMapsPlaceUrl,
} from '../lib/maps';
import { getUserIdeas, type UserIdea } from '../lib/storage';
import { dayHue } from '../lib/dayColor';

interface Props {
  trip: Trip;
  /** dayNumber to focus on, or null for full-trip overview. */
  selectedDay: number | null;
  onSelectActivity?: (activity: Activity, day: Day) => void;
  showSolo?: boolean;
  heightClass?: string;
  /** When set, the map flies to this point and opens the matching marker's popup. */
  focusOn?: { lat: number; lng: number; key?: string };
}

const GHOST_OPACITY = 0.1;
const GHOST_LINE_OPACITY = 0.04;

interface MarkerEntry {
  marker: L.Marker;
  kind: 'hotel' | 'airport' | 'activity' | 'intercity-station' | 'wishlist';
  date?: string; // for hotels: any day within [checkIn, checkOut]; for activity/transit: day.date
  hotelRange?: { checkIn: string; checkOut: string };
  dayNumber?: number;
  city?: string;
  point: [number, number];
  status?: 'confirmed' | 'tentative' | 'idea';
}
interface LineEntry {
  line: L.Polyline;
  casing?: L.Polyline;
  baseStyle: L.PolylineOptions;
  kind: 'intercity' | 'day-link';
  date?: string;
  dayNumber?: number;
  endpoints: [[number, number], [number, number]];
}

function buildMarkerIcon(category: string, label: string): L.DivIcon {
  return L.divIcon({
    html: `<div class="atlas-marker ${category}" title="${label}">${
      CATEGORY_GLYPH[category as keyof typeof CATEGORY_GLYPH] ?? '●'
    }</div>`,
    className: 'atlas-marker-wrapper',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function stationDotIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:#1a2238;border:3px solid #f5ede0;box-shadow:0 0 0 1.5px #1a2238;"></div>`,
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** Gradient color: lighter for early legs, darker for late legs within a day. */
function dayLegColor(dayNumber: number, totalDays: number, legIndex: number, totalLegs: number): string {
  const h = dayHue(dayNumber, totalDays);
  const s = 68;
  if (totalLegs <= 1) return `hsl(${h}, ${s}%, 42%)`;
  const LIGHT = 72;
  const DARK = 22;
  const l = Math.round(LIGHT + (DARK - LIGHT) * (legIndex / (totalLegs - 1)));
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function wishlistIcon(category: string, label: string): L.DivIcon {
  // smaller, dashed-border, more transparent than a regular marker
  return L.divIcon({
    html: `<div class="atlas-marker ${category}" title="${label}" style="width:22px;height:22px;font-size:11px;border-style:dashed;opacity:0.85;">${
      CATEGORY_GLYPH[category as keyof typeof CATEGORY_GLYPH] ?? '●'
    }</div>`,
    className: 'atlas-marker-wrapper',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
}

function popupHtml(opts: {
  title: string;
  meta: string;
  description?: string;
  lat: number;
  lng: number;
  photoUrl?: string;
  hideMapsLink?: boolean;
}): string {
  const link = opts.hideMapsLink
    ? ''
    : `<a href="${googleMapsPlaceUrl(opts.lat, opts.lng, opts.title)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;padding:6px 10px;background:#b5391f;color:#f5ede0;border-radius:4px;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">Open in Maps →</a>`;
  const photo = opts.photoUrl
    ? `<img src="${opts.photoUrl}" loading="lazy" style="display:block;width:100%;max-height:120px;object-fit:cover;border-radius:6px;margin-top:6px;" />`
    : '';
  return `
    <div>
      <div class="popup-meta">${opts.meta}</div>
      <div class="popup-title">${opts.title}</div>
      ${photo}
      ${opts.description ? `<div style="margin-top:4px;color:#3a425a;">${opts.description}</div>` : ''}
      ${link}
    </div>
  `;
}

export default function TripMap({
  trip,
  selectedDay,
  onSelectActivity,
  showSolo = true,
  heightClass = 'h-[60vh]',
  focusOn,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);
  const linesRef = useRef<LineEntry[]>([]);
  const [userIdeas, setUserIdeas] = useState<UserIdea[]>(() => getUserIdeas(trip.slug));

  // Re-read user ideas when the page becomes visible or focuses (after Add Idea closes).
  // Dedupe by content so unchanged polls don't trigger a markers rebuild
  // (which would reset opacity state and lose the active-day dim).
  useEffect(() => {
    const refresh = () => {
      const next = getUserIdeas(trip.slug);
      setUserIdeas((prev) =>
        prev.length === next.length &&
        prev.every((p, i) => p.id === next[i].id && p.title === next[i].title)
          ? prev
          : next
      );
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('storage', refresh);
    const t = window.setInterval(refresh, 3000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('storage', refresh);
      window.clearInterval(t);
    };
  }, [trip.slug]);

  const selectedDayObj = useMemo(
    () => (selectedDay == null ? null : trip.days.find((d) => d.dayNumber === selectedDay) ?? null),
    [trip, selectedDay]
  );

  // init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      // Canvas renderer is much faster for many polylines
      preferCanvas: true,
    });

    const lightTiles = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    const darkTiles = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const tileLayer = L.tileLayer(
      document.documentElement.classList.contains('dark') ? darkTiles : lightTiles,
      {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }
    ).addTo(map);
    // Swap tiles when the theme class on <html> changes
    const themeObserver = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      tileLayer.setUrl(isDark ? darkTiles : lightTiles);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      themeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      markersRef.current = [];
      linesRef.current = [];
    };
  }, []);

  // BUILD layer — only when trip data or solo filter changes (rare).
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markersRef.current = [];
    linesRef.current = [];

    const renderer = L.canvas({ padding: 0.5 });

    // Hotels
    trip.hotels.forEach((h) => {
      const marker = L.marker([h.lat, h.lng], { icon: buildMarkerIcon('hotel', h.name) });
      marker
        .bindPopup(
          popupHtml({
            title: h.name,
            meta: `Hotel · ${h.checkIn} → ${h.checkOut}${h.neighborhood ? ' · ' + h.neighborhood : ''}`,
            description: h.notes,
            lat: h.lat,
            lng: h.lng,
          })
        )
        .addTo(layer);
      markersRef.current.push({
        marker,
        kind: 'hotel',
        hotelRange: { checkIn: h.checkIn, checkOut: h.checkOut },
        point: [h.lat, h.lng],
      });
    });

    // Airports
    trip.airports.forEach((a) => {
      const marker = L.marker([a.lat, a.lng], { icon: buildMarkerIcon('airport', a.name) });
      marker
        .bindPopup(
          popupHtml({
            title: `${a.name} (${a.code})`,
            meta: `${a.role === 'arrival' ? 'Arrival' : 'Departure'} · ${a.datetime}`,
            lat: a.lat,
            lng: a.lng,
          })
        )
        .addTo(layer);
      markersRef.current.push({
        marker,
        kind: 'airport',
        date: a.datetime.slice(0, 10),
        point: [a.lat, a.lng],
      });
    });

    // Intercity transit
    trip.intercityTransit.forEach((t) => {
      const style = TRANSIT_STYLE[t.mode];
      const coords: [number, number][] =
        t.routeGeometry && t.routeGeometry.format === 'polyline'
          ? decodePolyline(t.routeGeometry.data as string)
          : t.routeGeometry && t.routeGeometry.format === 'geojson'
          ? (t.routeGeometry.data as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number])
          : [
              [t.fromLat, t.fromLng],
              [t.toLat, t.toLng],
            ];

      const casing = L.polyline(coords, {
        renderer,
        color: '#f5ede0',
        weight: style.weight + 3,
        opacity: 0.7,
      }).addTo(layer);

      const line = L.polyline(coords, { renderer, ...style }).addTo(layer);

      linesRef.current.push({
        line,
        casing,
        baseStyle: style,
        kind: 'intercity',
        date: t.date,
        endpoints: [
          [t.fromLat, t.fromLng],
          [t.toLat, t.toLng],
        ],
      });

      [
        [t.fromLat, t.fromLng] as [number, number],
        [t.toLat, t.toLng] as [number, number],
      ].forEach((p) => {
        const marker = L.marker(p, { icon: stationDotIcon() });
        marker
          .bindPopup(
            popupHtml({
              title: t.line || `${t.from} → ${t.to}`,
              meta: `${t.mode.replace('-', ' ')} · ${t.durationMin ?? '?'} min`,
              lat: p[0],
              lng: p[1],
            })
          )
          .addTo(layer);
        markersRef.current.push({
          marker,
          kind: 'intercity-station',
          date: t.date,
          point: p,
        });
      });
    });

    // Pre-build a set of intercity-covered legs keyed by date+coords so we
    // don't double-draw day-link lines on top of intercity rail polylines.
    const intercityCovered = new Set<string>();
    const coordKey = (lat: number, lng: number) => `${lat.toFixed(3)},${lng.toFixed(3)}`;
    for (const t of trip.intercityTransit ?? []) {
      const a = coordKey(t.fromLat, t.fromLng);
      const b = coordKey(t.toLat, t.toLng);
      intercityCovered.add(`${t.date}|${a}|${b}`);
      intercityCovered.add(`${t.date}|${b}|${a}`);
    }

    // Helpers for finding the day's start/end hotel.
    // - Start hotel: the one you're CHECKING OUT of today (checkOut == date).
    // - End hotel: the one you're CHECKING IN to today (checkIn == date).
    // - Otherwise the hotel that covers this date is both start and end.
    // Hotel where you slept LAST night (morning starts here).
    function findStartHotel(dayDate: string) {
      return trip.hotels.find((h) => h.checkIn < dayDate && dayDate <= h.checkOut);
    }
    // Hotel where you sleep TONIGHT (evening ends here).
    function findEndHotel(dayDate: string) {
      return trip.hotels.find((h) => h.checkIn <= dayDate && dayDate < h.checkOut);
    }
    function sameSpot(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
      return Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lng - b.lng) < 1e-4;
    }

    function chooseStyle(distM: number) {
      return distM <= 1500 ? TRANSIT_STYLE.walk : TRANSIT_STYLE.subway;
    }

    // Day-level activities + per-day links
    const totalDays = trip.days.length;
    trip.days.forEach((day) => {
      const acts = day.activities.filter((a) => showSolo || !a.soloOnly);
      if (acts.length === 0) return;

      const startHotel = findStartHotel(day.date);
      const endHotel = findEndHotel(day.date);
      const firstAct = acts[0];
      const lastAct = acts[acts.length - 1];
      // Draw the hotel leg whenever there's a precomputed route (it's a real
      // road-following polyline, no length limit needed). Without a precomputed
      // route, fall back to a straight line only if the leg is ≤ 100km —
      // longer than that is intercity territory covered by the Shinkansen
      // polyline and drawing a straight diagonal would just add noise.
      const HOTEL_LEG_MAX_M = 100_000;
      const startDistM = startHotel
        ? haversineM([startHotel.lat, startHotel.lng], [firstAct.lat, firstAct.lng])
        : 0;
      const endDistM = endHotel
        ? haversineM([lastAct.lat, lastAct.lng], [endHotel.lat, endHotel.lng])
        : 0;
      const drawStartLeg =
        !!startHotel &&
        !sameSpot(startHotel, firstAct) &&
        (day.routeFromHotel != null || startDistM <= HOTEL_LEG_MAX_M);
      const drawEndLeg =
        !!endHotel &&
        !sameSpot(endHotel, lastAct) &&
        (day.routeToHotel != null || endDistM <= HOTEL_LEG_MAX_M);

      // Total legs = N-1 between consecutive activities + optional hotel-start + optional hotel-end
      const legCount = acts.length - 1 + (drawStartLeg ? 1 : 0) + (drawEndLeg ? 1 : 0);
      let legIndex = 0;

      // Draw hotel → first activity (morning departure)
      if (drawStartLeg && startHotel) {
        const a: [number, number] = [startHotel.lat, startHotel.lng];
        const b: [number, number] = [firstAct.lat, firstAct.lng];
        let coords: [number, number][];
        let baseStyle;
        if (day.routeFromHotel) {
          const r = day.routeFromHotel;
          baseStyle = TRANSIT_STYLE[r.mode];
          coords =
            r.format === 'polyline'
              ? decodePolyline(r.data as string)
              : (r.data as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]);
        } else {
          baseStyle = chooseStyle(haversineM(a, b));
          coords = [a, b];
        }
        const gradientColor = dayLegColor(day.dayNumber, totalDays, legIndex, legCount);
        const styleWithGradient = { ...baseStyle, color: gradientColor, weight: 4 };
        const line = L.polyline(coords, { renderer, ...styleWithGradient }).addTo(layer);
        linesRef.current.push({
          line,
          baseStyle: styleWithGradient,
          kind: 'day-link',
          dayNumber: day.dayNumber,
          date: day.date,
          endpoints: [a, b],
        });
        legIndex++;
      }

      acts.forEach((act, i) => {
        // free-time blocks don't get a map pin
        if (act.kind === 'free-time') return;
        const marker = L.marker([act.lat, act.lng], {
          icon: buildMarkerIcon(act.category, act.title),
        });
        const statusLabel = act.status === 'confirmed' ? ' · 🔒 locked' : act.status === 'idea' ? ' · 💭 idea' : '';
        marker
          .bindPopup(
            popupHtml({
              title: act.title,
              meta: `Day ${day.dayNumber} · ${act.time} · ${CATEGORY_LABEL[act.category]}${statusLabel}`,
              description: act.description,
              lat: act.lat,
              lng: act.lng,
              photoUrl: act.photoUrl,
              hideMapsLink: act.noNavigate,
            })
          )
          .on('click', () => onSelectActivity?.(act, day));
        marker.addTo(layer);
        markersRef.current.push({
          marker,
          kind: 'activity',
          dayNumber: day.dayNumber,
          date: day.date,
          point: [act.lat, act.lng],
          status: act.status,
        });

        const next = acts[i + 1];
        if (!next) return;
        const a: [number, number] = [act.lat, act.lng];
        const b: [number, number] = [next.lat, next.lng];
        if (a[0] === b[0] && a[1] === b[1]) return;

        // Skip drawing if an intercityTransit line already covers this segment
        const pairKey = `${day.date}|${coordKey(a[0], a[1])}|${coordKey(b[0], b[1])}`;
        if (intercityCovered.has(pairKey)) {
          legIndex++;
          return;
        }

        const distM = haversineM(a, b);

        let coords: [number, number][];
        let baseStyle = TRANSIT_STYLE.walk;
        if (act.routeToNext) {
          const r = act.routeToNext;
          baseStyle = TRANSIT_STYLE[r.mode];
          coords =
            r.format === 'polyline'
              ? decodePolyline(r.data as string)
              : (r.data as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]);
        } else if (distM <= 1500) {
          baseStyle = TRANSIT_STYLE.walk;
          coords = [a, b];
        } else {
          baseStyle = TRANSIT_STYLE.subway;
          coords = [a, b];
        }

        // Per-day color gradient: each day has a unique hue, leg 0 lightest, last leg darkest.
        // Normalize weight so the gradient is the dominant visual cue;
        // keep dashArray from baseStyle to preserve walk-vs-transit distinction.
        const gradientColor = dayLegColor(day.dayNumber, totalDays, legIndex, legCount);
        const styleWithGradient = { ...baseStyle, color: gradientColor, weight: 4 };

        const line = L.polyline(coords, { renderer, ...styleWithGradient }).addTo(layer);
        linesRef.current.push({
          line,
          baseStyle: styleWithGradient,
          kind: 'day-link',
          dayNumber: day.dayNumber,
          date: day.date,
          endpoints: [a, b],
        });
        legIndex++;
      });

      // Draw last activity → hotel (evening return)
      if (drawEndLeg && endHotel) {
        const a: [number, number] = [lastAct.lat, lastAct.lng];
        const b: [number, number] = [endHotel.lat, endHotel.lng];
        let coords: [number, number][];
        let baseStyle;
        if (day.routeToHotel) {
          const r = day.routeToHotel;
          baseStyle = TRANSIT_STYLE[r.mode];
          coords =
            r.format === 'polyline'
              ? decodePolyline(r.data as string)
              : (r.data as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]);
        } else {
          baseStyle = chooseStyle(haversineM(a, b));
          coords = [a, b];
        }
        const gradientColor = dayLegColor(day.dayNumber, totalDays, legIndex, legCount);
        const styleWithGradient = { ...baseStyle, color: gradientColor, weight: 4 };
        const line = L.polyline(coords, { renderer, ...styleWithGradient }).addTo(layer);
        linesRef.current.push({
          line,
          baseStyle: styleWithGradient,
          kind: 'day-link',
          dayNumber: day.dayNumber,
          date: day.date,
          endpoints: [a, b],
        });
        legIndex++;
      }
    });

    // Wishlist (JSON) — candidate ideas not yet scheduled. Smaller, dashed pins.
    (trip.wishlist ?? []).forEach((w) => {
      const marker = L.marker([w.lat, w.lng], {
        icon: wishlistIcon(w.category, w.title),
        opacity: 0.85,
      });
      marker.bindPopup(
        popupHtml({
          title: w.title,
          meta: `💭 Idea${w.city ? ' · ' + w.city : ''} · ${CATEGORY_LABEL[w.category]}`,
          description: w.description,
          lat: w.lat,
          lng: w.lng,
          photoUrl: w.photoUrl,
          hideMapsLink: w.noNavigate,
        })
      );
      marker.addTo(layer);
      markersRef.current.push({
        marker,
        kind: 'wishlist',
        city: w.city,
        point: [w.lat, w.lng],
        status: 'idea',
      });
    });

    // User ideas from localStorage (only those with coords)
    for (const ui of userIdeas) {
      if (ui.lat == null || ui.lng == null) continue;
      const marker = L.marker([ui.lat, ui.lng], {
        icon: wishlistIcon(ui.category, ui.title),
        opacity: 0.85,
      });
      marker.bindPopup(
        popupHtml({
          title: ui.title,
          meta: `💭 Your idea${ui.city ? ' · ' + ui.city : ''} · ${CATEGORY_LABEL[ui.category]}`,
          description: ui.description,
          lat: ui.lat,
          lng: ui.lng,
          hideMapsLink: false,
        })
      );
      marker.addTo(layer);
      markersRef.current.push({
        marker,
        kind: 'wishlist',
        city: ui.city,
        point: [ui.lat, ui.lng],
        status: 'idea',
      });
    }
  }, [trip, showSolo, onSelectActivity, userIdeas]);

  // APPLY selection — only opacity changes + flyToBounds. Cheap & smooth.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const isOverview = selectedDay == null;
    const selDate = selectedDayObj?.date;

    function isHotelActive(range?: { checkIn: string; checkOut: string }): boolean {
      if (isOverview || !range || !selDate) return isOverview;
      return selDate >= range.checkIn && selDate <= range.checkOut;
    }

    const focusPoints: L.LatLngExpression[] = [];
    const allPoints: L.LatLngExpression[] = [];

    // Markers
    for (const m of markersRef.current) {
      let active = isOverview;
      if (!isOverview) {
        if (m.kind === 'activity') active = m.dayNumber === selectedDay;
        else if (m.kind === 'hotel') active = isHotelActive(m.hotelRange);
        else if (m.kind === 'airport' || m.kind === 'intercity-station')
          active = !!selDate && m.date === selDate;
        else if (m.kind === 'wishlist') {
          // dim wishlist on day view, but if it's for the same city, slightly less
          active = false;
        }
      }
      // Wishlist always dimmer than 1.0 even in overview — they're "maybe"
      const baseOpacity = m.kind === 'wishlist' ? (isOverview ? 0.75 : GHOST_OPACITY) : 1.0;
      m.marker.setOpacity(active ? baseOpacity : GHOST_OPACITY);
      allPoints.push(m.point);
      if (active && m.kind !== 'wishlist') focusPoints.push(m.point);
    }

    // Polylines
    for (const e of linesRef.current) {
      let active = isOverview;
      if (!isOverview) {
        if (e.kind === 'intercity') active = !!selDate && e.date === selDate;
        else if (e.kind === 'day-link') active = e.dayNumber === selectedDay;
      }
      const targetOpacity = active ? (e.baseStyle.opacity ?? 0.85) : GHOST_LINE_OPACITY;
      e.line.setStyle({ opacity: targetOpacity });
      if (e.casing) e.casing.setStyle({ opacity: active ? 0.7 : 0 });
    }

    // Choose zoom target
    const targetPoints = focusPoints.length ? focusPoints : allPoints;
    let hasView = false;
    try {
      map.getCenter();
      hasView = true;
    } catch {
      hasView = false;
    }

    // Defer flyTo to the next frame so the opacity DOM commits first.
    requestAnimationFrame(() => {
      if (!mapRef.current) return;
      if (targetPoints.length === 1) {
        mapRef.current.setView(targetPoints[0] as L.LatLngExpression, 14, { animate: hasView });
      } else if (targetPoints.length > 1) {
        const bounds = L.latLngBounds(targetPoints);
        const opts = {
          padding: [40, 40] as [number, number],
          maxZoom: isOverview ? 9 : 14,
        };
        if (hasView) {
          mapRef.current.flyToBounds(bounds, { ...opts, duration: 0.45, easeLinearity: 0.4 });
        } else {
          mapRef.current.fitBounds(bounds, opts);
        }
      }
    });
  }, [selectedDay, selectedDayObj]);

  // Focus: fly to point + open the matching marker's popup
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusOn) return;
    let hasView = false;
    try {
      map.getCenter();
      hasView = true;
    } catch {
      /* no center yet */
    }
    if (hasView) {
      map.flyTo([focusOn.lat, focusOn.lng], 16, { duration: 0.5 });
    } else {
      map.setView([focusOn.lat, focusOn.lng], 16);
    }
    // Find the matching marker (closest by coords)
    for (const m of markersRef.current) {
      if (
        Math.abs(m.point[0] - focusOn.lat) < 1e-4 &&
        Math.abs(m.point[1] - focusOn.lng) < 1e-4
      ) {
        m.marker.openPopup();
        return;
      }
    }
  }, [focusOn?.lat, focusOn?.lng, focusOn?.key]);

  return (
    <div className={`${heightClass} w-full rounded-2xl overflow-hidden shadow-card border border-line`}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

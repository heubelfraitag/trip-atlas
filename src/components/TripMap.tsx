import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Trip, Activity, Hotel, IntercityTransit, Day } from '../types/trip';
import {
  CATEGORY_GLYPH,
  CATEGORY_LABEL,
  TRANSIT_STYLE,
  decodePolyline,
  haversineM,
  googleMapsDirUrl,
} from '../lib/maps';

interface Props {
  trip: Trip;
  /** dayNumber to focus on, or null for full-trip overview. */
  selectedDay: number | null;
  onSelectActivity?: (activity: Activity, day: Day) => void;
  showSolo?: boolean;
  heightClass?: string;
}

const GHOST_OPACITY = 0.25;
const GHOST_LINE_OPACITY = 0.12;

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

function popupHtml(opts: {
  title: string;
  meta: string;
  description?: string;
  lat: number;
  lng: number;
  hideMapsLink?: boolean;
}): string {
  const link = opts.hideMapsLink
    ? ''
    : `<a href="${googleMapsDirUrl(opts.lat, opts.lng, 'transit', opts.title)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;padding:6px 10px;background:#b5391f;color:#f5ede0;border-radius:4px;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">Open in Maps →</a>`;
  return `
    <div>
      <div class="popup-meta">${opts.meta}</div>
      <div class="popup-title">${opts.title}</div>
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
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

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
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // re-render markers + paths
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const focusPoints: L.LatLngExpression[] = [];
    const allPoints: L.LatLngExpression[] = [];
    const isOverview = selectedDay == null;
    const selDate = selectedDayObj?.date;

    function isHotelActiveForSelectedDay(h: Hotel): boolean {
      if (isOverview) return true;
      if (!selDate) return true;
      return selDate >= h.checkIn && selDate <= h.checkOut;
    }
    function isAirportActiveForSelectedDay(date: string): boolean {
      if (isOverview) return true;
      return !!selDate && date.startsWith(selDate);
    }
    function isIntercityActiveForSelectedDay(t: IntercityTransit): boolean {
      if (isOverview) return true;
      return t.date === selDate;
    }

    // Hotels
    trip.hotels.forEach((h) => {
      const active = isHotelActiveForSelectedDay(h);
      L.marker([h.lat, h.lng], {
        icon: buildMarkerIcon('hotel', h.name),
        opacity: active ? 1.0 : GHOST_OPACITY,
        interactive: true,
      })
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
      allPoints.push([h.lat, h.lng]);
      if (active) focusPoints.push([h.lat, h.lng]);
    });

    // Airports
    trip.airports.forEach((a) => {
      const active = isAirportActiveForSelectedDay(a.datetime);
      L.marker([a.lat, a.lng], {
        icon: buildMarkerIcon('airport', a.name),
        opacity: active ? 1.0 : GHOST_OPACITY,
      })
        .bindPopup(
          popupHtml({
            title: `${a.name} (${a.code})`,
            meta: `${a.role === 'arrival' ? 'Arrival' : 'Departure'} · ${a.datetime}`,
            lat: a.lat,
            lng: a.lng,
          })
        )
        .addTo(layer);
      allPoints.push([a.lat, a.lng]);
      if (active) focusPoints.push([a.lat, a.lng]);
    });

    // Intercity transit
    trip.intercityTransit.forEach((t) => {
      const active = isIntercityActiveForSelectedDay(t);
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

      if (active) {
        // casing for legibility
        L.polyline(coords, {
          color: '#f5ede0',
          weight: style.weight + 3,
          opacity: 0.7,
        }).addTo(layer);
      }
      L.polyline(coords, {
        ...style,
        opacity: active ? style.opacity : GHOST_LINE_OPACITY,
      }).addTo(layer);

      [
        [t.fromLat, t.fromLng] as [number, number],
        [t.toLat, t.toLng] as [number, number],
      ].forEach((p) => {
        L.marker(p, { icon: stationDotIcon(), opacity: active ? 1.0 : GHOST_OPACITY })
          .bindPopup(
            popupHtml({
              title: t.line || `${t.from} → ${t.to}`,
              meta: `${t.mode.replace('-', ' ')} · ${t.durationMin ?? '?'} min`,
              lat: p[0],
              lng: p[1],
            })
          )
          .addTo(layer);
      });
      if (active) {
        focusPoints.push([t.fromLat, t.fromLng], [t.toLat, t.toLng]);
      }
    });

    // Day-level activities + per-day links — render ALL days, ghost the inactive ones
    trip.days.forEach((day) => {
      const dayActive = isOverview || day.dayNumber === selectedDay;
      const acts = day.activities.filter((a) => showSolo || !a.soloOnly);

      acts.forEach((act, i) => {
        const marker = L.marker([act.lat, act.lng], {
          icon: buildMarkerIcon(act.category, act.title),
          opacity: dayActive ? 1.0 : GHOST_OPACITY,
        });
        marker
          .bindPopup(
            popupHtml({
              title: act.title,
              meta: `Day ${day.dayNumber} · ${act.time} · ${CATEGORY_LABEL[act.category]}`,
              description: act.description,
              lat: act.lat,
              lng: act.lng,
              hideMapsLink: act.noNavigate,
            })
          )
          .on('click', () => onSelectActivity?.(act, day));
        marker.addTo(layer);
        allPoints.push([act.lat, act.lng]);
        if (dayActive) focusPoints.push([act.lat, act.lng]);

        // route to next stop
        const next = acts[i + 1];
        if (!next) return;
        const a: [number, number] = [act.lat, act.lng];
        const b: [number, number] = [next.lat, next.lng];
        if (a[0] === b[0] && a[1] === b[1]) return;
        const distM = haversineM(a, b);

        let coords: [number, number][];
        let style = TRANSIT_STYLE.walk;
        if (act.routeToNext) {
          const r = act.routeToNext;
          style = TRANSIT_STYLE[r.mode];
          coords =
            r.format === 'polyline'
              ? decodePolyline(r.data as string)
              : (r.data as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]);
        } else if (distM <= 1500) {
          style = TRANSIT_STYLE.walk;
          coords = [a, b];
        } else {
          style = TRANSIT_STYLE.subway;
          coords = [a, b];
        }
        L.polyline(coords, {
          ...style,
          opacity: dayActive ? style.opacity : GHOST_LINE_OPACITY,
        }).addTo(layer);
      });
    });

    // Choose zoom target
    const targetPoints = focusPoints.length ? focusPoints : allPoints;
    if (targetPoints.length === 1) {
      map.setView(targetPoints[0] as L.LatLngExpression, 14, { animate: true });
    } else if (targetPoints.length > 1) {
      const bounds = L.latLngBounds(targetPoints);
      map.flyToBounds(bounds, {
        padding: [50, 50],
        maxZoom: isOverview ? 9 : 15,
        duration: 0.6,
      });
    }
  }, [trip, selectedDay, selectedDayObj, showSolo, onSelectActivity]);

  return (
    <div className={`${heightClass} w-full rounded-2xl overflow-hidden shadow-card border border-line`}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

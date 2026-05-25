import { useEffect, useState } from 'react';
import type { Category, Trip } from '../types/trip';
import { CATEGORY_LABEL } from '../lib/maps';
import { newIdeaId, saveUserIdea, type UserIdea } from '../lib/storage';
import { extractCoordsFromUrl } from '../lib/extractCoords';

interface Props {
  trip: Trip;
  open: boolean;
  /** If set, edit this existing idea instead of creating a new one. */
  initial?: UserIdea | null;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES: Category[] = [
  'food',
  'bar',
  'shop',
  'temple',
  'art',
  'nature',
  'experience',
  'walk',
  'hotel',
  'transit',
  'airport',
];

export default function AddIdeaModal({ trip, open, initial, onClose, onSaved }: Props) {
  const [city, setCity] = useState(trip.meta.cities[0] ?? '');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('food');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [link, setLink] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [coordsHint, setCoordsHint] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setCity(initial.city);
      setTitle(initial.title);
      setCategory(initial.category);
      setDescription(initial.description ?? '');
      setAddress(initial.address ?? '');
      setLink(initial.link ?? '');
      setLat(initial.lat != null ? String(initial.lat) : '');
      setLng(initial.lng != null ? String(initial.lng) : '');
    } else {
      setCity(trip.meta.cities[0] ?? '');
      setTitle('');
      setCategory('food');
      setDescription('');
      setAddress('');
      setLink('');
      setLat('');
      setLng('');
    }
    setCoordsHint('');
  }, [open, initial, trip.meta.cities]);

  function handleLinkChange(v: string) {
    setLink(v);
    const coords = extractCoordsFromUrl(v);
    if (coords) {
      setLat(String(coords.lat));
      setLng(String(coords.lng));
      setCoordsHint('✓ extracted coords from link');
    } else if (v.includes('maps.app.goo.gl')) {
      setCoordsHint('Short Google Maps link — open it and copy the full URL for auto-coords.');
    } else {
      setCoordsHint('');
    }
  }

  function handleSave() {
    if (!title.trim() || !city) return;
    const idea: UserIdea = {
      id: initial?.id ?? newIdeaId(),
      city,
      title: title.trim(),
      category,
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      link: link.trim() || undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    saveUserIdea(trip.slug, idea);
    onSaved();
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2500] bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-paper rounded-2xl shadow-card border border-line overflow-hidden flex flex-col max-h-[90vh]"
      >
        <header className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">
            {initial ? 'Edit idea' : 'Add an idea'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-faint hover:text-ink text-xl px-2">
            ×
          </button>
        </header>

        <div className="p-5 overflow-y-auto space-y-3">
          <Field label="City">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full text-sm rounded-md bg-paper-soft border border-line px-2 py-1.5 focus:border-vermillion focus:outline-none"
            >
              {trip.meta.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Title *">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. teamLab Planets, Beard ramen, Inokashira Park"
              className="w-full text-sm rounded-md bg-paper-soft border border-line px-2 py-1.5 focus:border-vermillion focus:outline-none"
            />
          </Field>

          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full text-sm rounded-md bg-paper-soft border border-line px-2 py-1.5 focus:border-vermillion focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Why you want to go — friend's rec, what to order…"
              className="w-full text-sm rounded-md bg-paper-soft border border-line px-2 py-1.5 focus:border-vermillion focus:outline-none resize-y"
            />
          </Field>

          <Field label="Link (optional)">
            <input
              value={link}
              onChange={(e) => handleLinkChange(e.target.value)}
              placeholder="Paste a Google Maps / Reddit / blog URL"
              className="w-full text-sm rounded-md bg-paper-soft border border-line px-2 py-1.5 focus:border-vermillion focus:outline-none"
            />
            {coordsHint && (
              <p className="text-[11px] text-ink-faint italic mt-1">{coordsHint}</p>
            )}
          </Field>

          <Field label="Address (optional)">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, neighborhood, city"
              className="w-full text-sm rounded-md bg-paper-soft border border-line px-2 py-1.5 focus:border-vermillion focus:outline-none"
            />
          </Field>

          <details className="text-xs text-ink-faint">
            <summary className="cursor-pointer select-none">
              Coordinates {lat && lng ? `· ${lat},${lng}` : "· not set (won't pin on map)"}
            </summary>
            <div className="flex gap-2 mt-2">
              <input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="lat"
                className="flex-1 text-sm rounded-md bg-paper-soft border border-line px-2 py-1.5 focus:border-vermillion focus:outline-none"
              />
              <input
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="lng"
                className="flex-1 text-sm rounded-md bg-paper-soft border border-line px-2 py-1.5 focus:border-vermillion focus:outline-none"
              />
            </div>
            <p className="mt-1">
              Tip: paste a Google Maps URL in the Link field above and we'll auto-fill these. Or
              tap the location in Google Maps → "Share" → "Copy link" → paste here.
            </p>
          </details>
        </div>

        <footer className="px-5 py-3 border-t border-line flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-xs text-ink-faint hover:text-vermillion px-3 py-1.5">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="rounded-md bg-vermillion text-paper px-3 py-1.5 text-xs font-semibold tracking-wider uppercase disabled:opacity-40 hover:bg-vermillion-soft"
          >
            {initial ? 'Save changes' : 'Add idea'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] tracking-wider uppercase font-semibold text-ink-faint mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

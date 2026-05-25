import { useEffect, useState } from 'react';
import { dirUrlFor, type MapsApp } from '../lib/maps';
import { getMapsAppPreference, setMapsAppPreference } from '../lib/storage';

interface Props {
  lat: number;
  lng: number;
  name?: string;
  mode?: 'transit' | 'walking' | 'driving';
  label?: string;
  size?: 'sm' | 'md';
}

export default function OpenInMapsButton({
  lat,
  lng,
  name,
  mode = 'transit',
  label = 'Open in Maps',
  size = 'sm',
}: Props) {
  const [app, setApp] = useState<MapsApp>('google');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setApp(getMapsAppPreference());
  }, []);

  function choose(next: MapsApp) {
    setMapsAppPreference(next);
    setApp(next);
    setOpen(false);
    window.open(dirUrlFor(next, lat, lng, mode, name), '_blank', 'noopener,noreferrer');
  }

  const url = dirUrlFor(app, lat, lng, mode, name);
  const sz = size === 'md' ? 'px-3 py-2 text-xs' : 'px-2.5 py-1.5 text-[11px]';

  return (
    <span className="relative inline-flex">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 rounded-l-md bg-vermillion text-paper ${sz} font-semibold tracking-wider uppercase no-underline hover:bg-vermillion-soft transition-colors`}
      >
        <span aria-hidden>↗</span>
        {label}
      </a>
      <button
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        aria-label="Choose maps app"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center justify-center rounded-r-md bg-vermillion text-paper px-1.5 ${
          size === 'md' ? 'py-2' : 'py-1.5'
        } border-l border-paper/30 hover:bg-vermillion-soft transition-colors`}
      >
        <span className="text-[10px]" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <span
          role="menu"
          className="absolute right-0 top-full mt-1 z-[1500] min-w-[140px] bg-paper border border-line rounded-md shadow-card overflow-hidden"
        >
          <button
            role="menuitemradio"
            aria-checked={app === 'google'}
            onClick={() => choose('google')}
            className={`block w-full text-left px-3 py-2 text-xs hover:bg-paper-soft ${
              app === 'google' ? 'text-vermillion font-semibold' : 'text-ink-soft'
            }`}
          >
            {app === 'google' ? '✓ ' : ''}Google Maps
          </button>
          <button
            role="menuitemradio"
            aria-checked={app === 'apple'}
            onClick={() => choose('apple')}
            className={`block w-full text-left px-3 py-2 text-xs hover:bg-paper-soft ${
              app === 'apple' ? 'text-vermillion font-semibold' : 'text-ink-soft'
            }`}
          >
            {app === 'apple' ? '✓ ' : ''}Apple Maps
          </button>
        </span>
      )}
    </span>
  );
}

import { useState } from 'react';
import { cityColor } from '../lib/maps';

interface Props {
  city: string;
  tldr?: string;
  tips?: string[];
}

export default function CityNoteCard({ city, tldr, tips }: Props) {
  const [open, setOpen] = useState(false);
  if (!tldr && (!tips || tips.length === 0)) return null;
  const color = cityColor(city);

  return (
    <div
      className="my-3 rounded-xl border border-line bg-paper-soft overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-widest uppercase font-semibold" style={{ color }}>
            {city} · what to know
          </span>
        </div>
        <span className="text-ink-faint text-xs">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 text-sm text-ink-soft">
          {tldr && <p className="mb-2 leading-snug">{tldr}</p>}
          {tips && tips.length > 0 && (
            <ul className="space-y-1">
              {tips.map((tip, i) => (
                <li key={i} className="flex gap-2 leading-snug">
                  <span className="text-vermillion shrink-0" aria-hidden>
                    ·
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

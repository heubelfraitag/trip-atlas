import { googleMapsDirUrl } from '../lib/maps';

interface Props {
  lat: number;
  lng: number;
  name?: string;
  mode?: 'transit' | 'walking' | 'driving';
  label?: string;
  size?: 'sm' | 'md';
}

export default function OpenInMapsButton({ lat, lng, name, mode = 'transit', label = 'Open in Maps', size = 'sm' }: Props) {
  const url = googleMapsDirUrl(lat, lng, mode, name);
  const sz = size === 'md' ? 'px-3 py-2 text-xs' : 'px-2.5 py-1.5 text-[11px]';
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-md bg-vermillion text-paper ${sz} font-semibold tracking-wider uppercase no-underline hover:bg-vermillion-soft transition-colors`}
    >
      <span aria-hidden>↗</span>
      {label}
    </a>
  );
}

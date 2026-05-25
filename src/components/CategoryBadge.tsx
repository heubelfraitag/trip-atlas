import type { Category } from '../types/trip';
import { CATEGORY_COLOR, CATEGORY_GLYPH, CATEGORY_LABEL } from '../lib/maps';

interface Props {
  category: Category;
  size?: 'sm' | 'md';
}

export default function CategoryBadge({ category, size = 'sm' }: Props) {
  const color = CATEGORY_COLOR[category];
  const isMd = size === 'md';
  return (
    <span
      className={`inline-flex items-center gap-1 ${isMd ? 'text-xs px-2 py-1' : 'text-[10px] px-1.5 py-0.5'} rounded-full font-medium tracking-wider uppercase`}
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span aria-hidden style={{ color }}>
        {CATEGORY_GLYPH[category]}
      </span>
      {CATEGORY_LABEL[category]}
    </span>
  );
}

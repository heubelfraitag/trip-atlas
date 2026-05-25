import type { Activity } from '../types/trip';
import CategoryBadge from './CategoryBadge';
import OpenInMapsButton from './OpenInMapsButton';
import { formatCurrency, formatTime12 } from '../lib/format';

interface Props {
  activity: Activity;
  isLast?: boolean;
  currency: string;
}

export default function ActivityCard({ activity, isLast, currency }: Props) {
  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center pt-1 shrink-0">
        <div className="font-display text-vermillion font-semibold text-sm tabular-nums">
          {formatTime12(activity.time)}
        </div>
        <div className="mt-1 w-3 h-3 rounded-full bg-vermillion ring-4 ring-paper-soft" />
        {!isLast && <div className="flex-1 w-px bg-line-strong mt-1" style={{ minHeight: 32 }} />}
      </div>

      <div className="flex-1 pb-6">
        <div className="flex items-start gap-3 flex-wrap">
          <h3 className="font-display text-lg sm:text-xl text-ink leading-snug">
            {activity.title}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            <CategoryBadge category={activity.category} />
            {activity.soloOnly && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium tracking-wider uppercase bg-ink/10 text-ink-soft">
                Solo
              </span>
            )}
          </div>
        </div>
        {activity.description && (
          <p className="mt-1 text-sm text-ink-soft leading-relaxed">{activity.description}</p>
        )}
        {activity.address && (
          <p className="mt-1 text-xs text-ink-faint">{activity.address}</p>
        )}
        {typeof activity.costPerPerson === 'number' && (
          <p className="mt-1 text-xs text-ink-faint">
            ~{formatCurrency(activity.costPerPerson, activity.currency ?? currency)} pp
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {!activity.noNavigate && (
            <OpenInMapsButton lat={activity.lat} lng={activity.lng} name={activity.title} />
          )}
          {activity.bookingUrl && (
            <a
              href={activity.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-paper-deep text-ink px-2.5 py-1.5 text-[11px] font-semibold tracking-wider uppercase no-underline hover:bg-gold-soft hover:text-paper transition-colors"
            >
              Book ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

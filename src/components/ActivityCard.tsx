import { useEffect, useState } from 'react';
import type { Activity, ActivityStatus } from '../types/trip';
import CategoryBadge from './CategoryBadge';
import OpenInMapsButton from './OpenInMapsButton';
import ActivityNotes from './ActivityNotes';
import { formatCurrency, formatTime12 } from '../lib/format';
import { isActivityDone, setActivityDone } from '../lib/storage';

interface Props {
  activity: Activity;
  isLast?: boolean;
  currency: string;
  slug: string;
  /** "current"/"next"/"past" classification when viewing during an active trip. */
  liveState?: 'current' | 'next' | 'past' | 'future' | null;
  /** Tap title → focus the map on this activity's pin. */
  onFocusOnMap?: () => void;
  /** OSRM-estimated minutes from this activity to the next. */
  travelMinToNext?: number;
  /** Mode of the next leg — used to label (W) walking vs (T) transit. */
  travelModeToNext?: 'walk' | 'transit';
}

function effectiveStatus(a: Activity): ActivityStatus {
  return a.status ?? 'tentative';
}

const STATUS_LABEL: Record<ActivityStatus, string> = {
  confirmed: 'Locked in',
  tentative: 'Tentative',
  idea: 'Idea',
};

const STATUS_BADGE_CLASS: Record<ActivityStatus, string> = {
  confirmed: 'bg-vermillion text-paper',
  tentative: 'bg-paper-deep text-ink-soft',
  idea: 'bg-ink/10 text-ink-soft italic',
};

export default function ActivityCard({ activity, isLast, currency, slug, liveState, onFocusOnMap, travelMinToNext, travelModeToNext }: Props) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDone(isActivityDone(slug, activity.id));
  }, [slug, activity.id]);

  function toggleDone() {
    const next = !done;
    setActivityDone(slug, activity.id, next);
    setDone(next);
  }

  // Free-time block: simplified rendering, no map, no done toggle
  if (activity.kind === 'free-time') {
    return (
      <div className="relative flex gap-4">
        <div className="flex flex-col items-center pt-1 shrink-0">
          <div className="font-display font-semibold text-sm tabular-nums text-gold">
            {activity.time ? formatTime12(activity.time) : '—'}
          </div>
          <div className="mt-1 w-4 h-4 rounded-full border-2 border-dashed border-gold bg-paper-soft" />
          {!isLast && (
            <div className="flex-1 flex flex-col items-center mt-1" style={{ minHeight: 40 }}>
              <div className="flex-1 w-px bg-line-strong" />
              {travelMinToNext != null && travelMinToNext > 0 && (
                <div className="my-1 text-[10px] tabular-nums text-ink-faint italic whitespace-nowrap">
                  ~{travelMinToNext}m{travelModeToNext === 'walk' ? ' (W)' : travelModeToNext === 'transit' ? ' (T)' : ''}
                </div>
              )}
              <div className="flex-1 w-px bg-line-strong" />
            </div>
          )}
        </div>
        <div className="flex-1 pb-6">
          <div className="rounded-xl border-2 border-dashed border-gold/50 bg-paper-soft/60 px-3 py-2.5">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gold mb-0.5">
              Free time
            </p>
            <h3 className="font-display text-base text-ink leading-snug">
              {activity.title || 'Improvise — explore wherever feels right'}
            </h3>
            {activity.description && (
              <p className="mt-1 text-sm text-ink-soft leading-snug">{activity.description}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const status = effectiveStatus(activity);
  const ringClass =
    liveState === 'current'
      ? 'ring-2 ring-vermillion'
      : liveState === 'next'
      ? 'ring-2 ring-gold'
      : '';
  const containerBorderClass =
    status === 'confirmed'
      ? 'border-l-4 border-l-vermillion pl-2 -ml-2'
      : status === 'idea'
      ? 'border-2 border-dashed border-line-strong rounded-xl p-3 -m-1'
      : '';

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center pt-1 shrink-0">
        <div
          className={`font-display font-semibold text-sm tabular-nums ${
            done ? 'text-ink-faint line-through' : status === 'idea' ? 'text-ink-faint italic' : 'text-vermillion'
          }`}
        >
          {activity.time ? formatTime12(activity.time) : '—'}
        </div>
        <button
          onClick={toggleDone}
          aria-pressed={done}
          aria-label={done ? 'Mark not done' : 'Mark done'}
          className={`mt-1 w-4 h-4 rounded-full transition-colors ring-4 ring-paper-soft ${
            done
              ? 'bg-ink-faint'
              : status === 'idea'
              ? 'bg-paper-deep border-2 border-ink-faint'
              : 'bg-vermillion hover:bg-vermillion-soft'
          }`}
        />
        {!isLast && (
            <div className="flex-1 flex flex-col items-center mt-1" style={{ minHeight: 40 }}>
              <div className="flex-1 w-px bg-line-strong" />
              {travelMinToNext != null && travelMinToNext > 0 && (
                <div className="my-1 text-[10px] tabular-nums text-ink-faint italic whitespace-nowrap">
                  ~{travelMinToNext}m{travelModeToNext === 'walk' ? ' (W)' : travelModeToNext === 'transit' ? ' (T)' : ''}
                </div>
              )}
              <div className="flex-1 w-px bg-line-strong" />
            </div>
          )}
      </div>

      <div className={`flex-1 pb-6 ${done ? 'opacity-60' : ''}`}>
        <div
          className={`rounded-xl ${ringClass} ${containerBorderClass} ${
            liveState === 'current' ? 'bg-paper-deep p-3 -m-3' : ''
          }`}
        >
          {liveState === 'current' && (
            <p className="text-[10px] font-semibold tracking-widest uppercase text-vermillion mb-1">
              Right now
            </p>
          )}
          {liveState === 'next' && (
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gold mb-1">
              Next up
            </p>
          )}

          <div className="flex items-start gap-3 flex-wrap">
            <h3
              className={`font-display text-lg sm:text-xl leading-snug ${
                done ? 'text-ink-faint line-through' : status === 'idea' ? 'text-ink-soft italic' : 'text-ink'
              }`}
            >
              {onFocusOnMap ? (
                <button
                  onClick={onFocusOnMap}
                  className="text-left hover:text-vermillion transition-colors underline decoration-line-strong decoration-dotted underline-offset-4 hover:decoration-vermillion"
                  title="Tap to zoom the map to this stop"
                >
                  {activity.title}
                </button>
              ) : (
                activity.title
              )}
            </h3>
            <div className="flex items-center gap-1 mt-1">
              <CategoryBadge category={activity.category} />
              {status !== 'tentative' && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium tracking-wider uppercase ${STATUS_BADGE_CLASS[status]}`}
                  title={activity.lockReason}
                >
                  {status === 'confirmed' && '🔒 '}
                  {STATUS_LABEL[status]}
                </span>
              )}
              {activity.soloOnly && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium tracking-wider uppercase bg-ink/10 text-ink-soft">
                  Solo
                </span>
              )}
              {done && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium tracking-wider uppercase bg-ink text-paper">
                  Done
                </span>
              )}
            </div>
          </div>

          {activity.photoUrl && (
            <img
              src={activity.photoUrl}
              alt=""
              loading="lazy"
              className="mt-2 w-full max-h-48 object-cover rounded-lg border border-line"
            />
          )}

          {activity.lockReason && status === 'confirmed' && (
            <p className="mt-1 text-[11px] text-vermillion italic">🔒 {activity.lockReason}</p>
          )}
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
            <button
              onClick={toggleDone}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold tracking-wider uppercase transition-colors ${
                done
                  ? 'bg-ink text-paper hover:bg-ink-soft'
                  : 'bg-paper-deep text-ink hover:bg-gold-soft hover:text-paper'
              }`}
            >
              {done ? '✓ Done' : 'Mark done'}
            </button>
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
          <ActivityNotes slug={slug} activityId={activity.id} />
        </div>
      </div>
    </div>
  );
}

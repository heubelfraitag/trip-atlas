import { formatDateMid } from '../lib/format';
import type { TrainLeg, TrainSection, Trip } from '../types/trip';

function StatusPill({ status }: { status: TrainLeg['status'] }) {
  if (status === 'booked')
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 whitespace-nowrap">
        Booked
      </span>
    );
  if (status === 'not-booked')
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 whitespace-nowrap">
        Not booked
      </span>
    );
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-line text-ink-soft whitespace-nowrap">
      Buy on the day
    </span>
  );
}

function Glossary({ rows }: { rows: { ja: string; en: string }[] }) {
  return (
    <dl className="mt-2 rounded-xl bg-paper border border-line divide-y divide-line overflow-hidden">
      {rows.map((r) => (
        <div key={r.ja} className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-3 px-3 py-2 items-baseline">
          <dt className="text-base text-ink" lang="ja">
            {r.ja}
          </dt>
          <dd className="text-sm text-ink-soft">{r.en}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ section, glossary }: { section: TrainSection; glossary?: TrainLeg['glossary'] }) {
  const List = section.ordered ? 'ol' : 'ul';
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-vermillion font-semibold">{section.heading}</p>
      {section.items.length > 0 && (
        <List className={`mt-2 space-y-1.5 ${section.ordered ? 'list-decimal pl-5' : ''}`}>
          {section.items.map((it, i) => (
            <li key={i} className={`text-sm text-ink ${section.ordered ? 'pl-1' : 'flex gap-2'}`}>
              {!section.ordered && <span className="text-vermillion shrink-0">•</span>}
              <span>{it}</span>
            </li>
          ))}
        </List>
      )}
      {section.showGlossary && glossary && glossary.length > 0 && <Glossary rows={glossary} />}
    </div>
  );
}

function TrainCard({ leg, index }: { leg: TrainLeg; index: number }) {
  const facts = [
    leg.departs,
    leg.durationMin ? `${leg.durationMin >= 60 ? `${Math.floor(leg.durationMin / 60)}h${leg.durationMin % 60 ? ` ${leg.durationMin % 60}m` : ''}` : `${leg.durationMin} min`}` : null,
    leg.price,
  ].filter(Boolean);
  return (
    <article id={leg.id} className="border border-line rounded-2xl bg-paper-soft p-5 sm:p-6 scroll-mt-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-ink-faint">
            Leg {index + 1} · {formatDateMid(leg.date)}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1 leading-tight">{leg.title}</h2>
          <p className="text-sm text-ink-soft mt-1">{leg.service}</p>
          {facts.length > 0 && <p className="text-sm text-ink mt-1.5">{facts.join(' · ')}</p>}
        </div>
        <StatusPill status={leg.status} />
      </header>

      {leg.statusNote && (
        <p
          className={`mt-4 text-sm rounded-xl px-3 py-2 ${
            leg.status === 'not-booked'
              ? 'bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
              : 'bg-paper border border-line text-ink-soft'
          }`}
        >
          {leg.statusNote}
        </p>
      )}

      {leg.sections && leg.sections.length > 0 && (
        <div className="mt-5 space-y-5">
          {leg.sections.map((s) => (
            <Section key={s.heading} section={s} glossary={leg.glossary} />
          ))}
        </div>
      )}
    </article>
  );
}

export default function TrainsTab({ trip }: { trip: Trip }) {
  const legs = [...(trip.trains ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  if (legs.length === 0) return <p className="text-sm text-ink-faint">No trains on file.</p>;
  const notBooked = legs.filter((l) => l.status === 'not-booked').length;
  return (
    <div>
      <p className="text-ink-soft mb-4 text-sm">
        {legs.length} legs · in order
        {notBooked > 0 && <> · <span className="text-amber-700 dark:text-amber-300">{notBooked} not booked yet</span></>}
      </p>
      <ol className="mb-6 border border-line rounded-2xl divide-y divide-line overflow-hidden">
        {legs.map((l, i) => (
          <li key={l.id}>
            <a
              href={`#${l.id}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5 no-underline hover:bg-paper-soft"
            >
              <span className="min-w-0">
                <span className="text-ink-faint text-xs mr-2">{i + 1}</span>
                <span className="text-ink text-sm">{l.title}</span>
              </span>
              <span className="text-xs text-ink-faint shrink-0">{formatDateMid(l.date)}</span>
            </a>
          </li>
        ))}
      </ol>
      <div className="space-y-6">
        {legs.map((l, i) => (
          <TrainCard key={l.id} leg={l} index={i} />
        ))}
      </div>
    </div>
  );
}
